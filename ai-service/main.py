"""
HireHub — AI Microservice
Language : Python 3.13
Framework: FastAPI + Uvicorn
Port     : 5001

Responsibilities:
  - Receive resume text + job description
  - Analyze using Gemini 2.0 Flash (Plan A) or Groq Llama-3.3-70B (Plan B)
  - Return structured ATS score JSON

The main Node.js server calls this service via HTTP.
If this service is offline, the Node.js server falls back to direct AI calls.
"""

import os
import json
import re
import logging
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
    description="ATS Resume Scorer — powered by Gemini 2.0 Flash (Plan A) and Groq Llama-3.3-70B (Plan B)",
    version="1.0.0",
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

# ── Shared prompt builder ──────────────────────────────────────────────────────
def build_prompt(resume_text: str, job_description: str) -> str:
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


def parse_ai_response(raw: str) -> dict:
    """Strip markdown fences and parse JSON."""
    clean = re.sub(r"^```json\s*", "", raw.strip(), flags=re.IGNORECASE)
    clean = re.sub(r"^```\s*",    "", clean,        flags=re.IGNORECASE)
    clean = re.sub(r"```$",       "", clean.strip(), flags=re.IGNORECASE)
    return json.loads(clean.strip())


# ── Plan A: Gemini 2.0 Flash ───────────────────────────────────────────────────
async def analyze_with_gemini(resume_text: str, job_description: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(build_prompt(resume_text, job_description))
    return parse_ai_response(response.text)


# ── Plan B: Groq Llama-3.3-70B ────────────────────────────────────────────────
async def analyze_with_groq(resume_text: str, job_description: str) -> dict:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")

    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": build_prompt(resume_text, job_description)}],
        temperature=0.3,
        max_tokens=1500,
    )
    raw = completion.choices[0].message.content or ""
    return parse_ai_response(raw)


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
    """
    Analyze a resume against a job description using AI.

    - **Plan A**: Google Gemini 2.0 Flash
    - **Plan B**: Groq Llama-3.3-70B (automatic fallback)
    """
    # Plan A — Gemini
    try:
        log.info("[AI] Trying Plan A: Gemini 2.0 Flash...")
        result = await analyze_with_gemini(payload.resume_text, payload.job_description)
        log.info("[AI] Plan A (Gemini) succeeded ✅")
        return AnalyzeResponse(success=True, provider="gemini", data=result)
    except Exception as e:
        log.warning("[AI] Plan A (Gemini) failed: %s", str(e))

    # Plan B — Groq
    try:
        log.info("[AI] Trying Plan B: Groq Llama-3.3-70B...")
        result = await analyze_with_groq(payload.resume_text, payload.job_description)
        log.info("[AI] Plan B (Groq) succeeded ✅")
        return AnalyzeResponse(success=True, provider="groq", data=result)
    except Exception as e:
        log.error("[AI] Plan B (Groq) failed: %s", str(e))

    raise HTTPException(
        status_code=503,
        detail="Both AI providers failed. Check GEMINI_API_KEY and GROQ_API_KEY in ai-service/.env",
    )


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True, log_level="info")
