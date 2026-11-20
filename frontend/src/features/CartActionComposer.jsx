import { useState } from 'react'
import { useProducts } from './products'
import { useApp } from '../app/context'
import { t } from '../i18n/bs'
export default function CartActionComposer({ busy, send }) {
  const [type, setType] = useState('ADD')
  const products = useProducts()
  const { cart } = useApp()
  return <details className="cart-action-composer"><summary>{t('Pripremi prijedlog promjene korpe')}</summary><form onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void send('Pripremi promjenu korpe uz obaveznu potvrdu.', { cartAction: { type, productId: type === 'ADD' ? Number(data.get('target')) : null, itemId: type !== 'ADD' ? Number(data.get('target')) : null, quantity: type !== 'REMOVE' ? Number(data.get('quantity')) : null } })
  }}><label className="field"><span>{t('Radnja')}</span><select disabled={busy} value={type} onChange={event => setType(event.target.value)}><option value="ADD">{t('Dodaj proizvod')}</option><option value="REMOVE">{t('Ukloni stavku')}</option><option value="UPDATE">{t('Promijeni količinu')}</option></select></label><label className="field"><span>{t(type === 'ADD' ? 'Proizvod' : 'Stavka korpe')}</span><select key={type} name="target" required disabled={busy} defaultValue=""><option value="" disabled>{t('Odaberi')}</option>{(type === 'ADD' ? products.data?.filter(product => product.stock > 0) ?? [] : cart.items).map(item => <option key={item.id} value={item.id}>{item.name ?? item.productName} (#{item.id})</option>)}</select></label>{type !== 'REMOVE' && <label className="field"><span>{t('Količina')}</span><input type="number" name="quantity" min="1" max="2147483647" defaultValue="1" required disabled={busy} /></label>}<button className="btn secondary" disabled={busy}>{t('Pripremi za potvrdu')}</button></form></details>
}
