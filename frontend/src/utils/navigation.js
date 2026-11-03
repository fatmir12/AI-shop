export function categoryNavigation(pathname, search, categoryId) {
  return pathname.replace(/\/$/, '') === '/products' && new URLSearchParams(search).get('category') === String(categoryId)
}
export function allProductsNavigation(pathname, search) {
  return pathname.replace(/\/$/, '') === '/products' && !new URLSearchParams(search).get('category')
}
