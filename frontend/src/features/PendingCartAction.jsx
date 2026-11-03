import { useRef, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApp } from '../app/context'
import { t } from '../i18n/bs'
export default function PendingCartAction({ action, update }) {
  const { cart, confirmAction } = useApp()
  const cache = useQueryClient()
  const locked = useRef(false)
  const [expired, setExpired] = useState(() => Date.parse(action.expiresAt) <= Date.now());
  useEffect(() => { const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(action.expiresAt) - Date.now())); return () => clearTimeout(timer); }, [action.expiresAt]);
  const status = action.uiStatus ?? (expired ? 'EXPIRED' : 'PENDING')
  const labels = { ADD: 'Dodavanje proizvoda u korpu', REMOVE: 'Uklanjanje stavke iz korpe', UPDATE: 'Promjena količine u korpi' }
  const product = cart.items.find(item => item.id === action.itemId)
  const confirm = async () => {
    if (locked.current || status !== 'PENDING') return
    locked.current = true
    update({ uiStatus: 'CONFIRMING' })
    try {
      await confirmAction(action.actionId)
      update({ uiStatus: 'COMPLETED' })
    } catch (error) {
      update({ uiStatus: error.uncertain ? 'UNKNOWN' : error.status === 410 ? 'EXPIRED' : 'FAILED', error: error.message })
      void cache.invalidateQueries({ queryKey: ['cart'] })
    }
  }
  return <section className="pending-action" aria-label={t('Prijedlog promjene korpe')}>
    <strong>{t(labels[action.type])}</strong>
    <div>{product?.productName ?? (action.productId ? `${t('Proizvod')} #${action.productId}` : `${t('Stavka korpe')} #${action.itemId}`)}{action.quantity != null && ` · ${t('Količina')}: ${action.quantity}`}</div>
    {status === 'PENDING' && <><small>{t('Korpa još nije promijenjena. Potvrdite samo ako želite izvršiti ovu radnju.')}</small><div className="pending-actions"><button className="btn" onClick={() => void confirm()}>{t('Potvrdi')}</button><button className="btn secondary" onClick={() => update({ uiStatus: 'CANCELLED' })}>{t('Odustani')}</button></div></>}
    {status === 'CONFIRMING' && <span role="status">{t('Potvrđivanje je u toku. Ako je stranica osvježena, provjerite korpu prije novog prijedloga.')}</span>}
    {status === 'COMPLETED' && <span role="status">{t('Promjena korpe je izvršena.')}</span>}
    {status === 'CANCELLED' && <span>{t('Odustali ste od ovog prijedloga. Korpa nije promijenjena ovom potvrdom.')}</span>}
    {status === 'EXPIRED' && <span>{t('Prijedlog je istekao. Zatražite novi prijedlog.')}</span>}
    {(status === 'UNKNOWN' || status === 'FAILED') && <div role="alert">{action.error}<br />{t('Provjerite korpu prije slanja novog prijedloga. Ova potvrda neće biti automatski ponovljena.')}</div>}
  </section>
}
