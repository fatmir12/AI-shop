import { statusLabel } from '../i18n/bs.js';
import { t } from "../i18n/bs.js";
import { useEffect, useRef } from 'react';
import { AlertCircle, PackageOpen, X } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Field({
  label,
  ...props
}) {
  return <label className="field"><span>{label}</span><input onInvalid={event => event.currentTarget.setCustomValidity("Provjerite unesenu vrijednost i popunite obavezno polje.")} onInput={event => event.currentTarget.setCustomValidity("")} {...props} /></label>;
}
export function Loading() {
  return <div className="grid products" aria-label={t("Loading products")} role="status">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" />)}</div>;
}
export function Empty({
  title = t("Nothing here yet"),
  text = t("Try changing your search or filters."),
  children
}) {
  return <div className="empty"><PackageOpen size={40} /><h3>{title}</h3><p>{text}</p>{children}</div>;
}
export function ErrorState({
  error,
  retry
}) {
  return <div className="error" role="alert"><AlertCircle /><div><strong>{t("We couldn\u2019t load this")}</strong><p>{error?.message ?? t("Please try again.")}</p>{retry && <button className="btn secondary" onClick={retry}>{t("Try again")}</button>}</div></div>;
}
export function Modal({
  title,
  children,
  close
}) {
  const ref = useRef(null);
  const dismissing = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const dismiss = () => {
    const dialog = ref.current;
    if (!dialog || dismissing.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !dialog.animate) { close(); return; }
    dismissing.current = true;
    const animation = dialog.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(4px)' }], { duration: 160, easing: 'ease-out' });
    animation.finished.then(() => { if (dialog.isConnected) close(); }).catch(() => {}).finally(() => { dismissing.current = false; });
  };
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); dismiss(); }} onClick={e => {
    if (e.target === e.currentTarget) dismiss();
  }}><div className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={dismiss} aria-label={t("Close dialog")}><X /></button></div>{children}</dialog>;
}
export function Image({
  src,
  alt,
  className = ''
}) {
  return <img className={className} src={src || '/product-fallback.svg'} alt={alt} loading="lazy" onError={e => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = '/product-fallback.svg';
  }} />;
}
export function Status({
  status
}) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
export function Missing({
  unauthorized = false
}) {
  return <div className="container page empty"><span className="eyebrow">{unauthorized ? t("403 \xB7 Access restricted") : t("404 \xB7 Off the beaten path")}</span><h1>{unauthorized ? t("This space needs a different role.") : t("We couldn\u2019t find that page.")}</h1><p>{unauthorized ? t("Sign in with an account that has access to this area.") : t("Let\u2019s get you back to something good.")}</p><Link className="btn" to="/">{t("Back to the shop")}</Link></div>;
}
