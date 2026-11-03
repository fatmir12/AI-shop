import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../app/context';
import { Field, Loading } from '../components/ui';
import { isMock } from '../services';
import { errorMessage } from '../utils/shop';
export function Protected({
  role
}) {
  const {
    user,
    initializing
  } = useApp();
  const location = useLocation();
  if (initializing) return <div className="container page"><Loading /></div>;
  if (!user) return <Navigate to="/login" state={{
    from: location.pathname
  }} replace />;
  if (role && user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
export function AuthPage({
  register = false,
  forgot = false
}) {
  const {
    login,
    register: signup,
    user,
    initializing
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const submit = async e => {
    e.preventDefault();
    setError('');
    if (forgot) {
      setError('Password recovery is not available in this development build. Use a demo account or contact your administrator.');
      return;
    }
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (register && (new TextEncoder().encode(data.password).length > 72 || !data.firstName.trim() || !data.lastName.trim())) {
      setError('Names are required and password must be at most 72 UTF-8 bytes.');
      return;
    }
    setBusy(true);
    try {
      const u = register ? await signup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password
      }) : await login({
        email: data.email,
        password: data.password
      });
      const from = location.state?.from;
      navigate(u.role === 'ADMIN' ? '/admin' : from?.startsWith('/') && !from.startsWith('/admin') ? from : '/account', {
        replace: true
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (user && !initializing && !forgot) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/account'} replace />;
  return <div className="container auth-page"><div className="auth-story"><span className="hero-label"><Sparkles size={16} /> YOUR EVERYDAY, UPGRADED</span><h1>Good to<br />have you here<span>.</span></h1><p>Your favorite finds, thoughtful recommendations, and a smarter way to shop. All in one place.</p><div className="auth-art"><ShoppingShape /></div></div><div className="auth-form"><span className="eyebrow">YOUR AISHOP SPACE</span><h2>{forgot ? 'Forgot your password?' : register ? 'Make yourself at home.' : 'Welcome back.'}</h2><p>{forgot ? 'Account recovery information' : register ? 'Create an account to start your collection.' : 'Sign in and pick up where you left off.'}</p><form onSubmit={submit}>{register && <div className="form-row"><Field label="First name" name="firstName" required maxLength={100} autoComplete="given-name" /><Field label="Last name" name="lastName" required maxLength={100} autoComplete="family-name" /></div>}<Field label="Email address" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@example.com" />{!forgot && <Field label="Password" name="password" type="password" required minLength={register ? 8 : undefined} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} placeholder="Enter your password" />}{!register && !forgot && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}{error && <div className="form-error" role="alert">{error}</div>}<button className="btn full" disabled={busy}>{busy ? 'Please wait…' : forgot ? 'View recovery options' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></button></form><p className="auth-switch">{register ? 'Already part of AIShop?' : 'New around here?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>{isMock && <div className="demo-credentials"><strong>Development-only demo accounts</strong><p>Customer: user@aishop.test / User123!</p><p>Admin: admin@aishop.test / Admin123!</p><small>New mock passwords stay in memory until reload. No real payments or authentication.</small></div>}</div></div>;
}
function ShoppingShape() {
  return <><Sparkles size={64} strokeWidth={1} /><span>Thoughtful finds.<br />Made for you.</span></>;
}
