import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, Sparkles, Trash2, BookOpen } from 'lucide-react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatSidebar from '../components/chat/ChatSidebar';

const SESSION_ID = `session_${Date.now()}`;

const SUGGESTIONS = [
  'Summarize the key points of the uploaded document',
  'What are the main conclusions?',
  'List all mentioned dates and events',
  'Explain the technical terms used'
];

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await chatAPI.getHistory(1, 30);
        setHistory(res.data.chats);
      } catch {} finally { setHistoryLoading(false); }
    })();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: q }]);
    setQuery('');
    setLoading(true);
    try {
      const res = await chatAPI.sendQuery(q, SESSION_ID);
      const { answer, sources, fromCache, processingTime } = res.data;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: answer, sources, fromCache, processingTime }]);
      setHistory(prev => [{ _id: res.data.chatId, query: q, response: answer, createdAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to get a response. Please try again.';
      toast.error(msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: msg, error: true }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  };

  const handleHistoryClick = (chat) => {
    setMessages([
      { id: 1, role: 'user', content: chat.query },
      { id: 2, role: 'assistant', content: chat.response }
    ]);
  };

  const handleDeleteHistory = async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      setHistory(prev => prev.filter(c => c._id !== chatId));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden font-sans">
      <ChatSidebar
        open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)}
        history={history} loading={historyLoading}
        onSelectChat={handleHistoryClick} onDeleteChat={handleDeleteHistory}
        user={user} onLogout={logout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-zinc-500 hover:text-white transition">
                <BookOpen className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">RAG Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1.5 transition">
                <Trash2 className="w-3.5 h-3.5" /> Clear chat
              </button>
            )}
            <Link to="/profile"
              className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold hover:bg-brand-700 transition">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-8 h-8 text-brand-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Ask anything</h2>
              <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
                Upload a PDF document and ask questions about its content.<br />
                The AI will retrieve relevant context and generate precise answers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                    className="text-left p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-600/50 hover:bg-zinc-800 text-zinc-300 text-sm transition group">
                    <span className="text-brand-500 mr-2 group-hover:text-brand-400">›</span>{s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
              {loading && (
                <div className="flex items-start gap-3 py-4">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 p-4 shrink-0">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-zinc-900 border border-zinc-700 focus-within:border-brand-600 rounded-2xl px-4 py-3 transition">
              <textarea ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
                style={{ minHeight: '24px' }}
              />
              <button type="submit" disabled={!query.trim() || loading}
                className="shrink-0 w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-center text-zinc-600 text-xs mt-2">Enter to send · Shift+Enter for new line</p>
          </form>
        </div>
      </div>
    </div>
  );
}
