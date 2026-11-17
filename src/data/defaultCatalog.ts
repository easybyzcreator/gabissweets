import { Product, Category, ImageGallery } from '../types';

export const initialCategories: Category[] = [
  {
    id: "cat_personalized_cakes",
    title: "Bolos Personalizados",
    order: 1,
    catalog: "both"
  },
  {
    id: "cat_sweets_truffles",
    title: "Doces & Trufas Artesanais",
    order: 2,
    catalog: "both"
  }
];

export const initialGalleries: ImageGallery[] = [
  {
    id: "gal_15th_birthday",
    title: "Bolo de 15 Anos",
    images: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "gal_birthday_cake",
    title: "Bolo de Aniversário",
    images: [
      "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "gal_birthday_girls",
    title: "Bolo de Aniversário Feminino",
    images: [
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "gal_birthday_boys",
    title: "Bolo de Aniversário Masculino",
    images: [
      "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80"
    ]
  }
];

export const initialProducts: Product[] = [];

export const DEFAULT_CAKE_CONFIG = {
  cakeSizes: [] as string[],
  cakeDoughs: [] as string[],
  cakeFillings: [] as string[],
  cakeFillingsMax: 2,
  cakeToppings: [] as string[],
  cakeToppers: [] as string[]
};

