import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const AI_MICROSERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ─── Shared prompt builder ────────────────────────────────────────────────────
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

function parseAIResponse(rawText) {
  const clean = rawText.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

// ─── Plan 0: Python AI Microservice (:5001) ───────────────────────────────────
async function analyzeWithMicroservice(resumeText, jobDescription) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${AI_MICROSERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Microservice HTTP ${response.status}`);
    }

    const json = await response.json();
    return json.data; // { ats_score, grade, ... }
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Plan A: Google Gemini 2.0 Flash (direct fallback) ───────────────────────
async function analyzeWithGemini(resumeText, jobDescription) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(buildPrompt(resumeText, jobDescription));
  return parseAIResponse(result.response.text());
}

// ─── Plan B: Groq Llama-3.3-70B (direct fallback) ────────────────────────────
async function analyzeWithGroq(resumeText, jobDescription) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildPrompt(resumeText, jobDescription) }],
    temperature: 0.3,
    max_tokens: 1500,
  });
  return parseAIResponse(completion.choices[0]?.message?.content || '');
}

// ─── Main: Microservice → Gemini → Groq ──────────────────────────────────────
export async function analyzeResumeATS(resumeText, jobDescription) {

  // Plan 0 — Python AI Microservice (preferred)
  try {
    console.log('[AI] Trying Plan 0: Python AI Microservice (:5001)...');
    const result = await analyzeWithMicroservice(resumeText, jobDescription);
    console.log('[AI] Plan 0 (Python Microservice) succeeded ✅');
    return result;
  } catch (msErr) {
    console.warn('[AI] Plan 0 (Microservice) unavailable:', msErr.message, '— falling back...');
  }

  // Plan A — Gemini direct
  try {
    console.log('[AI] Trying Plan A: Gemini 2.0 Flash (direct)...');
    const result = await analyzeWithGemini(resumeText, jobDescription);
    console.log('[AI] Plan A (Gemini direct) succeeded ✅');
    return result;
  } catch (geminiErr) {
    console.warn('[AI] Plan A (Gemini) failed:', geminiErr.message);
  }

  // Plan B — Groq direct
  try {
    console.log('[AI] Trying Plan B: Groq Llama-3.3-70B (direct)...');
    const result = await analyzeWithGroq(resumeText, jobDescription);
    console.log('[AI] Plan B (Groq direct) succeeded ✅');
    return result;
  } catch (groqErr) {
    console.error('[AI] Plan B (Groq) failed:', groqErr.message);
    throw new Error('All AI providers failed. Check service keys and connectivity.');
  }
}
