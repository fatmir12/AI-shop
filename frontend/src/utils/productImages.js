export function productIllustration(category) {
  return '/demo/' + ({ Laptopi: 'laptop', Telefoni: 'phone', 'Slušalice': 'headphones', Tastature: 'keyboard', 'Miševi': 'mouse' }[category] || 'laptop') + '.svg';
}
