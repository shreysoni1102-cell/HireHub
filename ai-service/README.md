# HireHub AI Microservice

> **Language:** Python 3.13  
> **Framework:** FastAPI + Uvicorn  
> **Port:** 5001  
> **Role:** Handles all AI-powered ATS resume analysis (Gemini 2.0 Flash → Groq fallback)

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

## API Docs

Visit **http://localhost:5001/docs** — automatic interactive Swagger UI (FastAPI built-in)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/analyze` | Analyze resume vs job description |

## Architecture

```
React Client (:5173)
      ↓
Node.js / Express (:5000)   ← Main Server
      ↓ HTTP POST /analyze
Python / FastAPI (:5001)    ← This microservice
      ↓              ↓
  Gemini API      Groq API
  (Plan A)        (Plan B)
```

The main Node.js server calls this service. If this service is offline, Node.js **automatically falls back** to direct AI calls — so the app always works.
