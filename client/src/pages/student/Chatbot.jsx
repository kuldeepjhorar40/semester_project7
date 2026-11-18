import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Info, Loader2, Send, Sparkles, Ticket, Trash2, User as UserIcon } from 'lucide-react';
import api, { errMsg } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CategoryBadge, ErrorBanner, PriorityBadge, StatusBadge } from '../../components/ui.jsx';
import { fmtDateTime } from '../../utils/constants.js';

const SUGGESTIONS = [
  'The hostel mess food quality is very poor and unhygienic',
  'My exam hall ticket is not showing on the portal',
  'I paid my fees but it still shows as pending',
  'The college bus on route 7 is late every day',
];

const WELCOME = {
  _id: 'welcome',
  role: 'bot',
  content: "Hi! I'm UniHelp, your grievance assistant. Tell me what's troubling you (exams, hostel, fees, transport, faculty, academics or campus facilities) and I'll file a ticket for you. You can also send a ticket ID like GRV-2026-00001 to check its status.",
};

function TicketCard({ complaint }) {
  return (
    <Link to={`/complaints/${complaint._id}`} className="mt-3 block rounded-xl border border-navy-100 bg-navy-50/60 p-3 transition hover:border-navy-300">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700">
          <Ticket className="h-3.5 w-3.5" /> Ticket created
        </span>
        <StatusBadge status={complaint.status} />
      </div>
      <p className="mt-1.5 font-mono text-base font-bold text-navy-900">{complaint.ticketId}</p>
      <p className="truncate text-sm text-slate-700">{complaint.title}</p>
      <div className="mt-2 flex items-center gap-3">
        <CategoryBadge category={complaint.category} />
        <PriorityBadge priority={complaint.priority} />
      </div>
    </Link>
  );
}

function Message({ m, userName }) {
  const isBot = m.role === 'bot';
  return (
    <div className={`flex animate-pop gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isBot ? 'bg-navy-800 text-gold-400' : 'bg-gold-400 text-navy-950'}`}>
        {isBot ? <Bot className="h-5 w-5" /> : <UserIcon className="h-5 w-5" aria-label={userName} />}
      </div>
      <div className={`max-w-[82%] ${isBot ? '' : 'text-right'}`}>
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed shadow-sm ${
            isBot ? 'rounded-tl-sm border border-slate-200 bg-white text-slate-800' : 'rounded-tr-sm bg-navy-800 text-white'
          }`}
        >
          {m.content}
          {m.complaint && <TicketCard complaint={m.complaint} />}
        </div>
        {m.createdAt && <p className="mt-1 px-1 text-[11px] text-slate-400">{fmtDateTime(m.createdAt)}</p>}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api
      .get('/chat/history')
      .then((r) => {
        setMessages(r.data.messages);
        setAiEnabled(r.data.aiEnabled);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || sending) return;
      setError('');
      setInput('');
      // optimistic bubble
      const temp = { _id: `tmp-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
      setMessages((m) => [...m, temp]);
      setSending(true);
      try {
        const res = await api.post('/chat/message', { message: content });
        setMessages((m) => [...m.filter((x) => x._id !== temp._id), res.data.userMessage, res.data.botMessage]);
      } catch (err) {
        setMessages((m) => m.filter((x) => x._id !== temp._id));
        setInput(content); // give the text back so nothing is lost
        setError(errMsg(err));
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending]
  );

  const clearChat = async () => {
    if (!window.confirm('Clear the chat history? Your filed complaints will NOT be deleted.')) return;
    try {
      await api.delete('/chat/history');
      setMessages([]);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const list = messages.length ? messages : [WELCOME];

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] min-h-[480px] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-card">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 text-gold-400">
          <Sparkles className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">UniHelp Assistant</p>
          <p className="text-xs text-slate-500">{aiEnabled ? 'Powered by Gemini · online' : 'Basic mode · online'}</p>
        </div>
        <button onClick={clearChat} className="btn-ghost !px-3 !py-2 !text-xs" title="Clear chat history" disabled={!messages.length}>
          <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {!aiEnabled && (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Gemini is not configured on the server, so a simpler keyword-based assistant is answering. Add GEMINI_API_KEY to enable full AI understanding.
        </div>
      )}

      {/* messages */}
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          list.map((m) => <Message key={m._id} m={m} userName={user.name} />)
        )}

        {sending && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-gold-400"><Bot className="h-5 w-5" /></div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-blink rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
        {!loading && messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1.5 text-left text-xs font-medium text-navy-700 transition hover:bg-navy-100">
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your issue…  (Enter to send, Shift+Enter for a new line)"
            className="input max-h-32 min-h-[44px] flex-1 resize-none"
            disabled={sending}
          />
          <button onClick={() => send(input)} disabled={sending || !input.trim()} className="btn-primary h-11 w-11 !p-0" aria-label="Send message">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
