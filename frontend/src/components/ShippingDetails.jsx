export default function ShippingDetails({ shipping }) {
  if (!shipping) return <p className="muted">Podaci za dostavu nisu zabilježeni za ovu narudžbu.</p>;
  return <section className="shipping-details"><h3>Podaci za dostavu</h3>
    <p>{shipping.firstName} {shipping.lastName}<br />{shipping.address}<br />{shipping.postalCode} {shipping.city}<br />Bosna i Hercegovina</p>
    <p>{shipping.email}<br />{shipping.phone}</p>
  </section>;
}