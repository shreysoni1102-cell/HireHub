import re
import os
import logging
from typing import Set, Tuple, List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

log = logging.getLogger("ai-service")

# Curated list of typical tech, programming, design, and soft skills keywords
TECH_SKILLS = {
    # Programming Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "ruby", "go", "golang", "rust", "php", "swift", "kotlin", "scala", "r", "sql", "html", "css", "sass", "bash", "shell",
    # Frontend Frameworks & Libraries
    "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt.js", "svelte", "jquery", "tailwind", "bootstrap", "redux", "recharts", "material-ui", "mui", "three.js",
    # Backend Frameworks
    "node.js", "nodejs", "express", "express.js", "django", "flask", "fastapi", "spring", "spring boot", "laravel", "rails", "asp.net", "nest.js", "nestjs",
    # Databases & ORMs
    "mongodb", "postgresql", "mysql", "sqlite", "redis", "oracle", "mariadb", "cassandra", "dynamodb", "firebase", "firestore", "prisma", "sequelize", "mongoose",
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "jenkins", "github actions", "gitlab ci", "terraform", "ansible", "nginx", "apache",
    # Methodologies, API Protocols & General Concepts
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "graphql", "rest api", "restful", "microservices", "ci/cd", "agile", "scrum", "kanban", "testing", "jest", "cypress", "selenium", "pytest", "mocha", "chai", "webpack", "vite", "babel", "npm", "yarn", "pnpm", "analytics", "seo", "machine learning", "deep learning", "nlp", "ai", "artificial intelligence", "data science", "oop", "object-oriented programming", "functional programming", "data structures", "algorithms"
}

def extract_skills_from_text(text: str) -> Set[str]:
    """Helper to extract matching skills from a pre-defined curated tech-skills directory."""
    text_lower = text.lower()
    found = set()
    for skill in TECH_SKILLS:
        # Use regex word boundary checks, handling special chars like c++, c#, .net
        if skill in ["c++", "c#", ".net"]:
            pattern = re.escape(skill)
        elif skill in ["node.js", "vue.js", "express.js", "next.js", "nest.js", "nuxt.js"]:
            pattern = r'\b' + re.escape(skill)
        else:
            pattern = r'\b' + re.escape(skill) + r'\b'
            
        if re.search(pattern, text_lower):
            found.add(skill)
    return found

def extract_tfidf_keywords(text: str, top_n: int = 15) -> Set[str]:
    """Helper to extract high-importance keywords from job description using TF-IDF."""
    if not text.strip():
        return set()
    vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
    try:
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]
        sorted_indices = scores.argsort()[::-1]
        top_words = {feature_names[i] for i in sorted_indices[:top_n] if scores[i] > 0}
        return {w for w in top_words if len(w) > 2 and not w.isdigit()}
    except Exception as e:
        log.warning("TF-IDF keyword extraction failed: %s", str(e))
        return set()

def get_gemini_embedding(text: str) -> List[float]:
    """Retrieves text embeddings from Gemini API if configured."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")
    
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    
    # Clean text input length
    truncated_text = text[:8000]
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=truncated_text,
        task_type="retrieval_document"
    )
    return result["embedding"]

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two numeric vectors."""
    import numpy as np
    a = np.array(vec1)
    b = np.array(vec2)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def get_semantic_similarity(resume_text: str, job_description: str) -> float:
    """Computes semantic similarity. Tries Gemini embeddings first, falls back to TF-IDF Cosine Similarity."""
    try:
        log.info("[NLP] Requesting Gemini embeddings...")
        res_emb = get_gemini_embedding(resume_text)
        jd_emb = get_gemini_embedding(job_description)
        similarity = calculate_cosine_similarity(res_emb, jd_emb)
        # Normalize from [-1, 1] to [0, 1]
        similarity = max(0.0, min(1.0, (similarity + 1) / 2))
        log.info("[NLP] Gemini embedding similarity computed: %.2f", similarity)
        return similarity
    except Exception as e:
        log.warning("[NLP] Gemini embedding failed: %s. Falling back to TF-IDF Cosine Similarity.", str(e))
        
    # Fallback to TF-IDF
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf = vectorizer.fit_transform([resume_text, job_description])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(max(0.0, min(1.0, sim)))
    except Exception as ex:
        log.error("[NLP] TF-IDF Cosine Similarity failed: %s", str(ex))
        return 0.5  # Neutral fallback

def check_section_completeness(resume_text: str) -> Tuple[List[str], List[str]]:
    """Checks for standard resume section headings in text."""
    sections = {
        "Experience": [r"\bexperience\b", r"\bwork history\b", r"\bemployment\b", r"\bprofessional background\b"],
        "Education": [r"\beducation\b", r"\bacademics\b", r"\bqualifications\b", r"\buniversity\b"],
        "Skills": [r"\bskills\b", r"\btechnical skills\b", r"\bcore competencies\b", r"\btechnologies\b"],
        "Summary": [r"\bsummary\b", r"\bprofessional summary\b", r"\babout me\b", r"\bobjective\b"]
    }
    
    resume_lower = resume_text.lower()
    found = []
    missing = []
    
    for section, patterns in sections.items():
        if any(re.search(pat, resume_lower) for pat in patterns):
            found.append(section)
        else:
            missing.append(section)
            
    return found, missing

def check_formatting_safety(resume_text: str) -> List[str]:
    """Checks formatting details like contact info, bullet points, and capitalization."""
    issues = []
    
    # 1. Contact checks
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    if not re.search(email_pattern, resume_text):
        issues.append("Missing email contact details")
        
    phone_pattern = r'(\+?\d{1,4}[-.\s]??)?(\(?\d{3}\)?[-.\s]??)?\d{3}[-.\s]??\d{4,6}'
    if not re.search(phone_pattern, resume_text):
        issues.append("Missing telephone contact details")
        
    # 2. Bullet point list check
    bullet_patterns = [r'•', r'\*', r'\n\s*-\s+', r'\n\s*\d+\.\s+']
    if not any(re.search(pat, resume_text) for pat in bullet_patterns):
        issues.append("No list structures or bullet points found (plain paragraphs are harder for ATS)")
        
    # 3. All-caps overuse check
    words = re.findall(r'\b[a-zA-Z]+\b', resume_text)
    if words:
        caps_words = [w for w in words if w.isupper() and len(w) > 2]
        ratio = len(caps_words) / len(words)
        if ratio > 0.15:  # more than 15% capitalized words
            issues.append("Excessive capitalization detected (avoid ALL-CAPS overuse)")
            
    return issues

def check_quantified_achievements(resume_text: str) -> Tuple[List[str], List[str]]:
    """Detects numeric achievements/percentages inside resume text."""
    patterns = [
        r'\d+%\s+(increase|decrease|growth|improvement|reduction)',
        r'(increased|decreased|improved|reduced|saved|generated)\s+\w+\s+by\s+\d+%',
        r'\$\d+[\d,.]*[kKmM]?',
        r'\b\d+\s+percent\b',
        r'\bsaved\s+\d+\s+hours\b',
        r'\bmanaged\s+a?\s*budget\s+of\b',
        r'\bled\s+a?\s*team\s+of\s+\d+\b'
    ]
    
    examples = []
    for pat in patterns:
        matches = re.finditer(pat, resume_text, re.IGNORECASE)
        for match in matches:
            examples.append(match.group(0))
            
    suggestions = []
    if len(examples) == 0:
        suggestions.append("Incorporate statistics: quantify impact (e.g., 'Reduced loading time by 30%', 'Led team of 5')")
    elif len(examples) < 2:
        suggestions.append("Add more metrics: back up your experience with concrete figures and project values.")
        
    return examples[:5], suggestions

def check_action_verbs(resume_text: str) -> Tuple[List[str], List[str]]:
    """Identifies strong action verbs and warns on weak phrases."""
    strong_verbs = {
        "led", "built", "designed", "implemented", "engineered", "orchestrated", "developed", "architected",
        "streamlined", "optimized", "spearheaded", "executed", "collaborated", "pioneered", "formulated",
        "upgraded", "automated", "created", "delivered", "deployed", "refactored", "managed", "resolved"
    }
    
    weak_phrases = [
        "responsible for", "duties included", "helped with", "assisted in", "worked on", "participated in"
    ]
    
    resume_lower = resume_text.lower()
    
    verbs_found = []
    for verb in strong_verbs:
        if re.search(r'\b' + re.escape(verb) + r'\b', resume_lower):
            verbs_found.append(verb.capitalize())
            
    phrases_found = []
    for phrase in weak_phrases:
        if phrase in resume_lower:
            phrases_found.append(phrase)
            
    return verbs_found[:10], phrases_found

def get_grade(score: float) -> str:
    if score >= 85:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 55:
        return "C"
    elif score >= 40:
        return "D"
    else:
        return "F"

def score_ats_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Computes a hybrid, deterministic score based on:
    - 50% Keyword Overlap Percentage
    - 30% Semantic Similarity Score
    - 20% Section & Formatting Checks
    
    Distributes this into sub-scores matching the original frontend display schema:
    - keyword_analysis (0-40 max)
    - section_completeness (0-20 max)
    - formatting_safety (0-15 max)
    - quantified_achievements (0-15 max)
    - action_verbs (0-10 max)
    Sum of category scores matches ats_score out of 100.
    """
    # 1. Keywords Analysis
    jd_skills = extract_skills_from_text(job_description)
    tfidf_words = extract_tfidf_keywords(job_description, top_n=15)
    jd_keywords = jd_skills.union(tfidf_words)
    
    resume_skills = extract_skills_from_text(resume_text)
    resume_tfidf_words = {w for w in tfidf_words if w in resume_text.lower()}
    resume_keywords = resume_skills.union(resume_tfidf_words)
    
    if jd_keywords:
        matched_keywords = list(resume_keywords.intersection(jd_keywords))
        missing_keywords = list(jd_keywords - resume_keywords)
        overlap_ratio = len(matched_keywords) / len(jd_keywords)
    else:
        matched_keywords = []
        missing_keywords = []
        overlap_ratio = 1.0
        
    # 2. Semantic Similarity Check
    similarity = get_semantic_similarity(resume_text, job_description)
    
    # 3. Section Completeness Check (4 headings)
    sections_found, sections_missing = check_section_completeness(resume_text)
    section_ratio = len(sections_found) / 4.0 if sections_found else 0.0
    
    # 4. Formatting Safety Checks (4 categories checks)
    format_issues = check_formatting_safety(resume_text)
    format_ratio = max(0.0, 1.0 - (len(format_issues) / 4.0))
    
    # 5. Quantified Achievements
    examples, suggestions = check_quantified_achievements(resume_text)
    achievements_ratio = 1.0 if len(examples) >= 2 else (0.5 if len(examples) == 1 else 0.0)
    
    # 6. Action Verbs
    verbs_found, weak_phrases = check_action_verbs(resume_text)
    verb_ratio = 1.0 if (len(verbs_found) >= 4 and len(weak_phrases) == 0) else (0.7 if len(verbs_found) >= 2 else 0.4)
    
    # Determine the Category Scores fitting exactly into client max limits
    # Max category bounds: 40, 20, 15, 15, 10 (Total 100)
    # Distribute the overall weights (50% keyword overlap, 30% semantic similarity, 20% formatting checks)
    
    # keyword_analysis.score (0-40): 25 points from overlap + 15 points from similarity
    kw_score = round(40 * (0.625 * overlap_ratio + 0.375 * similarity))
    
    # section_completeness.score (0-20): 10 points keyword overlap + 10 points sections found
    sec_score = round(20 * (0.5 * overlap_ratio + 0.5 * section_ratio))
    
    # formatting_safety.score (0-15): 10 points similarity + 5 points format checks
    fmt_score = round(15 * (0.667 * similarity + 0.333 * format_ratio))
    
    # quantified_achievements.score (0-15): 10 points keyword overlap + 5 points achievements ratio
    quant_score = round(15 * (0.667 * overlap_ratio + 0.333 * achievements_ratio))
    
    # action_verbs.score (0-10): 5 points similarity + 5 points verbs ratio
    act_score = round(10 * (0.5 * similarity + 0.5 * verb_ratio))
    
    # Sum up category scores to enforce strict consistency
    final_score = kw_score + sec_score + fmt_score + quant_score + act_score
    final_score = max(0, min(100, final_score))
    
    # Safety notes mapping
    kw_notes = f"Matched {len(matched_keywords)} of {len(jd_keywords)} relevant skills."
    sec_notes = f"Detected {len(sections_found)} of 4 required core sections."
    fmt_notes = f"Detected {len(format_issues)} formatting issues." if format_issues else "Resume layout is highly readable."
    quant_notes = f"Found {len(examples)} quantified achievements."
    act_notes = f"Found {len(verbs_found)} strong action verbs and {len(weak_phrases)} weak phrasing instances."

    return {
        "ats_score": final_score,
        "grade": get_grade(final_score),
        "keyword_analysis": {
            "score": kw_score,
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "notes": kw_notes
        },
        "section_completeness": {
            "score": sec_score,
            "sections_found": sections_found,
            "sections_missing": sections_missing,
            "notes": sec_notes
        },
        "formatting_safety": {
            "score": fmt_score,
            "issues_detected": format_issues,
            "notes": fmt_notes
        },
        "quantified_achievements": {
            "score": quant_score,
            "examples_found": examples,
            "suggestions": suggestions,
            "notes": quant_notes
        },
        "action_verbs": {
            "score": act_score,
            "strong_verbs_found": verbs_found,
            "weak_phrases": weak_phrases,
            "notes": act_notes
        }
    }
