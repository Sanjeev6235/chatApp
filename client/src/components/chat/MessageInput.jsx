import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import EmojiPicker from 'emoji-picker-react';
import { useSocket } from '../../context/SocketContext';
import { fileToBase64 } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { aiAPI } from '../../services/api';

const SLASH_COMMANDS = [
  { cmd: '/ask',       desc: 'Ask AI a quick question',       placeholder: '/ask What is...' },
  { cmd: '/translate', desc: 'Translate text with AI',        placeholder: '/translate Hello to Spanish' },
  { cmd: '/summarize', desc: 'Summarize text with AI',        placeholder: '/summarize <your text>' },
  { cmd: '/improve',   desc: 'Improve your message with AI',  placeholder: '/improve <your text>' },
];

export default function MessageInput({ replyTo, onClearReply, editingMsg, onCancelEdit }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [aiResult, setAiResult] = useState(null);      // { query, reply, loading }
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const { selectedUser } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const { sendMessage, emitTyping, editMessage: socketEdit } = useSocket();
  const isDark = document.documentElement.classList.contains('dark');

  // Pre-fill when editing
  useEffect(() => {
    if (editingMsg) {
      setText(editingMsg.text);
      inputRef.current?.focus();
    }
  }, [editingMsg]);

  const handleTyping = useCallback((val) => {
    setText(val);
    // Show slash command menu when user types '/'
    setShowSlashMenu(val === '/');
    // Hide slash menu when they continue typing past a command
    if (val.length > 1 && !SLASH_COMMANDS.some(c => val.startsWith(c.cmd))) {
      setShowSlashMenu(false);
    }
    if (!selectedUser) return;
    emitTyping(selectedUser._id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(selectedUser._id, false), 1200);
  }, [selectedUser, emitTyping]);

  // Handle slash command execution
  const runSlashCommand = useCallback(async (inputText) => {
    const match = SLASH_COMMANDS.find(c => inputText.startsWith(c.cmd + ' ') || inputText === c.cmd);
    if (!match) return false;
    const arg = inputText.slice(match.cmd.length).trim();
    if (!arg) { toast('Type something after ' + match.cmd); return true; }

    let prompt = arg;
    if (match.cmd === '/translate') prompt = `Translate the following text. Detect source language automatically and translate to the target language specified (or English if not specified). Only reply with the translation, no explanations:\n\n${arg}`;
    if (match.cmd === '/summarize') prompt = `Summarize the following concisely in 2-3 sentences:\n\n${arg}`;
    if (match.cmd === '/improve')   prompt = `Improve the following text to be clearer and more professional. Only reply with the improved version:\n\n${arg}`;
    if (match.cmd === '/ask')       prompt = arg;

    setAiResult({ query: inputText, reply: '', loading: true });
    setText('');
    try {
      const res = await aiAPI.chat({ message: prompt, conversationId: 'slash-' + (selectedUser?._id || 'default') });
      setAiResult({ query: inputText, reply: res.data.reply, loading: false });
    } catch (err) {
      setAiResult(null);
      toast.error(err.response?.data?.message || 'AI error');
    }
    return true;
  }, [selectedUser]);

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const base64 = await fileToBase64(file);
    setImagePreview(URL.createObjectURL(file));
    setImageBase64(base64);
    setShowEmoji(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imageBase64) return;
    if (!selectedUser) return;

    // Check for slash commands
    if (trimmed.startsWith('/') && !imageBase64) {
      const handled = await runSlashCommand(trimmed);
      if (handled) return;
    }

    setSending(true);
    try {
      if (editingMsg) {
        // Edit mode
        socketEdit({ messageId: editingMsg._id, text: trimmed, receiverId: selectedUser._id });
        onCancelEdit?.();
      } else {
        // Send new message via socket
        sendMessage({
          receiverId: selectedUser._id,
          text: trimmed,
          image: imageBase64 || '',
          replyTo: replyTo?._id || null,
        });
        onClearReply?.();
      }
      setText('');
      clearImage();
      emitTyping(selectedUser._id, false);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onCancelEdit?.();
      onClearReply?.();
    }
  };

  if (!selectedUser) return null;

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      {/* AI Slash Result Panel */}
      {aiResult && (
        <div className="mb-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-violet-100 dark:bg-violet-900/50 border-b border-violet-200 dark:border-violet-800">
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              🤖 AI Result <span className="font-normal opacity-70">— {aiResult.query.split(' ')[0]}</span>
            </span>
            <button onClick={() => setAiResult(null)} className="text-violet-400 hover:text-violet-600 text-lg leading-none">×</button>
          </div>
          {aiResult.loading ? (
            <div className="flex items-center gap-2 px-3 py-3">
              {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}} />)}
              <span className="text-xs text-violet-500">Thinking…</span>
            </div>
          ) : (
            <div className="px-3 py-2.5">
              <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">{aiResult.reply}</p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => { setText(aiResult.reply); setAiResult(null); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Use as message
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(aiResult.reply); toast.success('Copied!'); }}
                  className="text-xs px-3 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Copy
                </button>
                <button onClick={() => setAiResult(null)} className="text-xs px-3 py-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && (
        <div className="mb-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg overflow-hidden">
          <p className="text-[10px] px-3 py-1.5 text-zinc-400 dark:text-zinc-500 font-medium border-b border-zinc-100 dark:border-zinc-700 uppercase tracking-wider">AI Commands</p>
          {SLASH_COMMANDS.map(c => (
            <button key={c.cmd} onClick={() => { setText(c.cmd + ' '); setShowSlashMenu(false); inputRef.current?.focus(); }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3">
              <span className="text-sm font-mono font-semibold text-iris-600 dark:text-iris-400 w-24">{c.cmd}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{c.desc}</span>
            </button>
          ))}
        </div>
      )}
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 pl-3 border-l-2 border-iris-500">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-iris-600 dark:text-iris-400">Replying to</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{replyTo.text || '📷 Image'}</p>
          </div>
          <button onClick={onClearReply} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Edit banner */}
      {editingMsg && (
        <div className="flex items-center gap-2 mb-2 pl-3 border-l-2 border-amber-500">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Editing message</p>
            <p className="text-xs text-zinc-500 truncate">{editingMsg.text}</p>
          </div>
          <button onClick={onCancelEdit} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2">
          <img src={imagePreview} alt="preview" className="h-24 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
          <button onClick={clearImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="btn-icon text-xl"
            title="Emoji"
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={(e) => { setText(t => t + e.emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                theme={isDark ? 'dark' : 'light'}
                height={380}
                width={320}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* Image upload */}
        <button onClick={() => fileRef.current?.click()} className="btn-icon text-xl" title="Send image">
          📎
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="input resize-none overflow-hidden py-2.5 pr-4 max-h-32 leading-relaxed"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && !imageBase64)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
            ${text.trim() || imageBase64
              ? 'bg-iris-600 hover:bg-iris-500 text-white shadow-iris active:scale-95'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Click outside to close emoji */}
      {showEmoji && <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />}
    </div>
  );
}
