import { categoryNavigation, allProductsNavigation } from '../utils/navigation.js';
import { t } from "../i18n/bs.js";
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Search, ShoppingBag, UserRound, ArrowUpRight, Menu, X, Truck, ShieldCheck, Headphones } from 'lucide-react';
import { useApp } from '../app/context';
import '../storefront.css';
import { Assistant } from '../features/assistant.jsx';
import { useCategories } from '../features/products.jsx';
function Logo() {
  return <Link to="/" className="logo" aria-label="AIShop — početna stranica"><img className="brand-image" src="/aishop-logo-transparent.png" alt="AIShop" width="120" height="80" fetchPriority="high" /></Link>;
}
export function StoreLayout() {
  const {
    user,
    cart,
    logout,
    notify
  } = useApp();
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const categories = useCategories();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return <div className="storefront-theme aishop-ui"><a className="store-skip" href="#store-main">Preskoči na sadržaj</a><header className="store-header"><div className="container nav-main"><Logo /><Link className="icon-btn nav-search-link" to="/products" aria-label={t("Search products")}><Search size={20} /></Link><div className="nav-actions"><Link to={user?.role === 'ADMIN' ? '/admin' : user ? '/account' : '/login'} className="account-link" aria-label={user?.role === 'ADMIN' ? 'Administratorski panel' : user ? 'Moj korisnički račun' : 'Prijava'}><UserRound size={21} /><span>{user ? user.firstName : t("Sign in")}</span></Link><Link className="bag-link" to="/cart" aria-label={`Korpa: ${cart.totalItems} proizvoda`}><ShoppingBag size={22} /><b>{cart.totalItems}</b></Link><button ref={toggle} className="mobile-toggle icon-btn" aria-label={t("Toggle navigation")} aria-expanded={open} aria-controls="store-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div><nav id="store-navigation" className={`container nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}><NavLink to="/" end>{t("Home")}</NavLink><Link to="/products" className={allProductsNavigation(pathname, search) ? 'active' : ''} aria-current={allProductsNavigation(pathname, search) ? 'page' : undefined}>{t("Shop all")}</Link>{categories.data?.map(category => <Link key={category.id} to={`/products?category=${category.id}`} className={categoryNavigation(pathname, search, category.id) ? 'active' : ''} aria-current={categoryNavigation(pathname, search, category.id) ? 'page' : undefined}>{category.name}</Link>)}<NavLink className="ai-link" to="/assistant"><Sparkles size={16} />{t("AI Assistant")}<span>{t("Try it")}</span></NavLink>{user && <button className="logout" onClick={() => {
          void logout().then(() => navigate('/')).catch(e => notify(e.message, true));
        }}>{t("Sign out")}</button>}</nav></header><main id="store-main" tabIndex={-1}><Assistant /><Outlet /></main><footer><div className="container footer-grid"><div><Logo /><p>{t("Laptopi, telefoni i ra\u010Dunarska oprema.")}</p></div><div><strong>{t("Prodavnica")}</strong><Link to="/products">{t("Svi proizvodi")}</Link><Link to="/assistant">{t("AI asistent")}</Link><Link to="/cart">{t("Korpa")}</Link></div><div><strong>{t("Korisni\u010Dki ra\u010Dun")}</strong><Link to="/account">{t("Moj profil")}</Link><Link to="/account/orders">{t("Moje narud\u017Ebe")}</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} AIShop</span><span>{t("Bosna i Hercegovina \xB7 BAM (KM)")}</span></div></footer></div>;
}
export { default as AdminLayout } from './AdminLayout.jsx';
