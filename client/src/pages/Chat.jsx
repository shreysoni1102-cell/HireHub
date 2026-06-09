import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

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

  // Load message history & connect socket
  useEffect(() => {
    const token = localStorage.getItem('hirehub_token');

    // Fetch message history
    api.get(`/chat/${roomId}`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        setJobTitle(data.application?.jobId?.title || 'Chat');
        // Determine other person's name
        const isSeeker = user?.role === 'user';
        setOtherName(isSeeker ? 'Recruiter' : data.application?.applicantId?.name || 'Candidate');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load chat.');
        setLoading(false);
      });

    // Connect socket using current window location (Vite proxy will route /socket.io to backend)
    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    socket.on('receive-message', (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
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
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading chat room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Access Denied</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-6 rounded-xl border border-border text-primary px-5 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Main chat window container */}
      <div 
        className="flex-1 flex flex-col rounded-2xl border shadow-lg overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center gap-3 border-b px-5 py-4 shadow-sm"
          style={{ backgroundColor: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
        >
          <button 
            onClick={() => navigate(-1)} 
            className="hover:opacity-70 text-lg font-bold transition-all pr-2"
            style={{ color: 'var(--text-muted)' }}
          >
            ←
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white bg-blue-600">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{otherName}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Re: {jobTitle}</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-500 font-semibold">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Messages body */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ backgroundColor: 'var(--bg-page)' }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <span className="text-4xl">💬</span>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Say hi to {otherName}!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = String(msg.senderId) === String(user.id);
            return (
              <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-xs rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? 'rounded-br-sm bg-blue-600 text-white'
                      : 'rounded-bl-sm border text-sm'
                  }`}
                  style={{
                    backgroundColor: isOwn ? undefined : 'var(--bg-surface)',
                    borderColor: isOwn ? undefined : 'var(--border)',
                    color: isOwn ? undefined : 'var(--text-primary)',
                  }}
                >
                  {!isOwn && (
                    <p className="mb-0.5 text-xs font-semibold text-blue-600">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p 
                    className={`mt-1 text-right text-[10px] ${isOwn ? 'text-blue-200' : ''}`}
                    style={{ color: isOwn ? undefined : 'var(--text-faint)' }}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Footer input form */}
        <form 
          onSubmit={sendMessage}
          className="flex items-center gap-3 border-t px-4 py-3 shadow-sm"
          style={{ backgroundColor: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${otherName}...`}
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-transparent transition-all"
            style={{
              backgroundColor: 'var(--bg-page)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 rotate-45" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
