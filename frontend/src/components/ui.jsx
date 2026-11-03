import { useEffect, useRef } from 'react';
import { AlertCircle, PackageOpen, X } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Field({
  label,
  ...props
}) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}
export function Loading() {
  return <div className="grid products" aria-label="Loading products" role="status">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" />)}</div>;
}
export function Empty({
  title = 'Nothing here yet',
  text = 'Try changing your search or filters.',
  children
}) {
  return <div className="empty"><PackageOpen size={40} /><h3>{title}</h3><p>{text}</p>{children}</div>;
}
export function ErrorState({
  error,
  retry
}) {
  return <div className="error" role="alert"><AlertCircle /><div><strong>We couldn’t load this</strong><p>{error?.message ?? 'Please try again.'}</p>{retry && <button className="btn secondary" onClick={retry}>Try again</button>}</div></div>;
}
export function Modal({
  title,
  children,
  close
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} onCancel={close} onClick={e => {
    if (e.target === e.currentTarget) close();
  }}><div className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={close} aria-label="Close dialog"><X /></button></div>{children}</dialog>;
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
  return <span className={`status status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}
export function Missing({
  unauthorized = false
}) {
  return <div className="container page empty"><span className="eyebrow">{unauthorized ? '403 · Access restricted' : '404 · Off the beaten path'}</span><h1>{unauthorized ? 'This space needs a different role.' : 'We couldn’t find that page.'}</h1><p>{unauthorized ? 'Sign in with an account that has access to this area.' : 'Let’s get you back to something good.'}</p><Link className="btn" to="/">Back to the shop</Link></div>;
}
