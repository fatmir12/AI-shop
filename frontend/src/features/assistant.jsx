import { chatReturnRoute, isChatAuthRoute } from '../utils/chatNavigation.js';
import PendingCartAction from './PendingCartAction.jsx';
import AiStatus from './AiStatus.jsx';
import { claimRequest } from '../utils/assistant.js';
import { requestGate, conversationTitle } from '../utils/conversations.js';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { t } from '../i18n/bs.js';
import { useRef, useState, useEffect } from 'react';
import { Sparkles, Send, Plus, PanelLeft, MoreHorizontal, Trash2, X, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../app/context';
import { service, isMock } from '../services';
import { read, write, errorMessage } from '../utils/shop';
import { ProductCard } from './products';

export function Assistant() {
  const { user, initializing } = useApp();
  const { pathname } = useLocation();
  // Unmount transient chat UI in auth flows; persisted conversations stay intact.
  // The identity key also discards the previous user's UI and pending callbacks.
  if (initializing || isChatAuthRoute(pathname)) return null;
  return <AssistantShell key={`${isMock}.${user?.id ?? 'guest'}`} user={user} />;
}
function AssistantShell({ user }) {
  const location = useLocation(), navigate = useNavigate();
  const full = location.pathname.replace(/\/$/, '') === '/assistant';
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(full);
  const launcher = useRef(null), panel = useRef(null);
  const [wasFull, setWasFull] = useState(full);
  const returnRoute = useRef('/');
  const close = () => { setOpen(false); launcher.current?.focus() };
  // Reconcile presentation during render so route changes never unmount the chat.
  if (wasFull !== full) {
    setWasFull(full);
    if (full) { setStarted(true); setOpen(false) }
    else setOpen(isMock || !!user);
  }
  useEffect(() => {
    if (!full && open) panel.current?.querySelector('input, button')?.focus();
  }, [full, open]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      const el = panel.current;
      if (!el) return;
      el.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
      el.style.setProperty('--chat-viewport-top', `${viewport.offsetTop + 6}px`);
      el.classList.toggle('keyboard-visible', !full && viewport.height < window.innerHeight - 120);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => { viewport.removeEventListener('resize', resize); viewport.removeEventListener('scroll', resize) };
  }, [full, open]);
  const expand = () => {
    returnRoute.current = chatReturnRoute(location.pathname + location.search + location.hash);
    try { sessionStorage.setItem('aishop.chat.return', returnRoute.current) } catch { /* storage may be unavailable */ }
    navigate('/assistant');
  };
  const minimize = () => {
    let target = returnRoute.current;
    try { target = sessionStorage.getItem('aishop.chat.return') ?? target } catch { /* use in-memory fallback */ }
    setOpen(true);
    navigate(chatReturnRoute(target));
  };
  return <>
    <div ref={panel} hidden={!full && !open} className={full ? '' : 'floating-chat'} role={full ? undefined : 'dialog'} aria-label={full ? undefined : 'AIShop asistent'} onKeyDown={e => { if (!full && e.key === 'Escape') { e.stopPropagation(); close() } }}>
      {(started || open || full) && (isMock || user ? <ConversationChat user={user} compact={!full} close={close} expand={expand} minimize={minimize} /> : <div className="widget-login"><button className="icon-button" aria-label="Zatvori chat" onClick={close}><X size={18} /></button><p><strong>Niste prijavljeni.</strong></p><Link className="widget-login-link" to="/login" onClick={close}>Prijavite se za razgovor sa AIShop asistentom.</Link></div>)}
    </div>
    {!full && <button ref={launcher} className="ai-chat-launcher" aria-label={open ? 'Zatvori AI chat' : 'Otvori AI chat'} aria-expanded={open} onClick={() => { if (open) close(); else { setStarted(true); setOpen(true) } }}>{open ? <X /> : <Sparkles />}</button>}
  </>;
}
function ConversationChat({ user, compact, close, expand, minimize }) {
  const location = useLocation(), navigate = useNavigate();
  const storage = `aishop.conversations.${isMock ? 'mock' : 'api'}.${user?.id ?? 'guest'}`;
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null), [messages, setMessages] = useState([]);
  const [input, setInput] = useState(''), [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false), [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false), [deleteError, setDeleteError] = useState('');
  const activeRef = useRef(null), sending = useRef(false), alive = useRef(true);
  const listGate = useRef(requestGate());
  const gate = useRef(requestGate()), handled = useRef(new Set()), retry = useRef(null);
  const drawer = useRef(null), confirm = useRef(null), scroll = useRef(null), nearBottom = useRef(true);
  const local = useRef(read(storage, []));
  const client = useRef(isMock ? {
    async conversations() { return local.current.map(({ messages: _messages, ...c }) => c).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) },
    async createConversation() {
      const c = { id: crypto.randomUUID(), title: 'Novi razgovor', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
      local.current.unshift(c); write(storage, local.current); return c;
    },
    async conversation(id) { const c = local.current.find(c => c.id === id); return { conversation: c, messages: c?.messages ?? [] } },
    async deleteConversation(id) { local.current = local.current.filter(c => c.id !== id); write(storage, local.current) },
  } : service).current;
  const refresh = async () => { const version = listGate.current.next(); const list = await client.conversations(); if (alive.current && listGate.current.current(version)) setConversations(list) };
  const select = async id => {
    const version = gate.current.next(); activeRef.current = id; setActive(id); setMessages([]); setError('');
    setInput(''); setHistoryOpen(false); drawer.current?.close(); nearBottom.current = true;
    write(`${storage}.active`, id);
    if (!id) { setLoading(false); return }
    setLoading(true);
    try {
      const detail = await client.conversation(id);
      if (alive.current && gate.current.current(version)) setMessages(detail.messages);
    } catch (e) { if (alive.current && gate.current.current(version)) setError(errorMessage(e)) }
    finally { if (alive.current && gate.current.current(version)) setLoading(false) }
  };
  useEffect(() => {
    alive.current = true;
    const viewGate = gate.current;
    void client.conversations().then(list => {
      if (!alive.current) return;
      setConversations(list);
      const previous = read(`${storage}.active`, null);
      if (list.some(c => c.id === previous)) void select(previous); else setLoading(false);
    }).catch(e => { if (alive.current) { setError(errorMessage(e)); setLoading(false) } });
    return () => { alive.current = false; viewGate.next() };
    // Component is remounted on authentication changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (nearBottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busyId, loading, compact]);
  const send = async (prompt, options = {}) => {
    if (!prompt.trim() || sending.current || loading) return;
    sending.current = true;
    let id = activeRef.current;
    const initialView = gate.current.next();
    setError(''); setInput(''); nearBottom.current = true;
    try {
      if (!id) {
        const c = await client.createConversation(); id = c.id;
        if (!alive.current || !gate.current.current(initialView)) return;
        activeRef.current = id; setActive(id); write(`${storage}.active`, id); await refresh();
      }
      const requestId = retry.current?.id === id && retry.current?.prompt === prompt && JSON.stringify(retry.current.options) === JSON.stringify(options)
        ? retry.current.requestId : crypto.randomUUID();
      retry.current = { id, prompt, requestId, options };
      setBusyId(id);
      const userMessage = { id: requestId, role: 'user', content: prompt };
      setMessages(current => [...current, userMessage]);
      const response = await service.chat(prompt, { ...options, conversationId: isMock ? undefined : id, requestId,
        history: messages.map(({ role, content }) => ({ role, content })) });
      if (!alive.current) return;
      if (isMock) {
        const c = local.current.find(c => c.id === id);
        if (c) { c.messages.push(userMessage, { id: crypto.randomUUID(), role: 'assistant', ...response }); c.title = conversationTitle(c.messages[0].content); c.updatedAt = new Date().toISOString(); write(storage, local.current) }
      }
      if (activeRef.current === id) {
        const detail = await client.conversation(id);
        if (alive.current && activeRef.current === id) { setMessages(detail.messages); retry.current = null }
      }
      await refresh();
    } catch (e) {
      if (alive.current && activeRef.current === id) {
        setMessages(current => current.filter(m => m.id !== retry.current?.requestId));
        setError(errorMessage(e)); setInput(prompt);
      }
    } finally { sending.current = false; if (alive.current) setBusyId(null) }
  };
  const remove = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true); setDeleteError(''); listGate.current.next();
    try {
      await client.deleteConversation(deleting.id);
      if (!alive.current) return;
      listGate.current.next();
      setConversations(current => current.filter(c => c.id !== deleting.id));
      if (activeRef.current === deleting.id) void select(null);
      confirm.current.close(); setDeleting(null);
    } catch (e) { if (alive.current) setDeleteError(errorMessage(e)) }
    finally { if (alive.current) setDeleteBusy(false) }
  };
  const incoming = location.state?.assistantRequest;
  useEffect(() => {
    if (loading || !claimRequest(incoming, busyId !== null, handled.current)) return;
    navigate(location.pathname, { replace: true, state: null }); void send(incoming.prompt);
  });
  const sidebar = <>
    <div className="conversation-heading"><strong>Razgovori</strong><button className="icon-button" aria-label="Zatvori razgovore" onClick={() => { drawer.current?.close(); setHistoryOpen(false); setCollapsed(true) }}><X size={18} /></button></div>
    <button className="btn secondary new-conversation" onClick={() => void select(null)}><Plus size={17} />Novi razgovor</button>
    <nav className="conversation-list" aria-label="Historija razgovora">
      {!conversations.length && <p className="conversation-empty">Vaši razgovori će se pojaviti ovdje.</p>}
      {conversations.map(c => <div className={`conversation-row ${active === c.id ? 'active' : ''}`} key={c.id}>
        <button className="conversation-select" aria-current={active === c.id ? 'page' : undefined} onClick={() => void select(c.id)}><span>{c.title}</span><small>{new Date(c.updatedAt).toLocaleDateString('bs-BA')}</small></button>
        <details className="conversation-menu"><summary aria-label={`Opcije: ${c.title}`}><MoreHorizontal size={18} /></summary><button onClick={e => { e.currentTarget.closest('details').open = false; setDeleteError(''); setDeleting(c); confirm.current.showModal() }}><Trash2 size={14} />Obriši razgovor</button></details>
      </div>)}
    </nav>
  </>;
  return <div className={compact ? `assistant-widget ${historyOpen ? 'widget-history-open' : ''}` : "container page assistant-page"}><div className="assistant-header" hidden={compact}><div><span className="eyebrow">{t('A LITTLE HELP FINDING YOUR THING')}</span><h1>{t('Your shopping sidekick')}<span className="heading-dot">.</span></h1><p>{t('Good recommendations start with a conversation.')}</p></div></div>
    <div className={`assistant-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="conversation-sidebar" aria-label="Razgovori">{sidebar}</aside>
      <dialog ref={drawer} className="conversation-drawer" aria-label="Razgovori">{sidebar}</dialog>
      <div className="chat-panel"><div className="chat-top"><button className="icon-button sidebar-toggle" aria-label="Otvori razgovore" aria-expanded={compact ? historyOpen : undefined} onClick={() => { if (compact) setHistoryOpen(v => !v); else if (window.matchMedia('(max-width: 760px)').matches) drawer.current.showModal(); else setCollapsed(v => !v) }}><PanelLeft size={20} /></button><span className="assistant-icon"><Sparkles size={21} /></span><div><strong>{compact ? 'AIShop asistent' : t('AIShop Assistant')}</strong><small>{compact ? 'Vaš AI pomoćnik za kupovinu' : t('Catalog-aware · Model-independent')}</small></div><div className="chat-window-actions">{compact ? <><button className="icon-button" aria-label="Proširi chat" onClick={expand}><Maximize2 size={18} /></button><button className="icon-button" aria-label="Zatvori chat" onClick={close}><X size={18} /></button></> : <button className="icon-button" aria-label="Minimiziraj chat" onClick={minimize}><Minimize2 size={18} /></button>}</div></div>
      <div className="messages" ref={scroll} onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100 }} aria-busy={loading || busyId === active}>
        {loading ? <p role="status">Učitavam razgovor...</p> : !messages.length && (compact ? <div className="widget-greeting">Zdravo! Ja sam AIShop asistent. Kako vam mogu pomoći pri kupovini?</div> : <div className="chat-welcome"><span className="ai-orb"><Sparkles size={35} /></span><h2>{t('What are we finding today?')}</h2><p>{t('Tell me about your needs, your budget, or that thing you’ve had your eye on.')}</p><div className="suggested-prompts">{['Koje laptope imate?', 'Šta imam u korpi?'].map(prompt => <button key={prompt} disabled={busyId !== null} onClick={() => void send(prompt)}>{prompt} ↗</button>)}</div></div>)}
        {messages.map(m => <div key={m.id} className={`message message-${m.role}`}><span className="message-avatar">{m.role === 'assistant' ? <Sparkles size={17} /> : user?.firstName?.[0] ?? t('You')}</span><div><span className="message-author">{m.role === 'assistant' ? t('AIShop Assistant') : t('You')}</span><p>{m.content}</p>{m.pendingActions?.map(action => <PendingCartAction key={action.actionId} action={action} update={patch => setMessages(current => current.map(message => message.id === m.id ? { ...message, pendingActions: message.pendingActions.map(item => item.actionId === action.actionId ? { ...item, ...patch } : item) } : message))} />)}{!!m.products?.length && <div className="recommendations">{m.products.map(p => <ProductCard key={p.id} product={p} />)}</div>}</div></div>)}
        {busyId !== null && busyId === active && <div className="message"><span className="assistant-icon"><Sparkles size={18} /></span><AiStatus /></div>}
        {error && <div className="form-error" role="alert">{error}<button onClick={() => { if (retry.current?.id === active) void send(retry.current.prompt, retry.current.options); else if (active) void select(active); else void refresh().catch(e => setError(errorMessage(e))) }}>Pokušaj ponovo</button></div>}
      </div><form className="chat-input" onSubmit={e => { e.preventDefault(); void send(input) }}><input aria-label={t('Message the shopping assistant')} value={input} onChange={e => setInput(e.target.value)} placeholder={compact ? 'Pitajte AI asistenta...' : t('I’m looking for something that…')} maxLength={2000} disabled={busyId !== null || loading} /><button className="btn" aria-label={t('Send message')} disabled={busyId !== null || loading || !input.trim()}><Send size={19} /></button></form><p className="chat-disclaimer">{compact ? 'AI asistent može pogriješiti. Provjerite važne informacije prije kupovine.' : 'AI asistent može napraviti grešku. Provjerite važne informacije prije donošenja odluke o kupovini.'}</p></div>
    </div><dialog ref={confirm} className="conversation-confirm" aria-labelledby="delete-conversation-title" onCancel={e => { if (deleteBusy) e.preventDefault(); else setDeleting(null) }}><h2 id="delete-conversation-title">Želite li obrisati ovaj razgovor?</h2><p>Razgovor i njegove poruke bit će trajno obrisani.</p>{deleteError && <p role="alert" className="form-error">{deleteError}</p>}<div className="pending-actions"><button className="btn secondary" disabled={deleteBusy} onClick={() => { confirm.current.close(); setDeleting(null) }}>Odustani</button><button className="btn" disabled={deleteBusy} onClick={() => void remove()}>{deleteBusy ? 'Brisanje...' : 'Obriši'}</button></div></dialog>
  </div>;
}
