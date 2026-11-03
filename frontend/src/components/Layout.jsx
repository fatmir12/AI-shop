import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Sparkles, Search, ShoppingBag, UserRound, ArrowUpRight, Menu, X, LayoutDashboard, Package, Tags, Users, ClipboardList, LogOut, Truck, ShieldCheck, Headphones } from 'lucide-react';
import { useApp } from '../app/context';
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
  const navigate = useNavigate();
  return <><div className="announcement">A little smarter. A lot more you. <span>Meet your AI shopping companion <ArrowUpRight size={13} /></span><small>{isMock ? 'DEVELOPMENT · MOCK MODE' : 'LIVE API MODE'}</small></div><header className="store-header"><div className="container nav-main"><Logo /><form className="nav-search" onSubmit={e => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          navigate(`/products?q=${encodeURIComponent(String(data.get('q')))}`);
        }}><Search size={18} /><input name="q" aria-label="Search products" placeholder="Search for your next favorite thing..." /><kbd>↵</kbd></form><div className="nav-actions"><Link to={user?.role === 'ADMIN' ? '/admin' : user ? '/account' : '/login'} className="account-link"><UserRound size={21} /><span>{user ? user.firstName : 'Sign in'}</span></Link><Link className="bag-link" to="/cart" aria-label={`Shopping bag, ${cart.totalItems} items`}><ShoppingBag size={22} /><b>{cart.totalItems}</b></Link><button className="mobile-toggle icon-btn" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div><nav className={`container nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}><NavLink to="/" end>Home</NavLink><NavLink to="/products">Shop all</NavLink><Link to="/products?category=1">Audio</Link><Link to="/products?category=2">Computers</Link><Link to="/products?category=3">Accessories</Link><Link to="/products?category=4">Smart home</Link><NavLink className="ai-link" to="/assistant"><Sparkles size={16} /> AI Assistant <span>Try it</span></NavLink>{user && <button className="logout" onClick={() => {
          void logout().then(() => navigate('/')).catch(e => notify(e.message, true));
        }}>Sign out</button>}</nav></header><main><Outlet /></main><section className="benefits container"><div><Truck /><span><strong>Thoughtfully delivered</strong><small>Free delivery on every demo order</small></span></div><div><ShieldCheck /><span><strong>Shop with confidence</strong><small>Transparent prices, always in KM</small></span></div><div><Headphones /><span><strong>A little help, anytime</strong><small>Your AI assistant is one click away</small></span></div></section><footer><div className="container footer-grid"><div><Logo /><p>Good finds. Smarter choices.<br />Everyday essentials, picked for you.</p></div><div><strong>Explore</strong><Link to="/products">All products</Link><Link to="/assistant">AI shopping assistant</Link><Link to="/cart">Shopping bag</Link></div><div><strong>Your space</strong><Link to="/account">My account</Link><Link to="/account/orders">My orders</Link><Link to="/login">Sign in</Link></div><div><strong>Built for a smarter everyday.</strong><p>A curated selection of technology<br />that fits into your life.</p><span className="badge">{isMock ? 'Demo experience · No real payments' : 'Connected to Spring Boot'}</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} AIShop. A smarter kind of shopping.</span><span>Bosnia & Herzegovina · BAM (KM)</span></div></footer></>;
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
    label: 'Overview',
    Icon: LayoutDashboard
  }, {
    to: '/admin/products',
    label: 'Products',
    Icon: Package
  }, {
    to: '/admin/categories',
    label: 'Categories',
    Icon: Tags
  }, {
    to: '/admin/orders',
    label: 'Orders',
    Icon: ClipboardList
  }, {
    to: '/admin/users',
    label: 'Customers',
    Icon: Users
  }];
  return <div className="admin-shell"><aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}><Logo /><span className="eyebrow">WORKSPACE</span><nav>{links.map(({
          to,
          label,
          Icon
        }) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}</nav><div className="sidebar-bottom"><Link to="/">← Visit storefront</Link><button onClick={() => void logout().finally(() => navigate('/login'))}><LogOut size={18} /> Sign out</button><small>AIShop Administration</small></div></aside><div className="admin-content"><header className="admin-header"><button className="mobile-toggle icon-btn" onClick={() => setOpen(!open)} aria-label="Toggle sidebar"><Menu /></button><span>Workspace <span className="muted">/ Administration</span></span><div><span className="badge">{isMock ? 'Development mock' : 'API mode'}</span><span className="avatar">{user?.firstName[0]}</span></div></header><main className="admin-main"><Outlet /></main></div></div>;
}
