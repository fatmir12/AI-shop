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
  const storage = `aishop.chat.${user?.id ?? 'guest'}`;
  const [messages, setMessages] = useState(() => read(storage, []));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef(null);
  useEffect(() => {
    write(storage, messages);
    bottom.current?.scrollIntoView({
      behavior: 'smooth',
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
  return <div className="container page assistant-page"><div className="assistant-header"><div><span className="eyebrow">A LITTLE HELP FINDING YOUR THING</span><h1>Your shopping sidekick<span className="heading-dot">.</span></h1><p>Good recommendations start with a conversation.</p></div><button className="btn secondary" disabled={busy} onClick={() => {
        setMessages([]);
        setError('');
      }}><RotateCcw size={16} /> New chat</button></div><div className="chat-panel"><div className="chat-top"><span className="assistant-icon"><Sparkles size={21} /></span><div><strong>AIShop Assistant</strong><small>Catalog-aware · Model-independent</small></div><span className="badge">Shopping, made personal</span></div><div className="messages" aria-live="polite">{!messages.length && <div className="chat-welcome"><span className="ai-orb"><Sparkles size={35} /></span><h2>What are we finding today?</h2><p>Tell me about your needs, your budget, or that thing you’ve had your eye on.</p><div className="suggested-prompts">{['Find headphones under 700 KM', 'Help me upgrade my workspace', 'Show me gifts under 250 KM', 'Compare smart home essentials'].map(prompt => <button key={prompt} onClick={() => void send(prompt)}>{prompt} ↗</button>)}</div></div>}{messages.map(m => <div key={m.id} className={`message message-${m.role}`}><span className="message-avatar">{m.role === 'assistant' ? <Sparkles size={17} /> : user?.firstName[0] ?? 'You'}</span><div><span className="message-author">{m.role === 'assistant' ? 'AIShop Assistant' : 'You'}</span><p>{m.content}</p>{!!m.products?.length && <div className="recommendations">{m.products.map(p => <ProductCard key={p.id} product={p} />)}</div>}</div></div>)}{busy && <div className="message"><span className="assistant-icon"><Sparkles size={18} /></span><p className="typing" role="status">Finding your fit<span>•••</span></p></div>}{error && <div className="form-error" role="alert">{error} <button onClick={() => void send(input)}>Retry</button></div>}<div ref={bottom} /></div><form className="chat-input" onSubmit={e => {
        e.preventDefault();
        void send(input);
      }}><input aria-label="Message the shopping assistant" value={input} onChange={e => setInput(e.target.value)} placeholder="I’m looking for something that…" maxLength={1000} disabled={busy} /><button className="btn" aria-label="Send message" disabled={busy || !input.trim()}><Send size={19} /></button></form><p className="chat-disclaimer">Recommendations are guidance. Always check product details before ordering.</p></div></div>;
}
