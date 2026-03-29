import React, { useState } from 'react';
import { Sparkles, User, ChevronDown, ChevronUp, Zap, FileText } from 'lucide-react';

export default function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-3 py-4 animate-slide-up ${isAssistant ? 'items-start' : 'items-start justify-end'}`}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${!isAssistant ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isAssistant
            ? message.error ? 'bg-red-950/50 border border-red-800/50 text-red-300' : 'bg-zinc-800 text-zinc-100'
            : 'bg-brand-600 text-white ml-auto'}`}>
          {message.content}
        </div>
        {isAssistant && !message.error && (
          <div className="flex items-center gap-3 mt-2 px-1">
            {message.fromCache && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <Zap className="w-3 h-3" /> Cached
              </span>
            )}
            {message.processingTime && (
              <span className="text-xs text-zinc-600">{(message.processingTime / 1000).toFixed(1)}s</span>
            )}
            {message.sources?.length > 0 && (
              <button onClick={() => setShowSources(s => !s)}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition">
                <FileText className="w-3 h-3" />
                {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
        {showSources && message.sources?.length > 0 && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {message.sources.map((src, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-xs font-medium text-brand-400">{src.source}</span>
                  {src.page != null && <span className="text-xs text-zinc-600">· page {src.page + 1}</span>}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{src.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-zinc-300" />
        </div>
      )}
    </div>
  );
}
