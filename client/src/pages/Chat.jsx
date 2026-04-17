import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const SOCKET_URL = 'http://localhost:5000';

export default function Chat() {
  const { roomId } = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [jobTitle, setJobTitle]   = useState('');
  const [otherName, setOtherName] = useState('');

  const socketRef  = useRef(null);
  const bottomRef  = useRef(null);

  // ── Load history + connect socket ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Fetch message history
    api.get(`/chat/${roomId}`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        setJobTitle(data.application?.jobId?.title || 'Chat');
        // Figure out the "other person's" name
        const isSeeker = user?.role === 'user';
        setOtherName(isSeeker ? 'Recruiter' : data.application?.applicantId?.name || 'Candidate');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load chat.');
        setLoading(false);
      });

    // Connect socket
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    socket.on('receive-message', (msg) => {
      setMessages((prev) => {
        // Avoid duplicate if we already have it (e.g. optimistic update)
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  // ── Auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current?.connected) return;

    socketRef.current.emit('send-message', {
      roomId,
      senderId:   user.id,
      senderName: user.name,
      senderRole: user.role,
      text:       input.trim(),
    });
    setInput('');
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg mt-16 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button onClick={() => navigate(-1)}
          className="mt-4 rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-slate-200 bg-white px-5 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-lg">←</button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{otherName}</p>
          <p className="text-xs text-slate-500">Re: {jobTitle}</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border border-y-0 border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <span className="text-4xl">💬</span>
            <p className="text-sm font-semibold text-slate-600">No messages yet</p>
            <p className="text-xs text-slate-400">Say hi to {otherName}!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = String(msg.senderId) === String(user.id);
          return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 shadow-sm ${
                isOwn
                  ? 'rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-bl-sm bg-white text-slate-800 border border-slate-200'
              }`}>
                {!isOwn && (
                  <p className={`mb-0.5 text-xs font-semibold ${isOwn ? 'text-blue-200' : 'text-blue-600'}`}>
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`mt-1 text-right text-xs ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="flex items-center gap-3 rounded-b-2xl border border-t-0 border-slate-200 bg-white px-4 py-3 shadow-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${otherName}…`}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button type="submit" disabled={!input.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">
          <svg viewBox="0 0 24 24" className="h-5 w-5 rotate-45" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
