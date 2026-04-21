import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

function ScoreRing({ score, label, color }) {
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorClasses = {
    blue:   { stroke: 'stroke-blue-600',   bg: 'text-blue-50 dark:text-blue-950/20'   },
    green:  { stroke: 'stroke-emerald-500', bg: 'text-emerald-50 dark:text-emerald-950/20' },
    purple: { stroke: 'stroke-purple-600', bg: 'text-purple-50 dark:text-purple-950/20' },
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90">
          {/* Background Ring */}
          <circle
            className={`fill-none ${selectedColor.bg} stroke-slate-100 dark:stroke-slate-800`}
            strokeWidth={strokeWidth}
            r={radius}
            cx="48"
            cy="48"
          />
          {/* Progress Ring */}
          <circle
            className={`fill-none ${selectedColor.stroke} transition-all duration-1000 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx="48"
            cy="48"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-slate-800 dark:text-white">
          {score}%
        </span>
      </div>
      <span className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

export default function InterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(0);

  const loadReport = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/interview/${id}`);
      if (data && data.success) {
        setSession(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch interview report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">Report Unreachable</h2>
        <p className="mt-2 text-sm text-slate-500">{error || 'Session not found.'}</p>
        <button
          onClick={() => navigate('/seeker/interview')}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          Back to Interview Center
        </button>
      </div>
    );
  }

  const evalData = session.evaluation || {};
  const qEvals = evalData.questionEvaluations || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/seeker/interview')}
        className="mb-6 inline-flex items-center text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to Interview Center
      </button>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-2xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400 tracking-wide uppercase">
            Practice Complete
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Interview Feedback: {session.jobTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Conducted on {new Date(session.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Score Rings Card */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex justify-center">
          <ScoreRing score={evalData.overallScore} label="Overall Score" color="blue" />
        </div>
        <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex justify-center">
          <ScoreRing score={evalData.technicalScore} label="Technical Proficiency" color="green" />
        </div>
        <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex justify-center">
          <ScoreRing score={evalData.communicationScore} label="Communication Quality" color="purple" />
        </div>
      </div>

      {/* AI Feedback Summary */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
          Overall Feedback Summary
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {evalData.feedback || 'No summary feedback provided.'}
        </p>
      </div>

      {/* Question Breakdown Accordion */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
          Question-by-Question Evaluation
        </h3>

        {qEvals.length > 0 ? (
          <div className="space-y-4">
            {qEvals.map((qEval, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30 transition dark:border-slate-800 dark:bg-slate-950/10"
                >
                  {/* Header/Trigger */}
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                    className="flex w-full items-center justify-between p-4 text-left font-medium text-slate-900 dark:text-white focus:outline-none"
                  >
                    <div className="pr-4">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Question #{index + 1}</span>
                      <h4 className="mt-1 text-sm font-semibold line-clamp-1">
                        {qEval.question}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold ${
                        qEval.score >= 75
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                          : qEval.score >= 50
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {qEval.score}%
                      </span>
                      <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Body Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 space-y-4 dark:border-slate-800">
                      <div>
                        <h5 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question asked</h5>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {qEval.question}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Candidate Answer */}
                        <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                          <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Your Answer</span>
                          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 italic">
                            "{qEval.answer || '(No response recorded)'}"
                          </p>
                        </div>

                        {/* Ideal Answer */}
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 dark:border-emerald-950/10 dark:bg-emerald-950/5">
                          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ideal AI Response</span>
                          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            {qEval.idealAnswer || 'No sample answer provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Explanation Feedback */}
                      <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-3 dark:border-blue-950/10 dark:bg-blue-950/5">
                        <span className="text-2xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">AI Explanation & Critique</span>
                        <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {qEval.explanation || 'No assessment feedback provided.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No question grading details available.</p>
        )}
      </div>
    </div>
  );
}
