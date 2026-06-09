import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.js';

const TOPIC_TAGS = [
  'Problem Solving', 'Project Management', 'Conflict Resolution', 'Leadership', 'Communication',
];

const QUESTIONS_TOTAL = 5;

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [jobTitle, setJobTitle]     = useState(location.state?.jobTitle || 'AI Mock Interview');
  const [question, setQuestion]     = useState(location.state?.firstQuestion || '');
  const [qIndex, setQIndex]         = useState(0);
  const [answer, setAnswer]         = useState('');
  const [currentScore, setCurrentScore] = useState(0);
  const [timeLeft, setTimeLeft]     = useState(5 * 60); // 5 min per question
  const [isRecording, setIsRecording]   = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [soundEnabled, setSoundEnabled]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);

  // ── Timer countdown ──
  useEffect(() => {
    setTimeLeft(5 * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIndex]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Speech Recognition ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setSpeechSupported(true);
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
      }
      if (final) setAnswer((prev) => prev + final);
    };
    rec.onerror  = () => setIsRecording(false);
    rec.onend    = () => setIsRecording(false);
    recognitionRef.current = rec;
  }, []);

  // ── Speak question ──
  useEffect(() => {
    if (question && soundEnabled) speakQuestion(question);
  }, [question]);

  useEffect(() => {
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakQuestion = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const handleMicToggle = () => {
    if (!speechSupported) { alert('Speech Recognition not supported. Use Chrome or Edge.'); return; }
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else {
      try { recognitionRef.current.start(); setIsRecording(true); }
      catch (err) { console.error(err); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); }
    try {
      setSubmitting(true);
      const { data } = await api.post('/interview/answer', { sessionId: id, answer: answer.trim() });
      if (data?.success && data?.data) {
        const result = data.data;
        if (result.score !== undefined) setCurrentScore(result.score);
        if (result.isFinished) {
          if (soundEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance('Interview complete. Generating your report.'));
          }
          navigate(`/seeker/interview/${id}/report`);
        } else {
          setQuestion(result.question);
          setQIndex(result.index);
          setAnswer('');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((qIndex) / QUESTIONS_TOTAL) * 100;

  return (
    <div className="min-h-screen bg-page text-primary">
      {/* ── Top Progress Bar ── */}
      <div className="border-b px-6 py-4 bg-surface border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-primary">
              Question {qIndex + 1} of {QUESTIONS_TOTAL}
            </p>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-surface-3 text-muted">
                {jobTitle}
              </span>
              <button
                onClick={() => { setSoundEnabled(!soundEnabled); if (soundEnabled) window.speechSynthesis?.cancel(); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors border ${
                  soundEnabled ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-transparent text-muted'
                }`}
                title={soundEnabled ? 'Mute' : 'Unmute'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-6">

        {/* Left: Question + Answer */}
        <div className="flex-1 space-y-5">
          {/* AI Question Bubble */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
              AI
            </div>
            <div className="flex-1 rounded-xl rounded-tl-none p-4 border border-border bg-surface relative">
              <p className="text-sm font-medium text-primary leading-relaxed">
                {question || (
                  <span className="flex items-center gap-2 text-muted">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Generating question...
                  </span>
                )}
              </p>
              {question && (
                <button
                  onClick={() => speakQuestion(question)}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  🔊 Replay
                </button>
              )}
            </div>
          </div>

          {/* Answer form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                Your Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here, or use the mic button to speak..."
                rows={7}
                required
                className="w-full rounded-xl px-4 py-3 text-sm text-primary placeholder-faint border border-border focus:outline-none focus:border-accent bg-surface resize-none leading-relaxed"
              />
            </div>

            {/* Mic + Submit row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMicToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  isRecording ? 'bg-danger-muted border-danger text-danger' : 'bg-surface border-border text-muted'
                }`}
              >
                {isRecording ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                    Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Use Mic
                  </>
                )}
              </button>

              {error && <p className="flex-1 text-xs text-danger">⚠️ {error}</p>}

              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Submitting...
                  </span>
                ) : qIndex === QUESTIONS_TOTAL - 1 ? 'Finish Interview' : 'Submit Answer'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Sidebar: Timer + Score + Tags ── */}
        <div className="w-52 shrink-0 space-y-4">
          {/* Timer */}
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
              Time Remaining
            </p>
            <p className={`text-4xl font-black tabular-nums ${timeLeft < 60 ? 'text-danger' : 'text-primary'}`}>
              {formatTime(timeLeft)}
            </p>
            {timeLeft < 60 && (
              <p className="text-xs text-danger mt-1 animate-pulse">⚠️ Hurry up!</p>
            )}
          </div>

          {/* Score */}
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
              Current Score
            </p>
            <p className="text-4xl font-black text-success">
              {currentScore}<span className="text-2xl text-muted">/100</span>
            </p>
          </div>

          {/* Topic Tags */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
              Topic Tags
            </p>
            <div className="flex flex-col gap-2">
              {TOPIC_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-center bg-surface-3 text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
