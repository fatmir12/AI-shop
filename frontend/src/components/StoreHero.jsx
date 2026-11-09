import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Image, PhotoNote } from './ui';
import { money } from '../utils/shop';

export default function StoreHero({ products }) {
  const available = products.filter(product => product.stock > 0);
  const featured = available.find(product => /macbook/i.test(product.name))
    ?? available.find(product => product.categoryName === 'Laptopi') ?? available[0];
  return <section className="store-hero" aria-labelledby="store-hero-title">
    <div className="store-hero-copy">
      <h1 id="store-hero-title">Manje traženja.<br /><span>Više mogućnosti.</span></h1>
      <p>Laptopi, telefoni i oprema na jednom mjestu. Pronađi ono što ti odgovara, uz pomoć AI asistenta.</p>
      <div className="store-hero-actions"><Link className="btn" to="/products">Istraži proizvode <ArrowUpRight size={18} /></Link><Link className="store-hero-secondary" to="/assistant">Pitaj AI asistenta <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div>
    {featured && <Link to={`/products/${featured.id}`} className="store-hero-product" aria-label={`Pogledaj: ${featured.name}`}>
      <Image src={featured.imageUrl} alt={featured.name} loading="eager" fetchPriority="high" width={480} height={280} />
      <div className="store-hero-product-caption"><span>{featured.name}</span><strong>{money(featured.price)}</strong><ArrowUpRight size={20} /></div>
      <PhotoNote src={featured.imageUrl} />
    </Link>}
  </section>;
}
