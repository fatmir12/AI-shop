import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ArrowLeft } from 'lucide-react';
import { useApp } from '../app/context';
import '../admin.css';

const links = [
  ['/admin', 'Pregled'], ['/admin/products', 'Proizvodi'],
  ['/admin/orders', 'Narudžbe'], ['/admin/categories', 'Kategorije'],
  ['/admin/users', 'Korisnici']
];

export default function AdminLayout() {
  const { user, logout, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuButton = useRef(null);
  const menu = useRef(null);
  const active = links.find(([to]) => to === location.pathname)?.[1] ?? 'Pregled';
  const closeMenu = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  useEffect(() => { document.title = `AIShop · Administracija · ${active}`; }, [active]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => menu.current?.querySelector('a')?.focus());
    const onKey = event => {
      if (event.key === 'Escape') closeMenu();
      if (event.key !== 'Tab') return;
      const items = menu.current?.querySelectorAll('a, button:not(:disabled)');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const media = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    media.addEventListener('change', closeOnDesktop);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      media.removeEventListener('change', closeOnDesktop);
    };
  }, [open, closeMenu]);

  const signOut = async () => {
    setSigningOut(true);
    try { await logout(); navigate('/login'); }
    catch (error) { notify(error.message, true); }
    finally { setSigningOut(false); }
  };

  return <div className={`admin-shell admin-v2 aishop-ui${open ? ' admin-menu-open' : ''}`}>
    <a className="admin-skip" href="#admin-main">Preskoči na sadržaj</a>
    {open && <button className="admin-menu-backdrop" aria-label="Zatvori navigaciju" onClick={closeMenu} tabIndex={-1} />}
    <aside ref={menu} id="admin-navigation" className={`admin-sidebar${open ? ' open' : ''}`} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label="Administratorska navigacija">
      <div className="admin-brand-row"><Link to="/admin" className="admin-brand" onClick={closeMenu}>AIShop</Link><button className="admin-mobile-close icon-btn" aria-label="Zatvori navigaciju" onClick={closeMenu}><X size={20} /></button></div>
      <span className="admin-sidebar-caption">ADMINISTRACIJA</span>
      <div className="admin-sidebar-divider" />
      <span className="admin-sidebar-caption">RADNI PROSTOR</span>
      <nav>{links.map(([to, label]) => <NavLink key={to} to={to} end onClick={closeMenu}>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><Link to="/"><ArrowLeft size={15} />Otvori prodavnicu</Link><button disabled={signingOut} onClick={signOut}><LogOut size={15} />{signingOut ? 'Odjava…' : 'Odjavi se'}</button><small>AIShop · {new Date().getFullYear()}</small></div>
    </aside>
    <div className="admin-content" inert={open || undefined}><header className="admin-header">
      <div className="admin-header-location"><button ref={menuButton} className="admin-menu-button icon-btn" onClick={() => setOpen(!open)} aria-label="Otvori navigaciju" aria-expanded={open} aria-controls="admin-navigation"><Menu size={19} /></button><span>Administracija <span className="admin-breadcrumb-divider">/</span> {active}</span></div>
      <div className="admin-identity"><span>{user?.firstName} {user?.lastName}</span><span className="badge">Administrator</span></div>
    </header><main id="admin-main" className="admin-main" tabIndex={-1}><Outlet /></main></div>
  </div>;
}
