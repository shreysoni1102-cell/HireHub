import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.js';

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [jobTitle, setJobTitle] = useState(location.state?.jobTitle || 'AI Mock Interview');
  const [question, setQuestion] = useState(location.state?.firstQuestion || '');
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setAnswer((prev) => prev + finalTranscript);
        }
      };

      rec.onerror = (e) => {
        console.error('[Speech Error]', e.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Speak question out loud when it changes
  useEffect(() => {
    if (question && soundEnabled) {
      speakQuestion(question);
    }
  }, [question, soundEnabled]);

  // Handle back button / unload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your mock interview progress will be lost.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cancel speech if component unmounts
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakQuestion = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Cancel active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Slightly slower for clarity
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicToggle = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      setSubmitting(true);
      const { data } = await api.post('/interview/answer', {
        sessionId: id,
        answer: answer.trim()
      });

      if (data && data.success && data.data) {
        const result = data.data;
        if (result.isFinished) {
          // Speak finishing cue
          if (soundEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const doneUtter = new SpeechSynthesisUtterance('Thank you. The mock interview is complete. Generating your evaluation report now.');
            window.speechSynthesis.speak(doneUtter);
          }
          // Redirect to report page
          navigate(`/seeker/interview/${id}/report`);
        } else {
          // Load next question
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-2xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 tracking-wide uppercase">
            {jobTitle}
          </span>
          <h1 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
            Active Mock Interview
          </h1>
        </div>

        {/* Question progress counter */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-500">
            Question <span className="text-slate-900 dark:text-white">{qIndex + 1}</span> of 5
          </span>
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (soundEnabled) window.speechSynthesis?.cancel();
            }}
            className={`rounded-xl border p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
              soundEnabled ? 'border-blue-200 text-blue-600 bg-blue-50/50' : 'border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {/* Left 2 Cols: Question and Answer form */}
        <div className="md:col-span-2 space-y-6">
          {/* Question Display Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interviewer</span>
              <button
                type="button"
                onClick={() => speakQuestion(question)}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400 font-semibold"
              >
                🔊 Replay Question
              </button>
            </div>
            <p className="mt-4 font-display text-lg font-semibold leading-relaxed text-slate-800 dark:text-white">
              {question || 'Generating next question...'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Your Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Transcribe with mic below or type your answer directly..."
                rows={8}
                required
                className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-relaxed shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl">
                ⚠️ {error}
              </p>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                You can review and edit your transcribed answer before submitting.
              </span>
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting...' : qIndex === 4 ? 'Finish Interview' : 'Submit & Next Question'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Voice Capture Tools */}
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-wide">
              Voice Dictation
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Click the mic to speak your answer. Your spoken words will transcribe directly into the workspace.
            </p>

            <div className="my-8 flex justify-center">
              <button
                type="button"
                onClick={handleMicToggle}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full transition shadow-lg ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                {isRecording ? (
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Audio Wave Indicator */}
            {isRecording && (
              <div className="mb-4 flex items-center justify-center gap-1">
                <span className="h-6 w-1 rounded bg-red-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="h-8 w-1 rounded bg-red-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="h-5 w-1 rounded bg-red-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span className="h-9 w-1 rounded bg-red-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                <span className="h-6 w-1 rounded bg-red-500 animate-bounce" style={{ animationDelay: '0.5s' }} />
              </div>
            )}

            <div className="rounded-xl border border-slate-200/60 bg-white p-3 text-left dark:border-slate-800 dark:bg-slate-950">
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-400">Microphone Status</span>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isRecording ? '🎙️ Listening...' : speechSupported ? '🟢 Ready to record' : '🔴 Browser speech not supported'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
