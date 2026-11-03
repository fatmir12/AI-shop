import { initialCategories } from '../services/categories.js';
export const categories = initialCategories;
export const products = [
  {
    "id": 1,
    "categoryId": 3,
    "categoryName": "Slušalice",
    "name": "Sony WH-1000XM5",
    "price": 649,
    "stock": 18,
    "imageUrl": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85",
    "description": "Bežične slušalice s aktivnim poništavanjem buke i baterijom do 30 sati."
  },
  {
    "id": 2,
    "categoryId": 1,
    "categoryName": "Laptopi",
    "name": "Apple MacBook Air 13 M3 16/512 GB",
    "price": 2499,
    "stock": 8,
    "imageUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",
    "description": "Ekran od 13 inča, M3 procesor, 16 GB memorije i SSD od 512 GB."
  },
  {
    "id": 3,
    "categoryId": 2,
    "categoryName": "Telefoni",
    "name": "Samsung Galaxy S24 256 GB",
    "price": 1499,
    "stock": 12,
    "imageUrl": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    "description": "AMOLED ekran od 6,2 inča, 256 GB prostora i kamera od 50 MP."
  },
  {
    "id": 4,
    "categoryId": 5,
    "categoryName": "Miševi",
    "name": "Logitech MX Master 3S",
    "price": 219,
    "stock": 4,
    "imageUrl": "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
    "description": "Bežični miš s tihim tipkama, ergonomskim oblikom i USB-C punjenjem."
  },
  {
    "id": 5,
    "categoryId": 2,
    "categoryName": "Telefoni",
    "name": "Apple iPhone 15 128 GB",
    "price": 1699,
    "stock": 9,
    "imageUrl": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85",
    "description": "OLED ekran od 6,1 inča, USB-C priključak i glavna kamera od 48 MP."
  },
  {
    "id": 6,
    "categoryId": 4,
    "categoryName": "Tastature",
    "name": "Keychron K2 Wireless",
    "price": 189,
    "stock": 22,
    "imageUrl": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85",
    "description": "Kompaktna mehanička tastatura s Bluetooth vezom i podrškom za Windows i macOS."
  },
  {
    "id": 7,
    "categoryId": 1,
    "categoryName": "Laptopi",
    "name": "Lenovo ThinkPad E14 16/512 GB",
    "price": 1599,
    "stock": 3,
    "imageUrl": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
    "description": "Poslovni laptop s ekranom od 14 inča, 16 GB memorije i SSD-om od 512 GB."
  },
  {
    "id": 8,
    "categoryId": 3,
    "categoryName": "Slušalice",
    "name": "Nothing Ear Wireless",
    "price": 249,
    "stock": 16,
    "imageUrl": "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85",
    "description": "Bežične slušalice s aktivnim poništavanjem buke i kutijicom za punjenje."
  },
  {
    "id": 9,
    "categoryId": 1,
    "categoryName": "Laptopi",
    "name": "ASUS VivoBook 15 16/512 GB",
    "price": 1199,
    "stock": 6,
    "imageUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",
    "description": "Laptop s ekranom od 15,6 inča, 16 GB memorije i SSD-om od 512 GB."
  },
  {
    "id": 10,
    "categoryId": 4,
    "categoryName": "Tastature",
    "name": "Logitech MX Keys S",
    "price": 229,
    "stock": 24,
    "imageUrl": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85",
    "description": "Bežična tastatura s osvijetljenim tipkama i podrškom za više uređaja."
  },
  {
    "id": 11,
    "categoryId": 5,
    "categoryName": "Miševi",
    "name": "Logitech G305 Lightspeed",
    "price": 119,
    "stock": 0,
    "imageUrl": "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
    "description": "Bežični miš s optičkim senzorom i šest programabilnih tipki."
  },
  {
    "id": 12,
    "categoryId": 2,
    "categoryName": "Telefoni",
    "name": "Google Pixel 8a 128 GB",
    "price": 899,
    "stock": 14,
    "imageUrl": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    "description": "OLED ekran od 6,1 inča, 128 GB prostora i dvostruka zadnja kamera."
  }
];
export const users = [{
  id: 1,
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'user@aishop.test',
  role: 'USER'
}, {
  id: 2,
  firstName: 'Sam',
  lastName: 'Admin',
  email: 'admin@aishop.test',
  role: 'ADMIN'
}];
export const orders = [{
  id: 1001,
  userId: 1,
  status: 'DELIVERED',
  createdAt: '2026-10-26T10:30:00',
  totalAmount: 408,
  items: [{
    id: 1,
    productId: 4,
    productName: products[3].name,
    quantity: 1,
    unitPrice: 219,
    subtotal: 219
  }, {
    id: 2,
    productId: 6,
    productName: products[5].name,
    quantity: 1,
    unitPrice: 189,
    subtotal: 189
  }]
}, {
  id: 1002,
  userId: 1,
  status: 'PENDING',
  createdAt: '2026-11-02T14:00:00',
  totalAmount: 649,
  items: [{
    id: 3,
    productId: 1,
    productName: products[0].name,
    quantity: 1,
    unitPrice: 649,
    subtotal: 649
  }]
}];
