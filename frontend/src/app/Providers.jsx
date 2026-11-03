import { t } from "../i18n/bs.js";
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { service, isMock } from '../services';
import { total, errorMessage } from '../utils/shop';
import { AppContext } from './context';
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
});
function StateProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [toast, setToast] = useState(null);
  const cache = useQueryClient();
  useEffect(() => {
    let active = true;
    service.initialize().then(u => {
      if (active) setUser(u);
    }).catch(() => {}).finally(() => {
      if (active) setInitializing(false);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const query = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => service.cart(),
    enabled: !initializing && (isMock || !!user)
  });
  useEffect(() => {
    const expired = () => {
      setUser(null);
      cache.clear();
      setToast({
        text: t("Your session has expired. Please sign in again."),
        error: true
      });
    };
    window.addEventListener('aishop:session-expired', expired);
    return () => window.removeEventListener('aishop:session-expired', expired);
  }, [cache]);
  const notify = (text, error = false) => setToast({
    text,
    error
  });
  const authenticate = async (input, register = false) => {
    const next = register ? await service.register(input) : await service.login(input);
    cache.clear();
    setUser(next);
    return next;
  };
  const changeCart = async (operation, message) => {
    try {
      const cart = await operation();
      cache.setQueryData(['cart', user?.id], cart);
      if (message) notify(message);
    } catch (e) {
      notify(errorMessage(e), true);
      throw e;
    }
  };
  return <AppContext.Provider value={{
    user,
    setUser,
    initializing,
    cart: query.data ?? total([]),
    cartLoading: query.isFetching,
    notify,
    login: input => authenticate(input),
    register: input => authenticate(input, true),
    logout: async () => {
      try {
        await service.logout();
      } finally {
        setUser(null);
        cache.clear();
      }
    },
    add: (product, quantity = 1) => changeCart(() => service.addCart(product.id, quantity), `${product.name}: proizvod je dodan u korpu.`),
    update: (id, quantity) => changeCart(() => service.updateCart(id, quantity)),
    remove: id => changeCart(() => service.removeCart(id), t("Item removed"))
  }}>{children}{query.isError && <div className="global-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>{t("Retry cart")}</button></div>}{toast && <div role={toast.error ? 'alert' : 'status'} className={`toast ${toast.error ? 'toast-error' : ''}`}>{toast.error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}<span>{toast.text}</span><button aria-label={t("Dismiss notification")} onClick={() => setToast(null)}><X size={18} /></button></div>}</AppContext.Provider>;
}
export default function Providers({
  children
}) {
  return <QueryClientProvider client={client}><StateProvider>{children}</StateProvider></QueryClientProvider>;
}
