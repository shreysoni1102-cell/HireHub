import { useState } from 'react';
import api from '../api/axios.js';

const GRADE_STYLE = {
  A: { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  ring: '#22c55e', label: '🏆 Excellent' },
  B: { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-700',   ring: '#3b82f6', label: '👍 Good' },
  C: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', ring: '#f59e0b', label: '⚠️ Average' },
  D: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', ring: '#f97316', label: '📉 Below Average' },
  F: { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    ring: '#ef4444', label: '❌ Poor Match' },
};

function ScoreCircle({ score, grade }) {
  const style = GRADE_STYLE[grade] || GRADE_STYLE.C;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="148" height="148" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="13" />
        <circle cx="74" cy="74" r={radius} fill="none" stroke={style.ring} strokeWidth="13"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 74 74)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x="74" y="65" textAnchor="middle" fontSize="30" fontWeight="800" fill={style.ring}>{score}</text>
        <text x="74" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">out of 100</text>
        <text x="74" y="104" textAnchor="middle" fontSize="20" fontWeight="800" fill={style.ring}>Grade {grade}</text>
      </svg>
      <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
    </div>
  );
}

function CategoryBar({ label, score, max, color }) {
  const pct = Math.round((score / max) * 100);
  const colors = { blue:'bg-blue-500', green:'bg-green-500', yellow:'bg-yellow-500', purple:'bg-purple-500', pink:'bg-pink-500' };
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span><span className="font-bold">{score}/{max}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${colors[color]} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TagList({ items, variant }) {
  if (!items?.length) return <p className="text-xs text-slate-400 italic">None found</p>;
  const styles = { green:'bg-green-100 text-green-800', red:'bg-red-100 text-red-800', blue:'bg-blue-100 text-blue-700', orange:'bg-orange-100 text-orange-800', slate:'bg-slate-100 text-slate-700' };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>{item}</span>
      ))}
    </div>
  );
}

export default function ATSChecker() {
  const [inputMode, setInputMode] = useState('pdf'); // 'pdf' | 'text'
  const [file, setFile]           = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jd, setJd]               = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [extractedLen, setExtractedLen] = useState(null);
  const [error, setError]         = useState('');
  const [dragOver, setDragOver]   = useState(false);

  // Enhancer states
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState(null);
  const [enhanceError, setEnhanceError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (f) => {
    if (f?.type === 'application/pdf') { setFile(f); setError(''); }
    else setError('Only PDF files are accepted.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputMode === 'pdf' && !file) return setError('Please upload your resume PDF.');
    if (inputMode === 'text' && resumeText.trim().length < 100)
      return setError('Please paste your resume text (minimum 100 characters).');
    if (jd.trim().length < 50) return setError('Job description must be at least 50 characters.');

    setLoading(true); setError(''); setResult(null); setExtractedLen(null); setEnhancedResult(null);

    try {
      let response;
      if (inputMode === 'pdf') {
        const form = new FormData();
        form.append('resume', file);
        form.append('jobDescription', jd);
        const { data } = await api.post('/ai/ats-check', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        response = data;
        setExtractedLen(data.extractedChars);
        setResumeText(data.resumeText || '');
      } else {
        const { data } = await api.post('/ai/ats-check-text', {
          resumeText: resumeText.trim(),
          jobDescription: jd.trim(),
        });
        response = data;
      }
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Check server terminal logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    setEnhanceError('');
    setEnhancedResult(null);
    setCopied(false);

    try {
      const { data } = await api.post('/ai/enhance-resume', {
        resumeText: resumeText.trim(),
        jobDescription: jd.trim(),
      });
      if (data && data.success) {
        setEnhancedResult(data.data);
        // Scroll to enhanced view smoothly
        setTimeout(() => {
          document.getElementById('enhanced-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      setEnhanceError(err.response?.data?.message || 'Failed to enhance resume. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleCopy = () => {
    if (!enhancedResult) return;
    const bulletsText = (enhancedResult.enhancedBullets || []).map(b => `• ${b}`).join('\n');
    const fullText = `=== PROFESSIONAL SUMMARY ===\n${enhancedResult.enhancedSummary}\n\n=== EXPERIENCE BULLETS ===\n${bulletsText}`;
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const r = result;
  const gradeStyle = r ? (GRADE_STYLE[r.grade] || GRADE_STYLE.C) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 px-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">🤖 AI Resume ATS Checker</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Get a weighted ATS score, letter grade, keyword analysis, and automatically enhance your resume.
        </p>
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          {/* Mode Toggle */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resume Input Method
            </label>
            <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-800">
              <button type="button"
                onClick={() => setInputMode('pdf')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'pdf' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                📄 Upload PDF
              </button>
              <button type="button"
                onClick={() => setInputMode('text')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'text' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                ✏️ Paste Resume Text
              </button>
            </div>
            {inputMode === 'text' && (
              <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 dark:bg-amber-950/20 dark:text-amber-400">
                💡 <strong>Tip:</strong> If your PDF has columns/tables/icons, paste text directly for more accurate results. Open your PDF → Select All → Copy → Paste here.
              </p>
            )}
          </div>

          {/* PDF Upload */}
          {inputMode === 'pdf' && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Resume PDF</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('resume-input').click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition
                  ${dragOver ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950'}`}>
                <input id="resume-input" type="file" accept=".pdf" className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])} />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl">📄</span>
                    <p className="font-semibold text-green-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl">⬆️</span>
                    <p className="font-medium text-slate-600 dark:text-slate-300">Drag & drop resume PDF here</p>
                    <p className="text-xs text-slate-400">or click to browse — max 5 MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Paste */}
          {inputMode === 'text' && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resume Text <span className="text-slate-400 normal-case">(copy-paste from your PDF)</span>
              </label>
              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={10}
                placeholder="John Doe&#10;Software Engineer | john@email.com | LinkedIn&#10;&#10;EXPERIENCE&#10;Google — Senior Engineer (2021-2024)&#10;• Led team of 8 engineers...&#10;&#10;SKILLS&#10;React, Node.js, Python, Docker..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              <p className="mt-1 text-right text-xs text-slate-400">{resumeText.length} chars (min 100)</p>
            </div>
          )}

          {/* Job Description */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Job Description
            </label>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={6}
              placeholder="Paste the full job description — required skills, responsibilities, qualifications..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <p className="mt-1 text-right text-xs text-slate-400">{jd.length} chars (min 50)</p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-60">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing with AI…
              </span>
            ) : '✨ Scan My Resume'}
          </button>
        </form>
      )}

      {/* Results */}
      {r && (
        <div className="space-y-6">
          {/* Score Hero */}
          <div className={`flex flex-col items-center gap-5 rounded-2xl border ${gradeStyle.border} ${gradeStyle.bg} p-6 sm:flex-row sm:items-start dark:bg-slate-900`}>
            <ScoreCircle score={r.ats_score} grade={r.grade} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ATS Scan Complete</h2>
              {extractedLen !== null && (
                <p className="text-xs text-slate-400 mb-1">📄 {extractedLen} characters extracted from PDF</p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.summary}</p>
              <div className="mt-4 space-y-2.5">
                <CategoryBar label="🔑 Keyword Match"           score={r.keyword_analysis?.score}        max={40} color="blue" />
                <CategoryBar label="📋 Section Completeness"    score={r.section_completeness?.score}    max={20} color="green" />
                <CategoryBar label="🖥️ Formatting Safety"       score={r.formatting_safety?.score}       max={15} color="yellow" />
                <CategoryBar label="📊 Quantified Achievements" score={r.quantified_achievements?.score} max={15} color="purple" />
                <CategoryBar label="💪 Action Verbs"            score={r.action_verbs?.score}            max={10} color="pink" />
              </div>
            </div>
          </div>

          {/* Enhancer Action Drawer / trigger */}
          {!enhancedResult && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-900 dark:from-blue-950/20 dark:to-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300">✨ Optimize with AI Resume Enhancer</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Instantly rewrite summary and bullet points to include missing keywords and add strong action verbs.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnhance}
                disabled={enhancing}
                className="whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {enhancing ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Optimizing...
                  </>
                ) : (
                  'Optimize Resume'
                )}
              </button>
            </div>
          )}

          {enhanceError && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              ⚠️ {enhanceError}
            </div>
          )}

          {/* Enhanced Split Screen Diff View */}
          {enhancedResult && (
            <div id="enhanced-section" className="space-y-6 scroll-mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">📝 AI Optimization Diff Summary</h3>
                  <p className="text-xs text-slate-500">Compare original text highlights (left) with AI-enhanced options (right).</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                  >
                    {copied ? '✓ Copied' : 'Copy Enhanced Text'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnhancedResult(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                  >
                    Close Diff
                  </button>
                </div>
              </div>

              {/* Summary Section */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Summary Comparison</h4>
                </div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* Left: Original */}
                  <div className="p-4 bg-red-50/25 dark:bg-red-950/5">
                    <span className="text-3xs uppercase tracking-wider font-semibold text-red-600">Original</span>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed dark:text-slate-400">
                      {enhancedResult.originalSummary || '(No professional summary found)'}
                    </p>
                  </div>
                  {/* Right: Enhanced */}
                  <div className="p-4 bg-green-50/20 dark:bg-green-950/5">
                    <span className="text-3xs uppercase tracking-wider font-semibold text-green-600">Enhanced (Optimized Summary)</span>
                    <p className="mt-2 text-xs font-semibold text-slate-800 leading-relaxed dark:text-slate-200">
                      {enhancedResult.enhancedSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bullet Points Section */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Experience Bullet Points Comparison</h4>
                </div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* Left: Original */}
                  <div className="p-4 bg-red-50/25 dark:bg-red-950/5 space-y-3">
                    <span className="text-3xs uppercase tracking-wider font-semibold text-red-600">Original Bullets</span>
                    <ul className="list-disc list-inside space-y-2 mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {enhancedResult.originalBullets && enhancedResult.originalBullets.length > 0 ? (
                        enhancedResult.originalBullets.map((b, idx) => <li key={idx}>{b}</li>)
                      ) : (
                        <li>(No separate experience bullets found)</li>
                      )}
                    </ul>
                  </div>
                  {/* Right: Enhanced */}
                  <div className="p-4 bg-green-50/20 dark:bg-green-950/5 space-y-3">
                    <span className="text-3xs uppercase tracking-wider font-semibold text-green-600">Enhanced Bullets (Action-Verb Weighted)</span>
                    <ul className="list-disc list-inside space-y-2 mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {enhancedResult.enhancedBullets && enhancedResult.enhancedBullets.length > 0 ? (
                        enhancedResult.enhancedBullets.map((b, idx) => <li key={idx}>{b}</li>)
                      ) : (
                        <li>(AI was unable to optimize bullet items)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detail Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">🔑 Keyword Analysis</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800 dark:text-white">{r.keyword_analysis?.score}/40</span>
              </div>
              <p className="mb-1.5 text-xs font-semibold text-green-700">Matched Keywords</p>
              <TagList items={r.keyword_analysis?.matched_keywords} variant="green" />
              <p className="mb-1.5 mt-3 text-xs font-semibold text-red-700">Missing Keywords</p>
              <TagList items={r.keyword_analysis?.missing_keywords} variant="red" />
              <p className="mt-3 text-xs italic text-slate-500">{r.keyword_analysis?.notes}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">📋 Section Completeness</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800 dark:text-white">{r.section_completeness?.score}/20</span>
              </div>
              <p className="mb-1.5 text-xs font-semibold text-green-700">Sections Found</p>
              <TagList items={r.section_completeness?.sections_found} variant="green" />
              <p className="mb-1.5 mt-3 text-xs font-semibold text-red-700">Sections Missing</p>
              <TagList items={r.section_completeness?.sections_missing} variant="red" />
              <p className="mt-3 text-xs italic text-slate-500">{r.section_completeness?.notes}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">📊 Quantified Achievements</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800 dark:text-white">{r.quantified_achievements?.score}/15</span>
              </div>
              <p className="mb-1.5 text-xs font-semibold text-blue-700">Examples Found</p>
              <TagList items={r.quantified_achievements?.examples_found} variant="blue" />
              <p className="mb-1.5 mt-3 text-xs font-semibold text-orange-700">Suggestions</p>
              <TagList items={r.quantified_achievements?.suggestions} variant="orange" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">💪 Action Verbs</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800 dark:text-white">{r.action_verbs?.score}/10</span>
              </div>
              <p className="mb-1.5 text-xs font-semibold text-green-700">Strong Verbs Found</p>
              <TagList items={r.action_verbs?.strong_verbs_found} variant="green" />
              <p className="mb-1.5 mt-3 text-xs font-semibold text-orange-700">Weak Phrases to Replace</p>
              <TagList items={r.action_verbs?.weak_phrases} variant="orange" />
            </div>
          </div>

          {/* Formatting */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">🖥️ Formatting Safety</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800 dark:text-white">{r.formatting_safety?.score}/15</span>
            </div>
            {r.formatting_safety?.issues_detected?.length > 0
              ? <TagList items={r.formatting_safety.issues_detected} variant="orange" />
              : <p className="text-sm font-medium text-green-600">✅ No formatting issues detected</p>}
            <p className="mt-2 text-xs italic text-slate-500">{r.formatting_safety?.notes}</p>
          </div>

          {/* Top Improvements */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 dark:bg-purple-950/20 dark:border-purple-900">
            <h3 className="mb-3 text-sm font-bold text-purple-800 dark:text-purple-300">🚀 Top Improvements</h3>
            <ol className="space-y-2">
              {r.top_improvements?.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-350">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{i+1}</span>
                  {tip}
                </li>
              ))}
            </ol>
          </div>

          <div className="text-center">
            <button onClick={() => { setResult(null); setFile(null); setJd(''); setResumeText(''); setExtractedLen(null); setEnhancedResult(null); }}
              className="rounded-xl border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800">
              ↩ Scan Another Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
