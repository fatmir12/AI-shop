import { claimRequest } from '../utils/assistant.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { t } from "../i18n/bs.js";
import { useRef, useState, useEffect } from 'react';
import { Sparkles, Send, RotateCcw } from 'lucide-react';
import { useApp } from '../app/context';
import { service } from '../services';
import { read, write, errorMessage } from '../utils/shop';
import { ProductCard } from './products';
export function Assistant() {
  const {
    user
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(new Set());
  const storage = `aishop.chat.${user?.id ?? 'guest'}`;
  const [messages, setMessages] = useState(() => read(storage, []));
  const [historyIds] = useState(() => new Set(messages.map(message => message.id)));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef(null);
  useEffect(() => {
    write(storage, messages);
    bottom.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'end'
    });
  }, [messages, busy, storage]);
  const send = async prompt => {
    if (!prompt.trim() || busy) return;
    setInput('');
    setError('');
    setMessages(m => [...m, {
      id: Date.now(),
      role: 'user',
      content: prompt.trim()
    }]);
    setBusy(true);
    try {
      const response = await service.chat(prompt);
      setMessages(m => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        ...response
      }]);
    } catch (e) {
      setError(errorMessage(e));
      setInput(prompt);
    } finally {
      setBusy(false);
    }
  };
  const incoming = location.state?.assistantRequest;
  useEffect(() => {
    if (!claimRequest(incoming, busy, handled.current)) return;
    navigate(location.pathname, { replace: true, state: null });
    void send(incoming.prompt);
  });
  return <div className="container page assistant-page"><div className="assistant-header"><div><span className="eyebrow">{t("A LITTLE HELP FINDING YOUR THING")}</span><h1>{t("Your shopping sidekick")}<span className="heading-dot">.</span></h1><p>{t("Good recommendations start with a conversation.")}</p></div><button className="btn secondary" disabled={busy} onClick={() => {
        setMessages([]);
        setError('');
      }}><RotateCcw size={16} />{t("New chat")}</button></div><div className="chat-panel"><div className="chat-top"><span className="assistant-icon"><Sparkles size={21} /></span><div><strong>{t("AIShop Assistant")}</strong><small>{t("Catalog-aware \xB7 Model-independent")}</small></div><span className="badge">{t("Shopping, made personal")}</span></div><div className="messages" aria-live="polite">{!messages.length && <div className="chat-welcome"><span className="ai-orb"><Sparkles size={35} /></span><h2>{t("What are we finding today?")}</h2><p>{t("Tell me about your needs, your budget, or that thing you\u2019ve had your eye on.")}</p><div className="suggested-prompts">{[t("Find headphones under 700 KM"), t("Help me upgrade my workspace"), t("Show me gifts under 250 KM"), t("Compare smart home essentials")].map(prompt => <button key={prompt} onClick={() => void send(prompt)}>{prompt} ↗</button>)}</div></div>}{messages.map(m => <div key={m.id} className={`message message-${m.role}${historyIds.has(m.id) ? '' : ' message-new'}`}><span className="message-avatar">{m.role === 'assistant' ? <Sparkles size={17} /> : user?.firstName[0] ?? t("You")}</span><div><span className="message-author">{m.role === 'assistant' ? t("AIShop Assistant") : t("You")}</span><p>{m.content}</p>{!!m.products?.length && <div className="recommendations">{m.products.map(p => <ProductCard key={p.id} product={p} />)}</div>}</div></div>)}{busy && <div className="message"><span className="assistant-icon"><Sparkles size={18} /></span><p className="typing" role="status">{t("Finding your fit")}<span>•••</span></p></div>}{error && <div className="form-error" role="alert">{error} <button onClick={() => void send(input)}>{t("Retry")}</button></div>}<div ref={bottom} /></div><form className="chat-input" onSubmit={e => {
        e.preventDefault();
        void send(input);
      }}><input aria-label={t("Message the shopping assistant")} value={input} onChange={e => setInput(e.target.value)} placeholder={t("I\u2019m looking for something that\u2026")} maxLength={1000} disabled={busy} /><button className="btn" aria-label={t("Send message")} disabled={busy || !input.trim()}><Send size={19} /></button></form><p className="chat-disclaimer">{t("Recommendations are guidance. Always check product details before ordering.")}</p></div></div>;
}
