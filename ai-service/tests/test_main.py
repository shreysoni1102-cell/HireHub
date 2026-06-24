import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path so main can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "ai-microservice", "port": 5001}

from unittest.mock import AsyncMock

def test_analyze_endpoint(mocker):
    # Mock the LLM call to return clean JSON feedback
    mock_response = """
    {
      "summary": "Mocked verdict summary showing strong fit.",
      "top_improvements": ["Improvement A", "Improvement B"],
      "strong_verbs_found": ["Developed", "Engineered"],
      "weak_phrases": ["Assisted with"],
      "quantified_achievements_notes": "Good formatting detected.",
      "action_verbs_notes": "Usage of strong active language is decent."
    }
    """
    
    # Patch the generate_content_gemini call using AsyncMock
    mocker.patch("main.generate_content_gemini", new_callable=AsyncMock, return_value=mock_response)
    mocker.patch("main.generate_content_groq", new_callable=AsyncMock, return_value=mock_response)

    payload = {
        "resume_text": "Experienced Python developer working with FastAPI, React, SQL, AWS, and Git. Designed scalable architectures and built robust services.",
        "job_description": "We are seeking a Python developer with expertise in FastAPI, React, Git, SQL, Docker, and AWS. Must be able to design scalable applications."
    }
    
    response = client.post("/analyze", json=payload)
    
    # Assert successful API response
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "data" in res_data
    
    # Check that deterministic calculations and qualitative LLM details are present in the response
    data = res_data["data"]
    assert "ats_score" in data
    assert "grade" in data
    assert "keyword_analysis" in data
    assert "summary" in data
    assert "top_improvements" in data
