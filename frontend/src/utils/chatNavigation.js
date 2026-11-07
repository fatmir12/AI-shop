// Only known storefront routes can be used as the widget's return destination.
export function chatReturnRoute(value) {
  if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || /[\\\s]/.test(value)) return '/';
  const path = value.split(/[?#]/)[0];
  return /^(?:\/|\/products(?:\/\d+)?|\/cart|\/checkout|\/account(?:\/orders(?:\/\d+)?)?)$/.test(path) ? value : '/';
}

// These are the authentication routes registered by App.jsx.
export function isChatAuthRoute(pathname) {
  return ['/login', '/register', '/forgot-password'].includes(pathname.replace(/\/+$/, '').toLowerCase());
}
