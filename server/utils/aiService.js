import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const AI_MICROSERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function buildPrompt(resumeText, jobDescription) {
  return `
You are an expert ATS (Applicant Tracking System) resume scanner and professional recruiter.

You have been given TWO separate inputs:
1. RESUME TEXT — extracted from the candidate's uploaded PDF resume
2. JOB DESCRIPTION — the job the candidate is applying for

Analyze the RESUME TEXT against the JOB DESCRIPTION and return a detailed ATS report.

[RESUME TEXT — from uploaded PDF]
${resumeText}

[JOB DESCRIPTION — target role]
${jobDescription}

Return ONLY raw JSON — no markdown, no code fences, no explanation. Use exactly this structure:

{
  "ats_score": <number 0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<2-3 sentence overall verdict>",
  "keyword_analysis": {
    "score": <0-40>,
    "matched_keywords": ["keyword1", "keyword2"],
    "missing_keywords": ["keyword3", "keyword4"],
    "notes": "<short observation>"
  },
  "section_completeness": {
    "score": <0-20>,
    "sections_found": ["Experience", "Education"],
    "sections_missing": ["Summary", "Skills"],
    "notes": "<observation>"
  },
  "formatting_safety": {
    "score": <0-15>,
    "issues_detected": [],
    "notes": "<observation>"
  },
  "quantified_achievements": {
    "score": <0-15>,
    "examples_found": ["Increased X by Y%"],
    "suggestions": ["Quantify your impact"],
    "notes": "<observation>"
  },
  "action_verbs": {
    "score": <0-10>,
    "strong_verbs_found": ["Led", "Built"],
    "weak_phrases": ["Responsible for"],
    "notes": "<observation>"
  },
  "top_improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}

Scoring rules:
- ats_score = sum of all 5 category scores
- grade: 85-100=A, 70-84=B, 55-69=C, 40-54=D, below 40=F
- Be specific and reference actual resume/JD content
`.trim();
}

function buildProfilePrompt(githubUsername, repos) {
  const repoSummary = repos.map(r => `Repo: ${r.name}\nDescription: ${r.description || 'No description'}\nLanguage: ${r.language || 'Unknown'}\nStars: ${r.stars || 0}`).join('\n\n');
  return `
You are an expert technical recruiter and developer profiler.
Analyze the following candidate's GitHub repositories and synthesize a professional profile.

GitHub Username: ${githubUsername}

[GitHub Repositories]
${repoSummary}

Provide a comprehensive, high-quality profile summary in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like \`\`\`json):
{
  "bio": "A 3-4 sentence professional summary of their coding expertise, domain focus, and key strengths based on their repositories.",
  "skills": ["Skill 1", "Skill 2", "Skill 3"] // Extracted key technical skills, tools, frameworks, and programming languages (max 12).
}
`.trim();
}

function buildQuestionPrompt(jobTitle, jobDescription, previousQuestions, questionIndex) {
  const historyText = previousQuestions && previousQuestions.length > 0 
    ? previousQuestions.map((q, idx) => `Q${idx + 1}: ${q.questionText}\nCandidate Answer: ${q.candidateAnswer || '(Skipped)'}`).join('\n\n')
    : 'No questions have been asked yet.';

  return `
You are an expert technical interviewer conducting a mock interview for the role: ${jobTitle}.

[Job Description]
${jobDescription}

[Interview History]
${historyText}

You are currently asking Question #${questionIndex + 1} of 5.
Generate the next single technical or behavioral interview question tailored specifically to this job description and the candidate's previous responses (if any).
Ensure the question is direct, professional, and challenging.
Ask ONLY the question text. Do not provide any introduction, explanation, or code blocks.
`.trim();
}

function buildEvaluationPrompt(jobTitle, jobDescription, questions) {
  const QandA = questions.map((q, idx) => `Q${idx + 1}: ${q.questionText}\nCandidate Answer: ${q.candidateAnswer || '(No answer provided)'}`).join('\n\n');

  return `
You are an expert technical interviewer and hiring manager.
Analyze the candidate's answers in this mock interview for the role: ${jobTitle}.

[Job Description]
${jobDescription}

[Interview Questions and Candidate Answers]
${QandA}

Provide a detailed evaluation report of the candidate's performance in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like \`\`\`json):
{
  "overallScore": 75, // integer percentage from 0 to 100
  "technicalScore": 70, // integer percentage from 0 to 100
  "communicationScore": 80, // integer percentage from 0 to 100
  "feedback": "Overall summary of the candidate's performance, strengths, and areas to improve.",
  "questionEvaluations": [
    {
      "question": "Question text...",
      "answer": "Candidate's answer...",
      "score": 80, // rating from 0 to 100
      "explanation": "Specific feedback on this answer, what was good, what was missing.",
      "idealAnswer": "A sample ideal answer showing how the candidate should have answered the question."
    }
  ]
}
`.trim();
}

function buildEnhancePrompt(resumeText, jobDescription) {
  return `
You are an expert ATS (Applicant Tracking System) resume optimizer and professional copywriter.
Optimize the candidate's Resume Text to align with the target Job Description.

Specifically, generate enhanced versions of:
1. The Professional Summary section (integrate missing keywords, highlight domain authority).
2. The Core Experience Bullet Points (rewrite weak points to use strong action verbs and quantified impact).

[Job Description]
${jobDescription}

[Candidate's Resume Text]
${resumeText}

Provide the optimized sections in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like \`\`\`json):
{
  "originalSummary": "The candidate's original professional summary (or if missing, the top intro text of the resume)...",
  "enhancedSummary": "The newly optimized, keyword-rich professional summary...",
  "originalBullets": [
    "Original experience bullet 1...",
    "Original experience bullet 2..."
  ],
  "enhancedBullets": [
    "Optimized experience bullet 1 using strong verbs...",
    "Optimized experience bullet 2 using strong verbs..."
  ]
}
`.trim();
}

// ─── Utility Parsers ──────────────────────────────────────────────────────────

function parseAIResponse(rawText) {
  const clean = rawText.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

// ─── Generic Microservice Fetcher ──────────────────────────────────────────────

async function callMicroservice(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${AI_MICROSERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Microservice HTTP ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Plan 0: Python AI Microservice Direct Fallbacks ─────────────────────────────

async function analyzeWithMicroservice(resumeText, jobDescription) {
  return callMicroservice('/analyze', { resume_text: resumeText, job_description: jobDescription });
}

async function generateProfileWithMicroservice(githubUsername, repos) {
  return callMicroservice('/profile/github-sync', { github_username: githubUsername, repos });
}

async function generateQuestionWithMicroservice(jobTitle, jobDescription, previousQuestions, questionIndex) {
  const payload = {
    job_title: jobTitle,
    job_description: jobDescription,
    previous_questions: previousQuestions.map(q => ({
      questionText: q.questionText,
      candidateAnswer: q.candidateAnswer || ''
    })),
    question_index: questionIndex
  };
  return callMicroservice('/interview/generate-question', payload);
}

async function evaluateSessionWithMicroservice(jobTitle, jobDescription, questions) {
  const payload = {
    job_title: jobTitle,
    job_description: jobDescription,
    questions: questions.map(q => ({
      questionText: q.questionText,
      candidateAnswer: q.candidateAnswer || ''
    }))
  };
  return callMicroservice('/interview/evaluate', payload);
}

async function enhanceResumeWithMicroservice(resumeText, jobDescription) {
  return callMicroservice('/profile/enhance', { resume_text: resumeText, job_description: jobDescription });
}

// ─── Plan A: Google Gemini Direct Fallbacks ──────────────────────────────────────

async function analyzeWithGemini(resumeText, jobDescription) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildPrompt(resumeText, jobDescription));
  return parseAIResponse(result.response.text());
}

async function generateProfileWithGemini(githubUsername, repos) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildProfilePrompt(githubUsername, repos));
  return parseAIResponse(result.response.text());
}

async function generateQuestionWithGemini(jobTitle, jobDescription, previousQuestions, questionIndex) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildQuestionPrompt(jobTitle, jobDescription, previousQuestions, questionIndex));
  return result.response.text().trim();
}

async function evaluateSessionWithGemini(jobTitle, jobDescription, questions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildEvaluationPrompt(jobTitle, jobDescription, questions));
  return parseAIResponse(result.response.text());
}

async function enhanceResumeWithGemini(resumeText, jobDescription) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildEnhancePrompt(resumeText, jobDescription));
  return parseAIResponse(result.response.text());
}

// ─── Plan B: Groq Direct Fallbacks ───────────────────────────────────────────────

async function analyzeWithGroq(resumeText, jobDescription) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildPrompt(resumeText, jobDescription) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1500,
  });
  return parseAIResponse(completion.choices[0]?.message?.content || '');
}

async function generateProfileWithGroq(githubUsername, repos) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildProfilePrompt(githubUsername, repos) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1500,
  });
  return parseAIResponse(completion.choices[0]?.message?.content || '');
}

async function generateQuestionWithGroq(jobTitle, jobDescription, previousQuestions, questionIndex) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildQuestionPrompt(jobTitle, jobDescription, previousQuestions, questionIndex) }],
    temperature: 0.3,
    max_tokens: 500,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

async function evaluateSessionWithGroq(jobTitle, jobDescription, questions) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildEvaluationPrompt(jobTitle, jobDescription, questions) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });
  return parseAIResponse(completion.choices[0]?.message?.content || '');
}

async function enhanceResumeWithGroq(resumeText, jobDescription) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildEnhancePrompt(resumeText, jobDescription) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });
  return parseAIResponse(completion.choices[0]?.message?.content || '');
}

// ─── Main Exported Integrations ──────────────────────────────────────────────────

/**
 * Helper to execute steps in sequence, logging progress and catching/diagnosing internet connection issues
 */
async function executeAIChain(steps, defaultErrorMessage) {
  const errors = [];

  for (const step of steps) {
    try {
      console.log(`[AI] Trying ${step.name}...`);
      return await step.fn();
    } catch (err) {
      console.warn(`[AI] ${step.name} failed:`, err.message);
      errors.push(`${step.name}: ${err.message}`);
    }
  }

  // Check if errors are due to network/internet connection issues
  const networkKeywords = [
    'fetch failed',
    'enotfound',
    'eai_again',
    'connection error',
    'econnrefused',
    'etimedout',
    'econnreset',
    'network error',
    'network'
  ];

  // We check external cloud providers (Plan A Gemini, Plan B Groq)
  const cloudSteps = errors.filter(e => e.includes('Gemini') || e.includes('Groq'));
  if (cloudSteps.length > 0) {
    const allCloudFailedWithNetwork = cloudSteps.every(e =>
      networkKeywords.some(kw => e.toLowerCase().includes(kw))
    );
    if (allCloudFailedWithNetwork) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
  }

  throw new Error(`${defaultErrorMessage} Details: [ ${errors.join(' ] | [ ')} ]`);
}

/**
 * AI ATS Resume Analyzer
 */
export async function analyzeResumeATS(resumeText, jobDescription) {
  return executeAIChain([
    {
      name: 'Plan 0 (Python Service)',
      fn: () => analyzeWithMicroservice(resumeText, jobDescription)
    },
    {
      name: 'Plan A (Gemini)',
      fn: () => analyzeWithGemini(resumeText, jobDescription)
    },
    {
      name: 'Plan B (Groq)',
      fn: () => analyzeWithGroq(resumeText, jobDescription)
    }
  ], 'All AI providers failed.');
}

/**
 * AI GitHub Developer Profile Summarizer
 */
export async function generateDeveloperProfile(githubUsername, repos) {
  return executeAIChain([
    {
      name: 'Plan 0 (Python Service)',
      fn: () => generateProfileWithMicroservice(githubUsername, repos)
    },
    {
      name: 'Plan A (Gemini)',
      fn: () => generateProfileWithGemini(githubUsername, repos)
    },
    {
      name: 'Plan B (Groq)',
      fn: () => generateProfileWithGroq(githubUsername, repos)
    }
  ], 'All AI providers failed to generate profile.');
}

/**
 * AI Sequential Mock Interview Question Generator
 */
export async function generateInterviewQuestion(jobTitle, jobDescription, previousQuestions, questionIndex) {
  return executeAIChain([
    {
      name: 'Plan 0 (Python Service)',
      fn: async () => {
        const res = await generateQuestionWithMicroservice(jobTitle, jobDescription, previousQuestions, questionIndex);
        return typeof res === 'string' ? res : (res.question || JSON.stringify(res));
      }
    },
    {
      name: 'Plan A (Gemini)',
      fn: () => generateQuestionWithGemini(jobTitle, jobDescription, previousQuestions, questionIndex)
    },
    {
      name: 'Plan B (Groq)',
      fn: () => generateQuestionWithGroq(jobTitle, jobDescription, previousQuestions, questionIndex)
    }
  ], 'All AI providers failed to generate question.');
}

/**
 * AI Mock Interview Session Scorer and Feedback Generator
 */
export async function evaluateInterviewSession(jobTitle, jobDescription, questions) {
  return executeAIChain([
    {
      name: 'Plan 0 (Python Service)',
      fn: () => evaluateSessionWithMicroservice(jobTitle, jobDescription, questions)
    },
    {
      name: 'Plan A (Gemini)',
      fn: () => evaluateSessionWithGemini(jobTitle, jobDescription, questions)
    },
    {
      name: 'Plan B (Groq)',
      fn: () => evaluateSessionWithGroq(jobTitle, jobDescription, questions)
    }
  ], 'All AI providers failed to evaluate interview session.');
}

/**
 * AI Resume Enhancer / Tailor
 */
export async function enhanceResumeText(resumeText, jobDescription) {
  return executeAIChain([
    {
      name: 'Plan 0 (Python Service)',
      fn: () => enhanceResumeWithMicroservice(resumeText, jobDescription)
    },
    {
      name: 'Plan A (Gemini)',
      fn: () => enhanceResumeWithGemini(resumeText, jobDescription)
    },
    {
      name: 'Plan B (Groq)',
      fn: () => enhanceResumeWithGroq(resumeText, jobDescription)
    }
  ], 'All AI providers failed to enhance resume.');
}
