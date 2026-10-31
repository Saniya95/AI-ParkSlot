import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, AlertCircle, ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';

export default function AiChatbotModal({ 
  onClose, 
  venueId, 
  selectedVenueName, 
  authToken, 
  currentUser 
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: selectedVenueName
        ? `Hello! I'm your AI ParkSlot assistant. I am currently tuned to live real-time telemetry for **${selectedVenueName}**.\n\nYou can ask me about available slots, rates per hour, EV fast charging, our Dual-QR gate barrier rules, or your account bookings. How can I help you today?`
        : "Hello! I'm your AI ParkSlot assistant. You can ask me about live parking vacancies across our network, hourly tariffs, EV charging, our Dual-QR gate barrier workflow, or how to pre-book slots in advance. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [retryQuery, setRetryQuery] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Dynamic Browser Online / Offline Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim() || loading) return;

    const trimmedQuery = query.trim();
    const userMsg = { id: Date.now(), sender: 'user', text: trimmedQuery };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // A. User's device has no network connection
    if (!navigator.onLine || !isOnline) {
      setRetryQuery(trimmedQuery);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          isError: true,
          canRetry: true,
          failedQuery: trimmedQuery,
          text: "You're currently offline. I can't access live parking availability right now. Please check your internet connection and try again."
        }
      ]);
      return;
    }

    // Prepare conversation history (last 6 messages for coherent multi-turn dialogue)
    const historyPayload = messages.slice(-6).map(m => ({
      sender: m.sender === 'ai' ? 'ai' : 'user',
      text: m.text
    }));

    setLoading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmedQuery,
          venueId: venueId || null,
          conversationHistory: historyPayload
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.reply) {
        setRetryQuery('');
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            text: data.reply
          }
        ]);
      } else {
        // Distinguish error categories safely without exposing internal server/env details
        let friendlyError = "The parking assistant is temporarily unreachable. Please try again shortly.";

        if (data?.error === 'DATABASE_UNAVAILABLE' || data?.error === 'DATABASE_DISCONNECTED') {
          friendlyError = "Live parking information is temporarily unavailable. Please try again in a moment.";
        } else if (data?.error === 'RATE_LIMIT_EXCEEDED') {
          friendlyError = "You have sent messages too quickly. Please wait a moment before sending another question.";
        } else if (data?.error === 'AI_TIMEOUT') {
          friendlyError = "The parking assistant took too long to respond. Please try again in a moment.";
        } else if (data?.error === 'AUTH_ERROR' || data?.error === 'MISSING_API_KEY') {
          friendlyError = "The AI parking assistant service is currently unavailable. Please try again later.";
        } else if (data?.message && !data.message.includes('.env') && !data.message.includes('Atlas') && !data.message.includes('password') && !data.message.includes('GEMINI_API_KEY')) {
          friendlyError = data.message;
        }

        setRetryQuery(trimmedQuery);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            isError: true,
            canRetry: true,
            failedQuery: trimmedQuery,
            text: friendlyError
          }
        ]);
      }
    } catch (err) {
      setRetryQuery(trimmedQuery);
      if (!navigator.onLine) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            isError: true,
            canRetry: true,
            failedQuery: trimmedQuery,
            text: "You're currently offline. I can't access live parking availability right now. Please check your internet connection and try again."
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            isError: true,
            canRetry: true,
            failedQuery: trimmedQuery,
            text: "The parking assistant is temporarily unreachable. Please try again shortly."
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Are there vacant spots right now?",
    "What are the parking rates?",
    "How does the Entry and Exit QR work?",
    ...(currentUser ? ["What are my current bookings?"] : ["How do I register and book a slot?"]),
    "Where is EV charging available?",
    "Who developed AI ParkSlot?"
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '540px', 
          height: '640px', 
          display: 'flex', 
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.15)', padding: '0.45rem', borderRadius: '8px' }}>
              <Bot size={20} color="var(--accent-ai)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  AI ParkSlot Assistant
                </h3>
                <span className="badge badge-ai" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                  AI Powered
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: isOnline ? 'var(--color-vacant)' : '#ef4444', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{isOnline ? '● Real-time Live Knowledge Active' : '○ Offline Mode'}</span>
                {currentUser && (
                  <span style={{ color: 'var(--text-dim)' }}>
                    • User: <strong style={{ color: 'var(--text-muted)' }}>{currentUser.name}</strong>
                  </span>
                )}
                {selectedVenueName && (
                  <span style={{ color: 'var(--accent-ai)' }}>
                    • {selectedVenueName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0.25rem' }}
            title="Close Assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Offline Status Warning Banner */}
        {!isOnline && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            fontSize: '0.75rem',
            padding: '0.4rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <WifiOff size={14} color="#ef4444" />
              <span>You're currently offline. I can't access live parking availability right now.</span>
            </div>
            {retryQuery && (
              <button
                onClick={() => handleSend(retryQuery)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Messages Body */}
        <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div 
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignSelf: isAi ? 'flex-start' : 'flex-end',
                  maxWidth: '85%'
                }}
              >
                {isAi && (
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: m.isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(14, 165, 233, 0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0, 
                    marginTop: '2px' 
                  }}>
                    {m.isError ? <AlertCircle size={15} color="#ef4444" /> : <Bot size={15} color="var(--accent-ai)" />}
                  </div>
                )}

                <div>
                  <div style={{
                    background: isAi 
                      ? (m.isError ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)') 
                      : 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: isAi ? 'var(--text-main)' : '#ffffff',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: isAi 
                      ? (m.isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)') 
                      : 'none',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line'
                  }}>
                    {m.text}
                  </div>

                  {m.canRetry && (
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSend(m.failedQuery || retryQuery)}
                        disabled={loading}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          borderColor: 'rgba(239, 68, 68, 0.35)',
                          color: 'var(--text-muted)'
                        }}
                        title="Retry sending this question"
                      >
                        <RefreshCw size={11} />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--accent-ai)', fontSize: '0.8rem', paddingLeft: '2.5rem' }}>
              <Sparkles size={14} className="spin-slow" />
              <span>AI is analyzing live parking data...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt pills */}
        <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.35rem', overflowX: 'auto', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0.25rem 0.6rem' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder={!isOnline ? "Device is offline. Check connection to chat..." : "Ask AI about parking, rates, or QR rules..."}
            style={{ fontSize: '0.85rem', flexGrow: 1 }}
          />
          <button 
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ padding: '0 1rem' }}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
