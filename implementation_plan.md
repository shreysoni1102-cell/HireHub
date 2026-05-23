# Implementation Plan — MERN + AI & Analytics Upgrade for HireHub

This plan details the upgrade for **HireHub**, transforming it into a high-performance final-year Semester 7 project by introducing an **AI Resume ATS Score Matcher** (powered by Gemini AI) and a **Recruiter Analytics Dashboard** (powered by Recharts).

---

## User Review Required

> [!IMPORTANT]
> **ES Module Configuration:** 
> The backend (`server`) is configured with `"type": "module"`. All new server files must use modern standard ES import/export syntax (`import ... from '...'` with file extensions like `.js`) instead of CommonJS (`require`).
>
> **API Key Setup:**
> You will need a Google Gemini API Key. You can get a free one instantly from [Google AI Studio](https://aistudio.google.com/). You will add it as `GEMINI_API_KEY` in `server/.env`.
>
> **Installation Commands:**
> We will need to install backend dependencies (`@google/generative-ai`, `multer`, `pdf-parse`) and frontend dependencies (`recharts`).

---

## Open Questions

> [!NOTE]
> 1. **Gemini API Key:** Do you already have a Gemini API key available in your local environment, or would you like me to guide you on how to set it up?
> 2. **Chart Styling:** For the Recruiter Dashboard, do you prefer a clean minimalist style, or should we use dynamic gradients to match the Tailwind brand colors?

---

## Proposed Changes

### Backend (Server) Components

We will add AI parsing, PDF processing, and dashboard analytics endpoints.

#### [NEW] [aiService.js](file:///e:/PROJECTs/1_Final/HireHub/server/utils/aiService.js)
*   **Purpose:** Houses the Google Gemini API connection. Uses `gemini-1.5-flash` or `gemini-2.5-flash` to evaluate the parsed resume text against a job description.
*   **Key Logic:** Sends a highly optimized prompt requesting structural analysis returned in exact, robust JSON format (ATS match percentage, strengths, critical skill gaps, recommended keywords, and actionable improvements).

#### [NEW] [aiRoutes.js](file:///e:/PROJECTs/1_Final/HireHub/server/routes/aiRoutes.js)
*   **Purpose:** Exposes a secure POST endpoint `/api/ai/ats-check`.
*   **Key Logic:** Integrates `multer` (in-memory storage) for PDF uploads and `pdf-parse` to dynamically extract text, calling `aiService.js` for analysis.

#### [NEW] [analyticsController.js](file:///e:/PROJECTs/1_Final/HireHub/server/controllers/analyticsController.js)
*   **Purpose:** Handles high-performance Mongoose aggregation pipelines for recruiter metrics.
*   **Key Logic:** Groups a recruiter's job applications by status (`applied`, `shortlisted`, `rejected`), counts applicant volume per job listing, and computes hiring funnel ratios.

#### [NEW] [analyticsRoutes.js](file:///e:/PROJECTs/1_Final/HireHub/server/routes/analyticsRoutes.js)
*   **Purpose:** Exposes secure GET endpoint `/api/analytics/recruiter` restricted to recruiters.

#### [MODIFY] [server.js](file:///e:/PROJECTs/1_Final/HireHub/server/server.js)
*   **Purpose:** Register the new `/api/ai` and `/api/analytics` routers.

#### [MODIFY] [.env.example](file:///e:/PROJECTs/1_Final/HireHub/server/.env.example) and [.env](file:///e:/PROJECTs/1_Final/HireHub/server/.env)
*   **Purpose:** Add `GEMINI_API_KEY` placeholder.

---

### Frontend (Client) Components

We will build the AI Resume Matcher page and integrate the analytics charts.

#### [NEW] [ResumeAnalyzer.jsx](file:///e:/PROJECTs/1_Final/HireHub/client/src/pages/ResumeAnalyzer.jsx)
*   **Purpose:** A gorgeous dashboard for Job Seekers (`user`).
*   **UI/UX:** Let seekers select an active job posting (from a dropdown) or paste a custom Job Description. Features a drag-and-drop file uploader for their PDF resume, dynamic parsing state/progress bars, an interactive ring-chart style ATS score match indicator, and detailed expander cards for AI recommendations.

#### [MODIFY] [RecruiterDashboard.jsx](file:///e:/PROJECTs/1_Final/HireHub/client/src/pages/RecruiterDashboard.jsx)
*   **Purpose:** Add an "Analytics" tab.
*   **UI/UX:** Render visual insights:
    - Metric Cards: Total jobs, total applicants, shortlisted applicants, shortlist rate.
    - Status Breakdown Chart: A beautiful `Recharts` Pie Chart showing percentages of applied, shortlisted, and rejected candidates.
    - Application Volume Chart: A modern `Recharts` Bar Chart showing the total applicants for each job listing.

#### [MODIFY] [App.jsx](file:///e:/PROJECTs/1_Final/HireHub/client/src/App.jsx)
*   **Purpose:** Register the new route `/seeker/resume-analyzer` as a protected route for role `user`.

#### [MODIFY] [Navbar.jsx](file:///e:/PROJECTs/1_Final/HireHub/client/src/components/Navbar.jsx)
*   **Purpose:** Add an elegant "AI Resume Matcher" navigation link visible to authenticated seekers.

---

## Verification Plan

### Automated/Code Verification
*   We will verify that the project builds perfectly with no frontend Vite build errors or backend Express startup issues.
*   We will run API calls (using Node scripts or a test runner) to confirm the Gemini model integrates correctly and returns sanitized, valid JSON.

### Manual Verification
1.  **AI ATS Matcher Test:** Log in as a Seeker, upload a demo resume PDF, select a job, and verify the ATS Score, Gap Analysis, and Keyword Recommendations render correctly with a high-fidelity Tailwind UI.
2.  **Analytics Test:** Log in as a Recruiter, browse the new "Analytics" tab, and verify that the Pie and Bar charts dynamically match the live application database state.
