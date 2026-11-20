export const initialCategories = [
  { id: 1, name: 'Laptopi', slug: 'laptopi', description: 'Laptopi za posao i svakodnevnu upotrebu.' },
  { id: 2, name: 'Telefoni', slug: 'telefoni', description: 'Mobilni telefoni.' },
  { id: 3, name: 'Slušalice', slug: 'slusalice', description: 'Bežične i žične slušalice.' },
  { id: 4, name: 'Tastature', slug: 'tastature', description: 'Tastature za računar.' },
  { id: 5, name: 'Miševi', slug: 'misevi', description: 'Računarski miševi.' },
]
export function mapCategory(dto) {
  const definition = initialCategories.find(category => category.name === dto.name)
  return { ...dto, slug: definition?.slug ?? String(dto.id) }
}
export const taxonomyError = 'Katalog koristi pet definiranih kategorija. Dodavanje, preimenovanje i brisanje kategorija nije dozvoljeno.'
