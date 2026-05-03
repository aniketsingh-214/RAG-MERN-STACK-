import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Trash2, ChevronLeft, Sparkles, LogOut, Clock, FileUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatSidebar({ open, onToggle, history, loading, onSelectChat, onDeleteChat, user, onLogout }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    setDeleting(chatId);
    await onDeleteChat(chatId);
    setDeleting(null);
  };

  if (!open) return null;

  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">RAG Assistant</span>
        </div>
        <button onClick={onToggle} className="text-zinc-500 hover:text-white transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-3 pt-4 pb-2">
        <Link to="/dashboard/upload" 
          className="flex items-center gap-3 w-full p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition mb-4 shadow-sm border border-zinc-700/50"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-500">
            <FileUp className="w-4 h-4" />
          </div>
          <span>Knowledge Base</span>
        </Link>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-1 mb-2">History</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex flex-col gap-2 px-2 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No chats yet</p>
            <p className="text-zinc-600 text-xs mt-1">Start a conversation!</p>
          </div>
        ) : (
          history.map(chat => (
            <div key={chat._id} onClick={() => onSelectChat(chat)}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800 cursor-pointer transition mb-1">
              <MessageSquare className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{chat.query}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-zinc-600" />
                  <p className="text-xs text-zinc-600">
                    {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button onClick={e => handleDelete(e, chat._id)} disabled={deleting === chat._id}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition shrink-0">
                {deleting === chat._id
                  ? <span className="w-3.5 h-3.5 border border-zinc-500 border-t-transparent rounded-full animate-spin block" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </Link>
          <button onClick={onLogout} className="text-zinc-600 hover:text-red-400 transition shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
