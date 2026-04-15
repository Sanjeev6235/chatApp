import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

export const AI_BOT_ID = '__ai_aria__';
export const AI_BOT_USER = {
  _id: AI_BOT_ID,
  username: 'Aria AI',
  profilePic: null,
  isOnline: true,
  isAI: true,
};

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Best quality' },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',  desc: 'Fastest' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',  desc: 'Long context' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',    desc: 'Google' },
];

const STORAGE_KEY = 'aria_chat_history';

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveHistory(msgs) {
  try {
    const toSave = msgs.slice(-60).map(m => ({ ...m, loading: false }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

// ── Markdown renderer ────────────────────────────────────────────────
function MarkdownLine({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*'))   return <em key={i}>{p.slice(1,-1)}</em>;
        if (p.startsWith('`') && p.endsWith('`'))   return <code key={i} className="bg-zinc-200 dark:bg-zinc-700 text-amber-600 dark:text-amber-300 px-1 py-0.5 rounded text-xs font-mono">{p.slice(1,-1)}</code>;
        if (p.startsWith('~~') && p.endsWith('~~')) return <del key={i}>{p.slice(2,-2)}</del>;
        return p;
      })}
    </>
  );
}

function renderMarkdown(text) {
  const lines = text.split('\n');
  const output = [];
  let inCode = false, codeLines = [], codeLang = '', listItems = [], listType = null;

  const flushList = () => {
    if (!listItems.length) return;
    if (listType === 'ul') {
      output.push(
        <ul key={`ul${output.length}`} className="list-disc list-inside space-y-0.5 my-1.5 pl-1">
          {listItems.map((li, i) => <li key={i} className="text-sm"><MarkdownLine text={li.text} /></li>)}
        </ul>
      );
    } else {
      output.push(
        <ol key={`ol${output.length}`} className="list-decimal list-inside space-y-0.5 my-1.5 pl-1">
          {listItems.map((li, i) => <li key={i} className="text-sm"><MarkdownLine text={li.text} /></li>)}
        </ol>
      );
    }
    listItems = []; listType = null;
  };

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCode) { flushList(); inCode = true; codeLang = line.slice(3).trim(); codeLines = []; }
      else {
        inCode = false;
        output.push(
          <div key={`cb${idx}`} className="my-2 rounded-xl overflow-hidden border border-zinc-700">
            {codeLang && <div className="bg-zinc-700 text-zinc-300 text-[10px] px-3 py-1 font-mono uppercase tracking-widest">{codeLang}</div>}
            <pre className="bg-zinc-800 text-green-300 text-xs p-3 overflow-x-auto whitespace-pre font-mono leading-relaxed">{codeLines.join('\n')}</pre>
          </div>
        );
        codeLines = []; codeLang = '';
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    const h3 = line.match(/^### (.+)/); if (h3) { flushList(); output.push(<h3 key={idx} className="font-bold text-sm mt-3 mb-1"><MarkdownLine text={h3[1]} /></h3>); return; }
    const h2 = line.match(/^## (.+)/);  if (h2) { flushList(); output.push(<h2 key={idx} className="font-bold text-base mt-3 mb-1"><MarkdownLine text={h2[1]} /></h2>); return; }
    const h1 = line.match(/^# (.+)/);   if (h1) { flushList(); output.push(<h1 key={idx} className="font-bold text-lg mt-3 mb-1"><MarkdownLine text={h1[1]} /></h1>); return; }
    const ul = line.match(/^[-*] (.+)/); if (ul) { if (listType !== 'ul') { flushList(); listType='ul'; } listItems.push({text:ul[1]}); return; }
    const ol = line.match(/^\d+\. (.+)/); if (ol) { if (listType !== 'ol') { flushList(); listType='ol'; } listItems.push({text:ol[1]}); return; }
    if (/^---+$/.test(line.trim())) { flushList(); output.push(<hr key={idx} className="my-2 border-zinc-200 dark:border-zinc-700" />); return; }
    if (line.startsWith('> ')) { flushList(); output.push(<blockquote key={idx} className="border-l-2 border-iris-400 pl-3 my-1 text-zinc-500 dark:text-zinc-400 italic text-sm"><MarkdownLine text={line.slice(2)} /></blockquote>); return; }
    if (line.trim() === '') { flushList(); output.push(<div key={idx} className="h-1.5" />); return; }
    flushList();
    output.push(<p key={idx} className="text-sm leading-relaxed"><MarkdownLine text={line} /></p>);
  });

  flushList();
  return output;
}

// ── CopyButton ───────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
    >
      {copied ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}

// ── AIMessageBubble ──────────────────────────────────────────────────
function AIMessageBubble({ msg }) {
  const { isAI, text, loading, time, model } = msg;
  return (
    <div className={`group flex items-end gap-2 px-4 py-1 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm flex-shrink-0 mb-1 shadow-md">
          🤖
        </div>
      )}
      <div className="max-w-[78%]">
        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isAI ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm border border-zinc-100 dark:border-zinc-700' : 'bg-iris-600 text-white rounded-br-sm'}`}>
          {loading ? (
            <span className="flex items-center gap-1.5 py-0.5">
              {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}} />)}
            </span>
          ) : isAI ? (
            <div className="max-w-none">{renderMarkdown(text)}</div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-0.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isAI && model && <span className="ml-1 opacity-60">· {MODELS.find(m => m.id === model)?.label || model}</span>}
          </span>
          {isAI && !loading && text && <CopyButton text={text} />}
        </div>
      </div>
    </div>
  );
}

// ── ModelSelector ────────────────────────────────────────────────────
function ModelSelector({ model, onChange }) {
  const [open, setOpen] = useState(false);
  const current = MODELS.find(m => m.id === model) || MODELS[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <span className="font-medium">{current.label}</span>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden w-52">
            {MODELS.map(m => (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between ${m.id === model ? 'text-iris-600 dark:text-iris-400 font-semibold bg-iris-50 dark:bg-iris-900/20' : 'text-zinc-700 dark:text-zinc-300'}`}>
                <span>{m.label}</span>
                <span className="text-[10px] text-zinc-400">{m.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Quick Prompts ────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '✍️ Help me write', prompt: 'Help me write a ' },
  { label: '💡 Brainstorm ideas', prompt: 'Brainstorm ideas for ' },
  { label: '🐛 Debug my code', prompt: 'Debug this code:\n```\n\n```' },
  { label: '📖 Explain a concept', prompt: 'Explain ' },
  { label: '🌐 Translate text', prompt: 'Translate this to English: ' },
  { label: '📝 Summarize', prompt: 'Summarize the following:\n\n' },
];

const WELCOME = (username) => ({
  id: 'welcome',
  text: `Hi **${username || 'there'}**! 👋 I'm **Aria**, your AI assistant powered by Groq.\n\nI can help with questions, writing, coding, brainstorming, or just a chat.\n\nWhat's on your mind?`,
  isAI: true, time: Date.now(), model: null,
});

// ── Main component ───────────────────────────────────────────────────
export default function AIChatWindow() {
  const { user } = useSelector((s) => s.auth);
  const [model, setModel] = useState(() => localStorage.getItem('aria_model') || MODELS[0].id);
  const [conversationId] = useState(() => {
    let id = localStorage.getItem('aria_conv_id');
    if (!id) { id = Date.now().toString(); localStorage.setItem('aria_conv_id', id); }
    return id;
  });
  const [messages, setMessages] = useState(() => {
    const hist = loadHistory();
    return hist && hist.length ? hist : [WELCOME(user?.username)];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    saveHistory(messages);
  }, [messages]);

  useEffect(() => { localStorage.setItem('aria_model', model); }, [model]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (override) => {
    const trimmed = (override ?? input).trim();
    if (!trimmed || loading) return;

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, text: trimmed, isAI: false, time: Date.now() },
      { id: 'loading', text: '', isAI: true, loading: true, time: Date.now() },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chat({ message: trimmed, conversationId, model });
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'loading'),
        { id: `a-${Date.now()}`, text: res.data.reply, isAI: true, time: Date.now(), model: res.data.model || model },
      ]);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      const msg = err.response?.data?.message || 'AI unavailable. Check GROQ_API_KEY in server/.env';
      toast.error(msg);
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: `⚠️ ${msg}`, isAI: true, time: Date.now(), model: null }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, conversationId, model]);

  const handleClear = async () => {
    if (!window.confirm('Clear conversation history?')) return;
    try {
      await aiAPI.clearHistory({ conversationId });
      localStorage.removeItem(STORAGE_KEY);
      setMessages([WELCOME(user?.username)]);
      toast.success('Conversation cleared');
    } catch { toast.error('Failed to clear'); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-925">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md flex-shrink-0">🤖</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-white">Aria AI Assistant</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <ModelSelector model={model} onChange={setModel} />
          </div>
        </div>
        <button onClick={handleClear} className="btn-icon text-sm" title="Clear conversation">🗑️</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(110,80,244,0.04) 1px, transparent 0)',backgroundSize:'28px 28px'}}>
        {messages.map(msg => <AIMessageBubble key={msg.id} msg={msg} />)}

        {messages.length <= 1 && (
          <div className="px-4 mt-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2 font-medium">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(p => (
                <button key={p.label} onClick={() => { setInput(p.prompt); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-iris-400 hover:text-iris-600 dark:hover:text-iris-400 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }}
              placeholder="Ask Aria anything… (Enter to send)"
              rows={1}
              disabled={loading}
              className="input resize-none overflow-hidden py-2.5 pr-4 max-h-40 leading-relaxed disabled:opacity-60 text-sm w-full"
              style={{minHeight:'44px'}}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,160)+'px'; }}
            />
          </div>
          <button onClick={() => sendMessage()} disabled={loading||!input.trim()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${input.trim()&&!loading?'bg-gradient-to-br from-violet-500 to-indigo-600 hover:opacity-90 text-white shadow-md active:scale-95':'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'}`}>
            {loading
              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            }
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{Math.max(0, messages.filter(m=>!m.loading).length-1)} messages in context</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Groq · {MODELS.find(m=>m.id===model)?.label}</p>
        </div>
      </div>
    </div>
  );
}
