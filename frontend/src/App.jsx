import MotionEffects from './app/MotionEffects.jsx';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Providers from './app/Providers';
import { StoreLayout, AdminLayout } from './components/Layout';
import { Home, Catalog, ProductDetails } from './features/products';
import { AuthPage, Protected } from './features/auth';
import { Account, Checkout } from './features/account';
import { CartPage } from './features/cart';
import { Assistant } from './features/assistant';
const AdminProducts = lazy(() => import('./features/admin').then(module => ({
  default: module.AdminProducts
})));
const AdminCategories = lazy(() => import('./features/admin').then(module => ({
  default: module.AdminCategories
})));
const AdminOrders = lazy(() => import('./features/admin').then(module => ({
  default: module.AdminOrders
})));
const AdminUsers = lazy(() => import('./features/admin').then(module => ({
  default: module.AdminUsers
})));
const Dashboard = lazy(() => import('./features/admin').then(module => ({
  default: module.Dashboard
})));
import { Missing, Loading } from './components/ui';
import { useApp } from './app/context';
function Scroll() {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `AIShop · ${pathname === '/' ? 'Prodavnica' : 'Katalog i korisnički račun'}`;
  }, [pathname]);
  return null;
}
function ProductRoute() {
  const {
    id
  } = useParams();
  return <ProductDetails key={id} />;
}
function ChatRoute() {
  const {
    user
  } = useApp();
  return <Assistant key={user?.id ?? 'guest'} />;
}
export default function App() {
  return <BrowserRouter><Providers><Scroll /><MotionEffects /><Suspense fallback={<div className="container page"><Loading /></div>}><Routes><Route element={<StoreLayout />}><Route index element={<Home />} /><Route path="products" element={<Catalog />} /><Route path="products/:id" element={<ProductRoute />} /><Route path="cart" element={<CartPage />} /><Route path="assistant" element={<ChatRoute />} /><Route path="login" element={<AuthPage />} /><Route path="register" element={<AuthPage register />} /><Route path="forgot-password" element={<AuthPage forgot />} /><Route element={<Protected role="USER" />}><Route path="checkout" element={<Checkout />} /><Route path="account" element={<Account />} /><Route path="account/orders" element={<Account ordersOnly />} /><Route path="account/orders/:id" element={<Account ordersOnly />} /></Route><Route path="unauthorized" element={<Missing unauthorized />} /><Route path="*" element={<Missing />} /></Route><Route element={<Protected role="ADMIN" />}><Route path="admin" element={<AdminLayout />}><Route index element={<Dashboard />} /><Route path="products" element={<AdminProducts />} /><Route path="categories" element={<AdminCategories />} /><Route path="orders" element={<AdminOrders />} /><Route path="users" element={<AdminUsers />} /><Route path="*" element={<Missing />} /></Route></Route></Routes></Suspense></Providers></BrowserRouter>;
}
