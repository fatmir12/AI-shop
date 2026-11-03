import { authDestination, authReturnState } from '../utils/authNavigation.js';
import { t } from "../i18n/bs.js";
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
    from: location.pathname + location.search, returnState: location.state
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
      setError(t("Password recovery is not available in this development build. Use a demo account or contact your administrator."));
      return;
    }
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (register && (new TextEncoder().encode(data.password).length > 72 || !data.firstName.trim() || !data.lastName.trim())) {
      setError(t("Names are required and password must be at most 72 UTF-8 bytes."));
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
      navigate(authDestination(location.state, u.role), { replace: true, state: authReturnState(location.state) });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (user && !initializing && !forgot) return <Navigate to={authDestination(location.state, user.role)} state={authReturnState(location.state)} replace />;
  return <div className="container auth-page"><div className="auth-story"><span className="hero-label"><Sparkles size={16} />{t("YOUR EVERYDAY, UPGRADED")}</span><h1>{t("Good to")}<br />{t("have you here")}<span>.</span></h1><p>{t("Your favorite finds, thoughtful recommendations, and a smarter way to shop. All in one place.")}</p><div className="auth-art"><ShoppingShape /></div></div><div className="auth-form"><span className="eyebrow">{t("YOUR AISHOP SPACE")}</span><h2>{forgot ? t("Forgot your password?") : register ? t("Make yourself at home.") : t("Welcome back.")}</h2><p>{forgot ? t("Account recovery information") : register ? t("Create an account to start your collection.") : t("Sign in and pick up where you left off.")}</p><form onSubmit={submit}>{register && <div className="form-row"><Field label={t("First name")} name="firstName" required maxLength={100} autoComplete="given-name" /><Field label={t("Last name")} name="lastName" required maxLength={100} autoComplete="family-name" /></div>}<Field label={t("Email address")} name="email" type="email" required maxLength={255} autoComplete="email" placeholder={t("you@example.com")} />{!forgot && <Field label={t("Password")} name="password" type="password" required minLength={register ? 8 : undefined} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} placeholder={t("Enter your password")} />}{!register && !forgot && <Link className="forgot-link" to="/forgot-password">{t("Forgot password?")}</Link>}{error && <div className="form-error" role="alert">{error}</div>}<button className="btn full" disabled={busy}>{busy ? t("Please wait\u2026") : forgot ? t("View recovery options") : register ? t("Create account") : t("Sign in")}<ArrowRight size={17} /></button></form><p className="auth-switch">{register ? t("Already part of AIShop?") : t("New around here?")} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? t("Sign in") : t("Create an account")}</Link></p>{isMock && <div className="demo-credentials"><strong>{t("Development-only demo accounts")}</strong><p>{t("Customer: user@aishop.test / User123!")}</p><p>{t("Admin: admin@aishop.test / Admin123!")}</p><small>{t("New mock passwords stay in memory until reload. No real payments or authentication.")}</small></div>}</div></div>;
}
function ShoppingShape() {
  return <><Sparkles size={64} strokeWidth={1} /><span>{t("Thoughtful finds.")}<br />{t("Made for you.")}</span></>;
}

export function RequireApiUser() { return isMock ? <Outlet /> : <Protected />; }
