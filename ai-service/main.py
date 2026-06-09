"""
HireHub — AI Microservice
Language : Python 3.13
Framework: FastAPI + Uvicorn
Port     : 5001

Responsibilities:
  - ATS resume checking against job description
  - Synthesize GitHub developer profile details
  - Generate sequential mock interview questions
  - Evaluate interview session transcripts
  - Optimize/Enhance resume summary & bullet points
"""

import os
import json
import re
import logging
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ── Load environment variables ─────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
PORT           = int(os.getenv("AI_SERVICE_PORT", "5001"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("ai-service")

# ── App setup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("🤖 HireHub AI Microservice starting on port %d", PORT)
    log.info("Gemini key: %s", "✅ configured" if GEMINI_API_KEY else "❌ not set")
    log.info("Groq key  : %s", "✅ configured" if GROQ_API_KEY   else "❌ not set")
    yield
    log.info("AI Microservice shutting down.")

app = FastAPI(
    title="HireHub AI Microservice",
    description="AI engines powering Resume ATS checks, developer profile syncs, mock interviews, and resume enhancers",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ──────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    resume_text:      str = Field(..., min_length=50,  description="Extracted text from the candidate's resume PDF")
    job_description:  str = Field(..., min_length=50,  description="Full job description text")

class AnalyzeResponse(BaseModel):
    success:      bool
    provider:     str   # 'gemini' | 'groq'
    data:         dict

class GithubRepo(BaseModel):
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int = 0
    repoUrl: Optional[str] = None

class ProfileSyncRequest(BaseModel):
    github_username: str
    repos: List[GithubRepo]

class ProfileSyncResponse(BaseModel):
    success: bool
    provider: str
    data: dict # { bio: str, skills: list }

class InterviewQuestion(BaseModel):
    questionText: str
    candidateAnswer: Optional[str] = ""

class QuestionRequest(BaseModel):
    job_title: str
    job_description: str
    previous_questions: List[InterviewQuestion] = []
    question_index: int

class QuestionResponse(BaseModel):
    success: bool
    provider: str
    data: str # the question text itself

class EvaluateRequest(BaseModel):
    job_title: str
    job_description: str
    questions: List[InterviewQuestion]

class EvaluateResponse(BaseModel):
    success: bool
    provider: str
    data: dict # structured evaluation feedback

class EnhanceRequest(BaseModel):
    resume_text: str = Field(..., min_length=50)
    job_description: str = Field(..., min_length=50)

class EnhanceResponse(BaseModel):
    success: bool
    provider: str
    data: dict

# ── Helpers ────────────────────────────────────────────────────────────────────

def parse_ai_response(raw: str) -> dict:
    """Strip markdown fences, extract JSON content between first { and last }, and parse JSON."""
    text = raw.strip()
    
    # 1. Try direct parsing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Try removing markdown fences
    clean = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    clean = re.sub(r"^```\s*",    "", clean,        flags=re.IGNORECASE)
    clean = re.sub(r"```$",       "", clean.strip(), flags=re.IGNORECASE)
    
    try:
        return json.loads(clean.strip())
    except json.JSONDecodeError:
        pass

    # 3. Fallback: extract the outermost JSON object braces
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_candidate = text[first_brace:last_brace + 1]
        try:
            return json.loads(json_candidate)
        except json.JSONDecodeError as err:
            log.error("Failed to parse JSON even after brace extraction. Raw candidate: %s", json_candidate)
            raise err
    else:
        log.error("No valid JSON object braces found in response: %s", raw)
        raise ValueError("No valid JSON object found in AI response")


# ── Prompt builders ────────────────────────────────────────────────────────────

def build_ats_prompt(resume_text: str, job_description: str) -> str:
    return f"""
You are an expert ATS (Applicant Tracking System) resume scanner and professional recruiter.

You have been given TWO separate inputs:
1. RESUME TEXT — extracted from the candidate's uploaded PDF resume
2. JOB DESCRIPTION — the job the candidate is applying for

Analyze the RESUME TEXT against the JOB DESCRIPTION and return a detailed ATS report.

[RESUME TEXT — from uploaded PDF]
{resume_text}

[JOB DESCRIPTION — target role]
{job_description}

Return ONLY raw JSON — no markdown, no code fences, no explanation. Use exactly this structure:

{{
  "ats_score": <number 0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<2-3 sentence overall verdict>",
  "keyword_analysis": {{
    "score": <0-40>,
    "matched_keywords": ["keyword1", "keyword2"],
    "missing_keywords": ["keyword3", "keyword4"],
    "notes": "<short observation>"
  }},
  "section_completeness": {{
    "score": <0-20>,
    "sections_found": ["Experience", "Education"],
    "sections_missing": ["Summary", "Skills"],
    "notes": "<observation>"
  }},
  "formatting_safety": {{
    "score": <0-15>,
    "issues_detected": [],
    "notes": "<observation>"
  }},
  "quantified_achievements": {{
    "score": <0-15>,
    "examples_found": ["Increased X by Y%"],
    "suggestions": ["Quantify your impact"],
    "notes": "<observation>"
  }},
  "action_verbs": {{
    "score": <0-10>,
    "strong_verbs_found": ["Led", "Built"],
    "weak_phrases": ["Responsible for"],
    "notes": "<observation>"
  }},
  "top_improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}}

Scoring rules:
- ats_score = sum of all 5 category scores
- grade: 85-100=A, 70-84=B, 55-69=C, 40-54=D, below 40=F
- Be specific and reference actual resume/JD content
""".strip()


def build_profile_prompt(github_username: str, repos: List[GithubRepo]) -> str:
    repo_summary = ""
    for r in repos:
        repo_summary += f"Repo: {r.name}\nDescription: {r.description or 'No description'}\nLanguage: {r.language or 'Unknown'}\nStars: {r.stars}\n\n"
    
    return f"""
You are an expert technical recruiter and developer profiler.
Analyze the following candidate's GitHub repositories and synthesize a professional profile.

GitHub Username: {github_username}

[GitHub Repositories]
{repo_summary.strip()}

Provide a comprehensive, high-quality profile summary in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like ```json):
{{
  "bio": "A 3-4 sentence professional summary of their coding expertise, domain focus, and key strengths based on their repositories.",
  "skills": ["Skill 1", "Skill 2", "Skill 3"] // Extracted key technical skills, tools, frameworks, and programming languages (max 12).
}}
""".strip()


def build_question_prompt(job_title: str, job_description: str, previous_questions: List[InterviewQuestion], question_index: int) -> str:
    history_text = ""
    if previous_questions:
        for idx, q in enumerate(previous_questions):
            history_text += f"Q{idx + 1}: {q.questionText}\nCandidate Answer: {q.candidateAnswer or '(Skipped)'}\n\n"
    else:
        history_text = "No questions have been asked yet."
        
    return f"""
You are an expert technical interviewer conducting a mock interview for the role: {job_title}.

[Job Description]
{job_description}

[Interview History]
{history_text.strip()}

You are currently asking Question #{question_index + 1} of 5.
Generate the next single technical or behavioral interview question tailored specifically to this job description and the candidate's previous responses (if any).
Ensure the question is direct, professional, and challenging.
Ask ONLY the question text. Do not provide any introduction, explanation, or code blocks.
""".strip()


def build_evaluation_prompt(job_title: str, job_description: str, questions: List[InterviewQuestion]) -> str:
    qa_summary = ""
    for idx, q in enumerate(questions):
        qa_summary += f"Q{idx + 1}: {q.questionText}\nCandidate Answer: {q.candidateAnswer or '(No answer provided)'}\n\n"
        
    return f"""
You are an expert technical interviewer and hiring manager.
Analyze the candidate's answers in this mock interview for the role: {job_title}.

[Job Description]
{job_description}

[Interview Questions and Candidate Answers]
{qa_summary.strip()}

Provide a detailed evaluation report of the candidate's performance in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like ```json):
{{
  "overallScore": 75, // integer percentage from 0 to 100
  "technicalScore": 70, // integer percentage from 0 to 100
  "communicationScore": 80, // integer percentage from 0 to 100
  "feedback": "Overall summary of the candidate's performance, strengths, and areas to improve.",
  "questionEvaluations": [
    {{
      "question": "Question text...",
      "answer": "Candidate's answer...",
      "score": 80, // rating from 0 to 100
      "explanation": "Specific feedback on this answer, what was good, what was missing.",
      "idealAnswer": "A sample ideal answer showing how the candidate should have answered the question."
    }}
  ]
}}
""".strip()


def build_enhance_prompt(resume_text: str, job_description: str) -> str:
    return f"""
You are an expert ATS (Applicant Tracking System) resume optimizer and professional copywriter.
Optimize the candidate's Resume Text to align with the target Job Description.

Specifically, generate enhanced versions of:
1. The Professional Summary section (integrate missing keywords, highlight domain authority).
2. The Core Experience Bullet Points (rewrite weak points to use strong action verbs and quantified impact).

[Job Description]
{job_description}

[Candidate's Resume Text]
{resume_text}

Provide the optimized sections in JSON format.
You MUST respond ONLY with a raw JSON object matching this structure EXACTLY (do not wrap in markdown blocks like ```json):
{{
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
}}
""".strip()


# ── AI API Core Integrations ─────────────────────────────────────────────────────

async def generate_content_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return response.text


async def generate_content_groq(prompt: str, max_tokens: int = 1500, response_format: Optional[dict] = None) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    
    params = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }
    if response_format:
        params["response_format"] = response_format

    completion = client.chat.completions.create(**params)
    return completion.choices[0].message.content or ""


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "HireHub AI Microservice",
        "status":  "running",
        "port":    PORT,
        "providers": {
            "gemini": bool(GEMINI_API_KEY),
            "groq":   bool(GROQ_API_KEY),
        },
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"ok": True, "service": "ai-microservice", "port": PORT}


@app.post("/analyze", response_model=AnalyzeResponse, tags=["ATS"])
async def analyze_resume(payload: AnalyzeRequest):
    """ATS Resume Scorer"""
    # Plan A — Gemini
    try:
        log.info("[AI] ATS Check: Trying Plan A (Gemini)...")
        raw_res = await generate_content_gemini(build_ats_prompt(payload.resume_text, payload.job_description))
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan A succeeded ✅")
        return AnalyzeResponse(success=True, provider="gemini", data=parsed)
    except Exception as e:
        log.warning("[AI] Plan A failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] ATS Check: Trying Plan B (Groq)...")
        raw_res = await generate_content_groq(
            build_ats_prompt(payload.resume_text, payload.job_description),
            response_format={"type": "json_object"}
        )
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan B succeeded ✅")
        return AnalyzeResponse(success=True, provider="groq", data=parsed)
    except Exception as e:
        log.error("[AI] Plan B failed: %s", str(e))

    raise HTTPException(status_code=503, detail="AI providers exhausted.")


@app.post("/profile/github-sync", response_model=ProfileSyncResponse, tags=["Profile"])
async def sync_profile(payload: ProfileSyncRequest):
    """GitHub Developer Profile Synthesizer"""
    prompt = build_profile_prompt(payload.github_username, payload.repos)
    
    # Plan A — Gemini
    try:
        log.info("[AI] Profile Sync: Trying Plan A (Gemini)...")
        raw_res = await generate_content_gemini(prompt)
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan A succeeded ✅")
        return ProfileSyncResponse(success=True, provider="gemini", data=parsed)
    except Exception as e:
        log.warning("[AI] Plan A failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] Profile Sync: Trying Plan B (Groq)...")
        raw_res = await generate_content_groq(prompt, response_format={"type": "json_object"})
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan B succeeded ✅")
        return ProfileSyncResponse(success=True, provider="groq", data=parsed)
    except Exception as e:
        log.error("[AI] Plan B failed: %s", str(e))

    raise HTTPException(status_code=503, detail="AI providers exhausted.")


@app.post("/interview/generate-question", response_model=QuestionResponse, tags=["Interview"])
async def generate_question(payload: QuestionRequest):
    """sequential Mock Interview Question Generator"""
    prompt = build_question_prompt(
        payload.job_title,
        payload.job_description,
        payload.previous_questions,
        payload.question_index
    )

    # Plan A — Gemini
    try:
        log.info("[AI] Question Gen: Trying Plan A (Gemini)...")
        raw_res = await generate_content_gemini(prompt)
        question = raw_res.strip()
        log.info("[AI] Plan A succeeded ✅")
        return QuestionResponse(success=True, provider="gemini", data=question)
    except Exception as e:
        log.warning("[AI] Plan A failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] Question Gen: Trying Plan B (Groq)...")
        raw_res = await generate_content_groq(prompt, max_tokens=500)
        question = raw_res.strip()
        log.info("[AI] Plan B succeeded ✅")
        return QuestionResponse(success=True, provider="groq", data=question)
    except Exception as e:
        log.error("[AI] Plan B failed: %s", str(e))

    raise HTTPException(status_code=503, detail="AI providers exhausted.")


@app.post("/interview/evaluate", response_model=EvaluateResponse, tags=["Interview"])
async def evaluate_interview(payload: EvaluateRequest):
    """Interview Session Scorer and Feedback Evaluator"""
    prompt = build_evaluation_prompt(payload.job_title, payload.job_description, payload.questions)

    # Plan A — Gemini
    try:
        log.info("[AI] Interview Eval: Trying Plan A (Gemini)...")
        raw_res = await generate_content_gemini(prompt)
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan A succeeded ✅")
        return EvaluateResponse(success=True, provider="gemini", data=parsed)
    except Exception as e:
        log.warning("[AI] Plan A failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] Interview Eval: Trying Plan B (Groq)...")
        raw_res = await generate_content_groq(prompt, max_tokens=2000, response_format={"type": "json_object"})
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan B succeeded ✅")
        return EvaluateResponse(success=True, provider="groq", data=parsed)
    except Exception as e:
        log.error("[AI] Plan B failed: %s", str(e))

    raise HTTPException(status_code=503, detail="AI providers exhausted.")


@app.post("/profile/enhance", response_model=EnhanceResponse, tags=["Profile"])
async def enhance_resume(payload: EnhanceRequest):
    """Resume Enhancer and ATS Optimizer"""
    prompt = build_enhance_prompt(payload.resume_text, payload.job_description)

    # Plan A — Gemini
    try:
        log.info("[AI] Resume Enhance: Trying Plan A (Gemini)...")
        raw_res = await generate_content_gemini(prompt)
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan A succeeded ✅")
        return EnhanceResponse(success=True, provider="gemini", data=parsed)
    except Exception as e:
        log.warning("[AI] Resume Enhance: Plan A failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] Resume Enhance: Trying Plan B (Groq)...")
        raw_res = await generate_content_groq(prompt, max_tokens=2000, response_format={"type": "json_object"})
        parsed = parse_ai_response(raw_res)
        log.info("[AI] Plan B succeeded ✅")
        return EnhanceResponse(success=True, provider="groq", data=parsed)
    except Exception as e:
        log.error("[AI] Resume Enhance: Plan B failed: %s", str(e))

    raise HTTPException(status_code=503, detail="AI providers exhausted.")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True, log_level="info")
