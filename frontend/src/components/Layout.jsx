import { categoryNavigation, allProductsNavigation } from '../utils/navigation.js';
import { t } from "../i18n/bs.js";
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Search, ShoppingBag, UserRound, ArrowUpRight, Menu, X, LayoutDashboard, Package, Tags, Users, ClipboardList, LogOut, Truck, ShieldCheck, Headphones } from 'lucide-react';
import { useApp } from '../app/context';
import AIAssistantBar from './AIAssistantBar.jsx';
import { useCategories } from '../features/products.jsx';
import { isMock } from '../services';
function Logo() {
  return <Link to="/" className="logo"><span><Sparkles size={22} fill="currentColor" /></span>AIShop<span className="logo-dot">.</span></Link>;
}
export function StoreLayout() {
  const {
    user,
    cart,
    logout,
    notify
  } = useApp();
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return <><header className="store-header"><div className="container nav-main"><Logo /><Link className="icon-btn nav-search-link" to="/products" aria-label={t("Search products")}><Search size={20} /></Link><div className="nav-actions"><Link to={user?.role === 'ADMIN' ? '/admin' : user ? '/account' : '/login'} className="account-link"><UserRound size={21} /><span>{user ? user.firstName : t("Sign in")}</span></Link><Link className="bag-link" to="/cart" aria-label={`Korpa: ${cart.totalItems} proizvoda`}><ShoppingBag size={22} /><b>{cart.totalItems}</b></Link><button className="mobile-toggle icon-btn" aria-label={t("Toggle navigation")} aria-expanded={open} aria-controls="store-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div><nav id="store-navigation" className={`container nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}><NavLink to="/" end>{t("Home")}</NavLink><Link to="/products" className={allProductsNavigation(pathname, search) ? 'active' : ''} aria-current={allProductsNavigation(pathname, search) ? 'page' : undefined}>{t("Shop all")}</Link>{categories.data?.map(category => <Link key={category.id} to={`/products?category=${category.id}`} className={categoryNavigation(pathname, search, category.id) ? 'active' : ''} aria-current={categoryNavigation(pathname, search, category.id) ? 'page' : undefined}>{category.name}</Link>)}<NavLink className="ai-link" to="/assistant"><Sparkles size={16} />{t("AI Assistant")}<span>{t("Try it")}</span></NavLink>{user && <button className="logout" onClick={() => {
          void logout().then(() => navigate('/')).catch(e => notify(e.message, true));
        }}>{t("Sign out")}</button>}</nav></header><AIAssistantBar /><main><Outlet /></main><footer><div className="container footer-grid"><div><Logo /><p>{t("Laptopi, telefoni i ra\u010Dunarska oprema.")}</p></div><div><strong>{t("Prodavnica")}</strong><Link to="/products">{t("Svi proizvodi")}</Link><Link to="/assistant">{t("AI asistent")}</Link><Link to="/cart">{t("Korpa")}</Link></div><div><strong>{t("Korisni\u010Dki ra\u010Dun")}</strong><Link to="/account">{t("Moj profil")}</Link><Link to="/account/orders">{t("Moje narud\u017Ebe")}</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} AIShop</span><span>{t("Bosna i Hercegovina \xB7 BAM (KM)")}</span></div></footer></>;
}
export function AdminLayout() {
  const {
    user,
    logout
  } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = [{
    to: '/admin',
    label: t("Overview"),
    Icon: LayoutDashboard
  }, {
    to: '/admin/products',
    label: t("Products"),
    Icon: Package
  }, {
    to: '/admin/categories',
    label: t("Categories"),
    Icon: Tags
  }, {
    to: '/admin/orders',
    label: t("Orders"),
    Icon: ClipboardList
  }, {
    to: '/admin/users',
    label: t("Customers"),
    Icon: Users
  }];
  return <div className="admin-shell"><aside id="admin-navigation" className={open ? 'admin-sidebar open' : 'admin-sidebar'}><Logo /><span className="eyebrow">{t("WORKSPACE")}</span><nav>{links.map(({
          to,
          label,
          Icon
        }) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}</nav><div className="sidebar-bottom"><Link to="/">{t("\u2190 Visit storefront")}</Link><button onClick={() => void logout().finally(() => navigate('/login'))}><LogOut size={18} />{t("Sign out")}</button><small>{t("AIShop Administration")}</small></div></aside><div className="admin-content"><header className="admin-header"><button className="mobile-toggle icon-btn" onClick={() => setOpen(!open)} aria-label={t("Toggle sidebar")} aria-expanded={open} aria-controls="admin-navigation"><Menu /></button><span>{t("Workspace")}<span className="muted">{t("/ Administration")}</span></span><div><span className="badge">{isMock ? t("Development mock") : t("API mode")}</span><span className="avatar">{user?.firstName[0]}</span></div></header><main className="admin-main"><Outlet /></main></div></div>;
}
