# HireHub AI Microservice

> **Language:** Python 3.13  
> **Framework:** FastAPI + Uvicorn  
> **Port:** 5001  
> **Role:** Hybrid NLP & LLM Resume ATS Analyzer, Profile Synthesizer, and Interview Evaluator

---

## Setup (One-time)

```powershell
cd e:\PROJECTs\1_Final\HireHub\ai-service

# Install Python dependencies
pip install -r requirements.txt
```

## Configure API Keys

Edit `.env`:
```
GEMINI_API_KEY=your_key_from_aistudio.google.com
GROQ_API_KEY=your_key_from_console.groq.com
```

## Run

```powershell
python main.py
```

You'll see:
```
🤖 HireHub AI Microservice starting on port 5001
Gemini key: ✅ configured
Groq key  : ✅ configured
INFO:     Uvicorn running on http://0.0.0.0:5001
```

## Run Tests

To run the Pytest suite (includes health check and mocked LLM / analyze endpoint verification):
```powershell
pytest
```

---

## ATS Scorer Engine (Hybrid Architecture)

Instead of relying purely on an LLM's subjective (and sometimes hallucinatory) score predictions, the ATS scanner implements a robust **Hybrid Pipeline** combining deterministic NLP calculations with LLM qualitative insights:

```
                  [ Resume PDF ]       [ Job Description ]
                         \                   /
                          \                 /
                           ▼               ▼
                   [ Programmatic NLP Scoring Engine ]
                       (services/ats_scoring.py)
                   ┌─────────────────────────────────┐
                   │ • Keyword Overlap via TF-IDF    │
                   │ • Cosine Semantic Similarity    │
                   │ • Heading Section Verification   │
                   │ • Layout & Formatting Rules     │
                   └─────────────────────────────────┘
                                    │
                                    │ (Calculated Metrics & Scores)
                                    ▼
                     [ LLM Qualitative Evaluator ]
                         (Gemini / Groq Fallback)
                   ┌─────────────────────────────────┐
                   │ • 2-3 Sentence Match Verdict    │
                   │ • Specific Action Verb Analysis │
                   │ • Formatting Improvement Suggestions│
                   └─────────────────────────────────┘
                                    │
                                    ▼
                         [ Combined ATS Report ]
```

### Deterministic Calculations:
1.  **Keyword/Skills Overlap (50% overall weight):** Uses a curated Tech Skills lookup merged with dynamic top TF-IDF keywords extracted from the job description.
2.  **Semantic Similarity (30% overall weight):** Computes a cosine similarity score of the resume and job description using Gemini `text-embedding-004` embeddings (falls back to a local scikit-learn TF-IDF similarity model offline/during testing).
3.  **Section & Formatting Checks (20% overall weight):** Check layout details:
    *   **Section Completeness:** Detects standard headings ("Experience", "Education", "Skills", "Summary").
    *   **Formatting Safety:** Validates email, telephone, list indicators (bullet points), and capitals overuse.
    *   **Quantified Achievements:** Detects percentages/numbers indicating project impact.
    *   **Action Verbs:** Identifies strong action verbs and warns on weak phrases.

The programmatic scores are passed *into* the LLM prompt as context. This ensures that the generated review, action verb critiques, and improvements are fully aligned with the actual mathematical scores, rather than guessing them.
