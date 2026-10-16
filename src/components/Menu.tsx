import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { Product, Order, Settings, Category, CartItem, Side, ProductSize, ImageGallery, BoxFlavorItem } from '../types';
import { Plus, Minus, ShoppingBag, Lock, X, MessageCircle, MessageSquare, Check, Calendar, Building2, User, Phone, MapPin, RefreshCw, ChevronDown, Snowflake, Flame, Utensils, Apple, Sparkles, Info, AlertCircle, CheckCircle2, Clock, Ban, HelpCircle, Leaf, Search, BookOpen, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { initialProducts, initialCategories, DEFAULT_CAKE_CONFIG } from '../data/defaultCatalog';
import { parseMoneyValue } from '../lib/money';
import { ConsumptionInstructionsModal } from './ConsumptionInstructionsModal';

const translations = {
  pt: {
    cartTitle: 'Seu Carrinho',
    emptyCart: 'Seu carrinho está vazio',
    total: 'Total',
    next: 'Próximo: Seus Dados',
    back: 'Voltar',
    finish: 'Finalizar Pedido',
    fullName: 'Nome Completo',
    phone: 'Telefone',
    email: 'E-mail',
    birthday: 'Aniversário (MM/DD)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Rua/Avenida',
    number: 'Nº/Apto',
    zipCode: 'Zip Code',
    city: 'Cidade',
    state: 'Estado',
    observation: 'Observação',
    orderDetails: 'Detalhes do seu Pedido',
    customCakeTitle: 'Opções de Personalização',
    chooseModel: 'Escolha o Modelo',
    chooseSize: 'Escolha o Tamanho',
    chooseDough: 'Escolha a Massa',
    chooseFillings: 'Escolha os Recheios',
    chooseFrosting: 'Escolha a Cobertura',
    chooseSides: 'Escolha os Acompanhamentos',
    excludeIngredients: 'Excluir Ingredientes',
    limitReached: 'Limite atingido',
    addToCart: 'Adicionar ao Carrinho',
    whatsappOrder: 'Pedido',
    whatsappData: 'Dados do Cliente',
    whatsappItems: 'Itens do Pedido',
    whatsappTotal: 'Total do Pedido',
    whatsappDate: 'Data',
    whatsappAt: 'às',
    pickupDate: 'Data de Entrega/Retirada',
    pickupDatePlaceholder: 'MM/DD/AAAA',
    consultMessage: 'Existem itens no pedido com valores a consultar. Aguarde a confirmação pelo WhatsApp.'
  },
  en: {
    cartTitle: 'Your Cart',
    emptyCart: 'Your cart is empty',
    total: 'Total',
    next: 'Next: Your Details',
    back: 'Back',
    finish: 'Finish Order',
    fullName: 'Full Name',
    phone: 'Phone',
    email: 'E-mail',
    birthday: 'Birthday (MM/DD)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Street/Avenue',
    number: 'No./Apt',
    zipCode: 'Zip Code',
    city: 'City',
    state: 'State',
    observation: 'Observation',
    orderDetails: 'Order Details',
    customCakeTitle: 'Customize your Order',
    chooseModel: 'Choose Model',
    chooseSize: 'Choose Size',
    chooseDough: 'Choose Dough',
    chooseFillings: 'Choose Fillings',
    chooseFrosting: 'Choose Frosting',
    chooseSides: 'Choose Sides',
    excludeIngredients: 'Exclude Ingredients',
    limitReached: 'Limit reached',
    addToCart: 'Add to Cart',
    whatsappOrder: 'Order',
    whatsappData: 'Customer Data',
    whatsappItems: 'Order Items',
    whatsappTotal: 'Order Total',
    whatsappDate: 'Date',
    whatsappAt: 'at',
    pickupDate: 'Pickup/Delivery Date',
    pickupDatePlaceholder: 'MM/DD/YYYY',
    consultMessage: 'There are items with values to be consulted. Please wait for confirmation via WhatsApp.'
  }
};

const formatBRPhone = (value: string): string => {
  let val = value.replace(/\D/g, '');
  if (val.length > 11) {
    val = val.slice(0, 11);
  }
  if (val.length === 0) return '';
  if (val.length <= 2) {
    return `(${val}`;
  }
  if (val.length <= 6) {
    return `(${val.slice(0, 2)}) ${val.slice(2)}`;
  }
  if (val.length <= 10) {
    return `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
  }
  return `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
};

const formatUSPhone = (value: string): string => {
  let val = value.replace(/\D/g, '');
  if (val.length > 10) {
    val = val.slice(0, 10);
  }
  if (val.length === 0) return '';
  if (val.length <= 3) {
    return `(${val}`;
  }
  if (val.length <= 6) {
    return `(${val.slice(0, 3)}) ${val.slice(3)}`;
  }
  return `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
};

const formatPhoneAny = (value: string, countryCode?: string): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (countryCode === '+55' || (digits.length === 11 && !digits.startsWith('1'))) {
    return formatBRPhone(value);
  }
  return formatUSPhone(value);
};

const getCleanWhatsAppPhone = (phone: string, countryCode: string = '+1'): string => {
  let clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (countryCode === '+55') {
    if (!clean.startsWith('55')) {
      clean = '55' + clean;
    }
    return clean;
  }
  // USA / US (+1)
  if (clean.length === 10) {
    return '1' + clean;
  }
  if (clean.startsWith('1') && clean.length === 11) {
    return clean;
  }
  return '1' + clean;
};

export const getContrastText = (hexColor?: string): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );
  return hsp > 155 ? '#000000' : '#ffffff';
};

export const getColorWithLegibility = (hexColor?: string, defaultColor: string = '#865d39'): string => {
  if (!hexColor) return defaultColor;
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return defaultColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance > 0.6) {
    return defaultColor;
  }
  return `#${hex}`;
};

export const getResolvedBoxFlavors = (
  boxProduct: Product,
  allProducts: Product[],
  allCategories: Category[]
): BoxFlavorItem[] => {
  if (!boxProduct) return [];

  const toFlavorItems = (prods: Product[]): BoxFlavorItem[] => {
    const seen = new Set<string>();
    const items: BoxFlavorItem[] = [];

    for (const p of prods) {
      if (!p || !p.title) continue;
      const key = (p.id || p.title).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        id: p.id,
        name: p.title,
        price: typeof p.price === 'number' ? p.price : 0
      });
    }

    return items;
  };

  // 1. Explicitly configured flavors on the box product (with freshest prices from allProducts if available)
  if (Array.isArray(boxProduct.boxFlavors) && boxProduct.boxFlavors.length > 0) {
    return boxProduct.boxFlavors.map(f => {
      const match = allProducts.find(p => p.id === f.id || (p.title && f.name && p.title.trim().toLowerCase() === f.name.trim().toLowerCase()));
      return {
        id: f.id,
        name: f.name,
        price: (match && typeof match.price === 'number' && match.price > 0) ? match.price : (typeof f.price === 'number' ? f.price : 0)
      };
    });
  }

  // Helper: check if product is a valid candidate flavor (not the current box container itself)
  const isCandidateFlavor = (p: Product): boolean => {
    if (!p || p.id === boxProduct.id || p.isActive === false) return false;
    // Exclude if it's a combo container with multiple meal/combo items
    if (p.isCombo && p.comboQuantity && p.comboQuantity > 1) return false;
    // Exclude meals with sides or full custom cakes
    if (p.isMeal || p.isCustomCake) return false;
    // If it has its own non-empty list of sub-flavors (>1), it is another box container
    if (Array.isArray(p.boxFlavors) && p.boxFlavors.length > 1) return false;
    return true;
  };

  // 2. Linked category (boxCategoryId or boxSourceCategoryTitle)
  if (boxProduct.boxCategoryId || boxProduct.boxSourceCategoryTitle) {
    const targetCatId = boxProduct.boxCategoryId || '';
    const targetCatTitle = (boxProduct.boxSourceCategoryTitle || '').trim().toLowerCase();
    const targetCat = allCategories.find(c => 
      c.id === targetCatId || 
      (c.title && c.title.trim().toLowerCase() === targetCatId.toLowerCase()) ||
      (targetCatTitle && c.title && c.title.trim().toLowerCase() === targetCatTitle)
    );
    const catId = targetCat ? targetCat.id : targetCatId;
    const catTitle = (targetCat?.title || targetCatTitle || targetCatId || '').trim().toLowerCase();

    const matching = allProducts.filter(p => {
      if (!isCandidateFlavor(p)) return false;
      if (catId && p.categoryId === catId) return true;
      if (targetCat && p.categoryId === targetCat.id) return true;
      if (catTitle && (p.categoryId?.trim().toLowerCase() === catTitle || p.categoryTitle?.trim().toLowerCase() === catTitle)) return true;
      return false;
    });

    if (matching.length > 0) {
      return toFlavorItems(matching);
    }
  }

  // 3. Products in the same category as the box product
  if (boxProduct.categoryId) {
    const matching = allProducts.filter(p => 
      isCandidateFlavor(p) && 
      p.categoryId === boxProduct.categoryId
    );
    if (matching.length > 0) {
      return toFlavorItems(matching);
    }
  }

  // 4. Products marked as onlyInCombos or registered as box items ("esses itens cadastramos como box no painel adm, pq nao podem ser vendidos unitarios")
  const boxAndComboItems = allProducts.filter(p => 
    isCandidateFlavor(p) && 
    (p.onlyInCombos || p.isCustomBox)
  );
  if (boxAndComboItems.length > 0) {
    const titleLower = (boxProduct.title || '').toLowerCase();
    const descLower = (boxProduct.description || '').toLowerCase();
    const specificMatching = boxAndComboItems.filter(p => {
      const pTitle = (p.title || '').toLowerCase();
      const pCat = (p.categoryTitle || '').toLowerCase();
      if (titleLower.includes('brigadeiro') || descLower.includes('brigadeiro')) {
        return pTitle.includes('brigadeiro') || pCat.includes('brigadeiro') || pCat.includes('doce') || pTitle.includes('ninho') || pTitle.includes('beijinho');
      }
      if (titleLower.includes('cupcake') || descLower.includes('cupcake')) {
        return pTitle.includes('cupcake') || pCat.includes('cupcake');
      }
      return true;
    });
    const pool = specificMatching.length > 0 ? specificMatching : boxAndComboItems;
    if (pool.length > 0) {
      return toFlavorItems(pool);
    }
  }

  // 5. Match by category keywords (e.g. Brigadeiros, Doces, Trufas, Sweets, Confeitaria, Box, Caixas)
  const boxTitleLower = (boxProduct.title || '').toLowerCase();
  const boxDescLower = (boxProduct.description || '').toLowerCase();

  const matchingCategories = allCategories.filter(c => {
    const cTitle = (c.title || '').toLowerCase();
    if (boxTitleLower.includes('brigadeiro') || boxDescLower.includes('brigadeiro')) {
      return cTitle.includes('brigadeiro') || cTitle.includes('doce') || cTitle.includes('sweet') || cTitle.includes('truffle') || cTitle.includes('box') || cTitle.includes('caixa');
    }
    if (boxTitleLower.includes('cupcake') || boxDescLower.includes('cupcake')) {
      return cTitle.includes('cupcake');
    }
    if (boxTitleLower.includes('salgado') || boxDescLower.includes('salgado')) {
      return cTitle.includes('salgado') || cTitle.includes('snack') || cTitle.includes('savory');
    }
    return cTitle.includes('brigadeiro') || cTitle.includes('box') || cTitle.includes('caixa') || cTitle.includes('doce') || cTitle.includes('sweet');
  });

  if (matchingCategories.length > 0) {
    const catIds = new Set(matchingCategories.map(c => c.id));
    const catTitles = new Set(matchingCategories.map(c => c.title.toLowerCase()));
    const prods = allProducts.filter(p => 
      isCandidateFlavor(p) && 
      (catIds.has(p.categoryId || '') || catTitles.has((p.categoryTitle || '').toLowerCase()))
    );
    if (prods.length > 0) {
      return toFlavorItems(prods);
    }
  }

  // 6. Direct sweet product match (e.g. any product whose title contains "brigadeiro", "beijinho", "ninho", "churros", "trufa", "doce")
  const sweetKeywords = ['brigadeiro', 'beijinho', 'trufa', 'doce', 'sweet', 'ninho', 'churros', 'palha', 'bombom', 'pistache', 'nutella'];
  const isSweetBox = sweetKeywords.some(k => boxTitleLower.includes(k) || boxDescLower.includes(k)) || !boxTitleLower.includes('salgado');

  if (isSweetBox) {
    const matchedSweets = allProducts.filter(p => 
      isCandidateFlavor(p) && 
      sweetKeywords.some(k => (p.title || '').toLowerCase().includes(k))
    );
    if (matchedSweets.length > 0) {
      return toFlavorItems(matchedSweets);
    }
  }

  // 7. General Fallback: Any active products that are candidate flavors
  const fallbackProducts = allProducts.filter(p => isCandidateFlavor(p));
  if (fallbackProducts.length > 0) {
    return toFlavorItems(fallbackProducts);
  }

  return [];
};

const translateSettingsToEnglish = (s: Settings): Settings => {
  return {
    ...s,
    language: 'en',
    currency: 'USD',
    brandName: s.brandName || 'Gabi´s sweets',
    slogan: typeof s.slogan === 'string' ? s.slogan : '',
    introTitle: s.introTitle || s.brandName || 'Gabi´s sweets',
    introSubtitle: typeof s.introSubtitle === 'string' ? s.introSubtitle : '',
    introDescription: typeof s.introDescription === 'string' ? s.introDescription : '',
    introButtonText: s.introButtonText || 'VIEW OUR MENU',
    introBottomText: typeof s.introBottomText === 'string' ? s.introBottomText : '',
    selectorTitle: s.selectorTitle || s.brandName || 'Gabi´s sweets',
    selectorSubtitle: typeof s.selectorSubtitle === 'string' ? s.selectorSubtitle : '',
    catalog1Title: s.catalog1Title || 'Custom Cakes',
    catalog1Desc: typeof s.catalog1Desc === 'string' ? s.catalog1Desc : '',
    catalog1Slogan: typeof s.catalog1Slogan === 'string' ? s.catalog1Slogan : '',
    catalog2Title: typeof s.catalog2Title === 'string' ? s.catalog2Title : '',
    catalog2Desc: typeof s.catalog2Desc === 'string' ? s.catalog2Desc : '',
    catalog2Slogan: typeof s.catalog2Slogan === 'string' ? s.catalog2Slogan : '',
    catalog3Title: typeof s.catalog3Title === 'string' ? s.catalog3Title : '',
    catalog3Desc: typeof s.catalog3Desc === 'string' ? s.catalog3Desc : '',
    catalog3Slogan: typeof s.catalog3Slogan === 'string' ? s.catalog3Slogan : '',
    catalog4Title: typeof s.catalog4Title === 'string' ? s.catalog4Title : '',
    catalog4Desc: typeof s.catalog4Desc === 'string' ? s.catalog4Desc : '',
    catalog4Slogan: typeof s.catalog4Slogan === 'string' ? s.catalog4Slogan : '',
    checkoutTitle: s.checkoutTitle || 'We are very happy with your order! Please review the details below.',
    infoBlock1Title: s.infoBlock1Title || 'ORDER CONFIRMATION',
    infoBlock1Text: s.infoBlock1Text || 'After sending your request, we will contact you on WhatsApp to confirm details.',
    infoBlock2Title: s.infoBlock2Title || 'STORE PICK UP',
    infoBlock2Text: s.infoBlock2Text || 'Check our pickup hours and address details on the final confirmation.',
    whatsappClosingMessage: s.whatsappClosingMessage || 'Thank you for your order, we will contact you shortly for confirmation!'
  };
};

export default function Menu({ settings: initialSettings }: { settings: Settings }) {
  const settings = translateSettingsToEnglish(initialSettings || {} as Settings);
  const t = translations['en'];
  const currencySymbol = settings.currency === 'BRL' ? 'R$ ' : '$';

  const renderTitle = (title: string) => {
    if (title && title.toLowerCase() === 'escola de gastronomia e negócios') {
      return (
        <>
          Escola de gastronomia<br />e negócios
        </>
      );
    }
    return title;
  };

  const sortAlphabetically = (list: string[]) => {
    return [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  };

  const DEFAULT_CAKE_SIZES = [
    '7" - 15 to 20 Slices (Approx. 1.5kg)',
    '9" - 25 to 30 Slices (Approx. 2.5kg)',
    '12" - 40 to 50 Slices (Approx. 4.0kg)'
  ];

  const DEFAULT_CAKE_DOUGHS = [
    'Vanilla Dough',
    'Chocolate 50% Cocoa Dough',
    'Red Velvet Dough'
  ];

  const DEFAULT_CAKE_FILLINGS = [
    'Belgian Chocolate Brigadeiro',
    'Traditional Coconut Cream',
    'Traditional Dulce de Leche',
    'Sweet Milk Cream with Berries'
  ];

  const DEFAULT_CAKE_TOPPINGS = [
    'Belgian Chocolate Ganache',
    'Classic Buttercream',
    'Creamy Whipped Frosting'
  ];

  const DEFAULT_CAKE_TOPPERS = [
    'None',
    'Happy Birthday',
    'Congratulations'
  ];

  const cakeSizesList = sortAlphabetically(settings.cakeSizes || []);
  const cakeDoughsList = sortAlphabetically(settings.cakeDoughs || []);
  const cakeFillingsList = sortAlphabetically(settings.cakeFillings || []);
  const cakeToppingsList = sortAlphabetically(settings.cakeToppings || []);
  const cakeToppersList = sortAlphabetically(settings.cakeToppers || []);

  const [products, setProducts] = useState<Product[]>(() => {
    return [...initialProducts].sort((a, b) => {
      const oA = typeof a.order === 'number' ? a.order : 9999;
      const oB = typeof b.order === 'number' ? b.order : 9999;
      if (oA !== oB) return oA - oB;
      return (a.title || '').localeCompare(b.title || '');
    });
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    return [...initialCategories].sort((a, b) => {
      const oA = typeof a.order === 'number' ? a.order : 9999;
      const oB = typeof b.order === 'number' ? b.order : 9999;
      return oA - oB;
    });
  });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [isDietsModalOpen, setIsDietsModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isDetoxModalOpen, setIsDetoxModalOpen] = useState(false);
  const [isCustomDietModalOpen, setIsCustomDietModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [mealSelections, setMealSelections] = useState<{
    removals: string[];
    sides: Side[];
  }>({
    removals: [],
    sides: []
  });
  const [sideQuantities, setSideQuantities] = useState<Record<string, number>>({});
  const [selectedCakeSize, setSelectedCakeSize] = useState<string>('');
  const [selectedDough, setSelectedDough] = useState<string>('');
  const [selectedFillings, setSelectedFillings] = useState<string[]>([]);
  const [selectedSandwichFillings, setSelectedSandwichFillings] = useState<string[]>([]);
  const [selectedTopping, setSelectedTopping] = useState<string>('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]); // dummy if needed, but not used now
  const [selectedTopper, setSelectedTopper] = useState<string>('');
  const [selectedCupcakeDough, setSelectedCupcakeDough] = useState<string>('');
  const [selectedCupcakeFilling, setSelectedCupcakeFilling] = useState<string>('');
  const [selectedCupcakeFrosting, setSelectedCupcakeFrosting] = useState<string>('');
  const [selectedCupcakeFlavor, setSelectedCupcakeFlavor] = useState<string>('');
  const [b2bName, setB2bName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).name || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bResponsibleName, setB2bResponsibleName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).manager || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bPhone, setB2bPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).phone || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bAddress, setB2bAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).address || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bZipCode, setB2bZipCode] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).zipCode || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bCity, setB2bCity] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).city || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bFrequency, setB2bFrequency] = useState<'one-time' | 'weekly'>('one-time');
  const [isReturningB2b, setIsReturningB2b] = useState(() => {
    try {
      return localStorage.getItem('b2b_profile_save') ? true : false;
    } catch {
      return false;
    }
  });
  const [b2bSearchResults, setB2bSearchResults] = useState<any[]>([]);
  const [showB2bSearchDropdown, setShowB2bSearchDropdown] = useState(false);
  const [b2bProfiles, setB2bProfiles] = useState<any[]>([]);
  const [pqCoquetel, setPqCoquetel] = useState(0);
  const [pqMedio, setPqMedio] = useState(0);
  const [pqPremium, setPqPremium] = useState(0);
  const [b2bDate, setB2bDate] = useState('');
  const [b2bObservation, setB2bObservation] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'form' | 'channels' | 'b2b_channels'>('summary');
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [b2bSuccessUrls, setB2bSuccessUrls] = useState<{ whatsapp: string } | null>(null);
  const [standardSuccessUrls, setStandardSuccessUrls] = useState<{ whatsapp: string } | null>(null);
  const [galleries, setGalleries] = useState<ImageGallery[]>([]);
  const [selectedStyleNumber, setSelectedStyleNumber] = useState<number | null>(null);
  const [isCustomReferenceOpen, setIsCustomReferenceOpen] = useState(false);
  const [customCakeDescription, setCustomCakeDescription] = useState('');
  const [customCakeObservation, setCustomCakeObservation] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);
  const [sandwichFillingQuantities, setSandwichFillingQuantities] = useState<Record<string, number>>({});
  const [selectedComboProduct, setSelectedComboProduct] = useState<Product | null>(null);
  const [comboDishSelections, setComboDishSelections] = useState<Record<string, number>>({});
  const [selectedDishForNutritionalInfo, setSelectedDishForNutritionalInfo] = useState<Product | null>(null);
  const [comboSearchTerm, setComboSearchTerm] = useState<string>('');
  const [boxFlavorQuantities, setBoxFlavorQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isCustomModalOpen || selectedProductForDetails) {
      setCustomItemQuantity(1);
      setSandwichFillingQuantities({});
      setBoxFlavorQuantities({});
      setSelectedCupcakeDough('');
      setSelectedCupcakeFilling('');
      setSelectedCupcakeFrosting('');
      setSelectedCupcakeFlavor('');
    }
  }, [isCustomModalOpen, selectedProductForDetails]);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    street: '',
    number: '',
    zipCode: '',
    city: '',
    state: '',
    aniversario: '',
    observacao: '',
    email: '',
    deliveryOption: 'delivery' as 'delivery' | 'pickup',
    neighborhood: '',
    customNeighborhood: '',
    scheduledDate: '',
    scheduledTime: '10:00 AM'
  });

  const [deliveryHour, setDeliveryHour] = useState('10');
  const [deliveryMinute, setDeliveryMinute] = useState('00');
  const [deliveryPeriod, setDeliveryPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      scheduledTime: `${deliveryHour}:${deliveryMinute} ${deliveryPeriod}`
    }));
  }, [deliveryHour, deliveryMinute, deliveryPeriod]);

  const [activeScreen, setActiveScreen] = useState<'intro' | 'selector' | 'menu'>(() => {
    if (settings.introEnabled !== false) return 'intro';
    return 'menu';
  });
  const [selectedCatalog, setSelectedCatalog] = useState<'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | null>('catalog1');

  useEffect(() => {
    if (settings) {
      if (settings.introEnabled === false) {
        setActiveScreen('menu');
      }
    }
  }, [settings]);

  useEffect(() => {
    if (selectedCatalog !== 'catalog1') {
      setSelectedCatalog('catalog1');
    }
  }, [selectedCatalog]);

  useEffect(() => {
    if (selectedProductForDetails) {
      const product = selectedProductForDetails;
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize(null);
      }

      if (product.isCustomCake) {
        setSelectedCakeSize('');
        setSelectedDough('');
        setSelectedFillings([]);
        setSelectedTopping('');
        setSelectedTopper('');
        setSelectedStyleNumber(null);
        setCustomCakeDescription('');
        setCustomCakeObservation('');
        setIsCustomReferenceOpen(false);
      }

      if (product.isCustomSandwich) {
        setSelectedSandwichFillings([]);
      }

      if (product.isCustomCupcake) {
        setSelectedCupcakeDough('');
        setSelectedCupcakeFrosting('');
        setSelectedCupcakeFlavor('');
      }

      if (product.isCustomBox) {
        setBoxFlavorQuantities({});
      }

      setMealSelections({
        removals: [],
        sides: []
      });
      setSideQuantities({});
    }
  }, [selectedProductForDetails]);

  useEffect(() => {
    console.log('Menu: Inicilizando listeners...');
    setLoading(true);
    
    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => {
        const data = doc.data() as Product;
        const matchingInitial = initialProducts.find(ip => ip.title.trim().toLowerCase() === data.title?.trim().toLowerCase() || ip.id === doc.id);
        const image = data.image || matchingInitial?.image || '';
        return { ...data, image, id: doc.id } as Product;
      });
      // Deduplicar produtos por ID único
      const prodMap = new Map<string, Product>();
      fetchedProducts.forEach(p => {
        if (p.id && !prodMap.has(p.id)) {
          prodMap.set(p.id, p);
        }
      });
      const uniqueProds = Array.from(prodMap.values());
      const sorted = uniqueProds.sort((a, b) => {
        const oA = typeof a.order === 'number' ? a.order : 9999;
        const oB = typeof b.order === 'number' ? b.order : 9999;
        if (oA !== oB) return oA - oB;
        return (a.title || '').localeCompare(b.title || '');
      });
      setProducts(sorted);
      setLoading(false);
    }, (error) => {
      console.error('Menu: Erro ao carregar produtos:', error);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, 'categorias'), (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      // Deduplicar categorias por título normalizado (evitando duplicações de catálogo ou id)
      const catMap = new Map<string, Category>();
      const seenTitles = new Set<string>();
      fetchedCategories.forEach(c => {
        if (!c.id) return;
        const normalizedTitle = (c.title || '').trim().toLowerCase();
        if (!normalizedTitle) return;
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          catMap.set(c.id, c);
        }
      });
      const uniqueCats = Array.from(catMap.values());
      const sorted = uniqueCats.sort((a, b) => (typeof a.order === 'number' ? a.order : 9999) - (typeof b.order === 'number' ? b.order : 9999));
      setCategories(sorted);
    }, (error) => {
      console.error('Menu: Erro ao carregar categorias:', error);
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      const fetchedSides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side));
      setSides(fetchedSides);
    }, (error) => {
      console.error('Menu: Erro ao carregar acompanhamentos:', error);
    });

    const unsubGalleries = onSnapshot(collection(db, 'galerias'), (snapshot) => {
      setGalleries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageGallery)));
    }, (error) => {
      console.error('Menu: Erro ao carregar galerias:', error);
    });

    const unsubB2bProfiles = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const b2bOrders = snapshot.docs
        .map(doc => doc.data())
        .filter((o: any) => o.isB2B || o.isPJ);
      const profilesMap: Record<string, any> = {};
      b2bOrders.forEach((o: any) => {
        const name = o.b2bCompanyName || o.customerName;
        if (name && !profilesMap[name.toLowerCase()]) {
          profilesMap[name.toLowerCase()] = {
            name: name,
            manager: o.b2bManagerName || '',
            phone: o.phone || '',
            address: o.b2bAddress || o.address || ''
          };
        }
      });
      setB2bProfiles(Object.values(profilesMap));
    }, (error) => {
      console.error('Menu: Erro ao carregar pedidos para perfis B2B:', error);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSides();
      unsubGalleries();
      unsubB2bProfiles();
    };
  }, []);

  // Load B2B Profiles for Autocomplete
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'pedidos'));
      const unsub = onSnapshot(q, (snapshot) => {
        const uniqueProfilesMap: Record<string, any> = {};
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data();
          if (d.isB2B || d.isPJ) {
            const companyName = d.b2bCompanyName || d.customerName || '';
            const key = companyName.toLowerCase().trim();
            if (key && !uniqueProfilesMap[key]) {
              uniqueProfilesMap[key] = {
                name: companyName,
                manager: d.b2bManagerName || '',
                phone: d.phone || '',
                address: d.b2bAddress || d.address || ''
              };
            }
          }
        });
        setB2bProfiles(Object.values(uniqueProfilesMap));
      });
      return () => unsub();
    } catch (e) {
      console.error("Error loading B2B profiles catalog:", e);
    }
  }, []);

  // Check localStorage for saved B2B profile
  useEffect(() => {
    const saved = localStorage.getItem('b2b_profile_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setB2bName(parsed.name);
        if (parsed.manager) setB2bResponsibleName(parsed.manager);
        if (parsed.phone) setB2bPhone(parsed.phone);
        if (parsed.address) setB2bAddress(parsed.address);
        setIsReturningB2b(true);
      } catch (e) {}
    }
  }, []);

  const addToCart = (product: Product, customQty: number = 1) => {
    // Stock validation
    if (selectedSize && typeof selectedSize.stockQuantity === 'number') {
      const currentInCartForSize = cart
        .filter(item => item.productId === product.id && item.selectedSize?.id === selectedSize.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (selectedSize.stockQuantity <= 0) {
        toast.error(`Sorry, size ${selectedSize.name} is currently sold out!`);
        return;
      }
      if (currentInCartForSize + customQty > selectedSize.stockQuantity) {
        toast.error(`Maximum quantity available for ${selectedSize.name} reached! (${Math.max(0, selectedSize.stockQuantity - currentInCartForSize)} remaining)`);
        return;
      }
    } else if (product.trackStock) {
      const currentInCart = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const maxStock = Number(product.stockQuantity ?? 0);
      if (maxStock <= 0) {
        toast.error('Sorry, this item is currently sold out!');
        return;
      }
      if (currentInCart + customQty > maxStock) {
        toast.error(`Maximum quantity available in stock reached! (${Math.max(0, maxStock - currentInCart)} remaining)`);
        return;
      }
    }

    const hasSizesOpt = !!(product.sizes && product.sizes.length > 0);
    const hasExclusionsOpt = !!(product.isMeal && product.ingredients && product.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
    const hasSidesOpt = !!(product.isMeal && product.allowedSides && product.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
    const isCustomCakeOpt = !!product.isCustomCake;
    const isCustomSandwichOpt = !!product.isCustomSandwich;
    
    // If it requires complex customization (exclusions, sides, cake, or sandwich selection)
    const requiresComplexCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;

    // If we have selectedSize from details modal and NO complex customization is needed, add directly!
    if (hasSizesOpt && selectedSize && !requiresComplexCustomization) {
      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id && !item.mealOptions && item.selectedSize?.id === selectedSize.id);
        if (existing) {
          return prev.map(item => item === existing ? { ...item, quantity: item.quantity + customQty } : item);
        }
        return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: customQty, selectedSize: selectedSize }];
      });
      return;
    }

    const requiresCustomization = hasSizesOpt || hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;

    if (requiresCustomization) {
      setSelectedProductForCustom(product);
      setMealSelections({
        removals: [],
        sides: []
      });
      setSideQuantities({});
      
      // Preserve existing selectedSize if valid for this product, otherwise set first option
      if (product.sizes && product.sizes.length > 0) {
        const isAlreadySelectedSizeValid = selectedSize && product.sizes.some(s => s.id === selectedSize.id);
        if (!isAlreadySelectedSizeValid) {
          setSelectedSize(product.sizes[0]);
        }
      } else {
        setSelectedSize(null);
      }
      
      if (product.isCustomCake) {
        setSelectedCakeSize('');
        setSelectedDough('');
        setSelectedFillings([]);
        setSelectedTopping('');
        setSelectedTopper('');
        setSelectedStyleNumber(null);
        setCustomCakeDescription('');
        setCustomCakeObservation('');
        setIsCustomReferenceOpen(false);
      }

      if (product.isCustomSandwich) {
        setSelectedSandwichFillings([]);
      }
      setIsCustomModalOpen(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.mealOptions && !item.selectedSize);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + customQty } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: customQty }];
    });
  };

  const incrementSizeQty = (product: Product, size: ProductSize) => {
    if (typeof size.stockQuantity === 'number') {
      const currentInCartForSize = cart
        .filter(item => item.productId === product.id && item.selectedSize?.id === size.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (size.stockQuantity <= 0) {
        toast.error(`Sorry, size ${size.name} is currently sold out!`);
        return;
      }
      if (currentInCartForSize + 1 > size.stockQuantity) {
        toast.error(`Maximum quantity available for ${size.name} reached! (${Math.max(0, size.stockQuantity - currentInCartForSize)} remaining)`);
        return;
      }
    } else if (product.trackStock) {
      const currentInCart = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const maxStock = Number(product.stockQuantity ?? 0);
      if (currentInCart + 1 > maxStock) {
        toast.error('Maximum quantity available in stock reached!');
        return;
      }
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1, selectedSize: size }];
    });
  };

  const decrementSizeQty = (product: Product, size: ProductSize) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        if (existing.quantity <= 1) {
          return prev.filter(item => item !== existing);
        }
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev;
    });
  };

  const getMaxSandwichFillings = (sizeName: string): number => {
    const match = sizeName.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 1;
  };

  const addMealToCart = () => {
    if (!selectedProductForCustom) return;

    if (selectedProductForCustom.isCustomSandwich) {
      const activeFillings = (Object.entries(sandwichFillingQuantities) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => ({ name, qty }));

      if (activeFillings.length === 0) {
        toast.error('Choose at least 1 option!');
        return;
      }

      setCart(prev => {
        let currentCart = [...prev];

        for (const { name, qty } of activeFillings) {
          const newSandwichOptions = {
            fillings: [name]
          };

          const existing = currentCart.find(item =>
            item.productId === selectedProductForCustom.id &&
            ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
            item.sandwichOptions &&
            JSON.stringify(item.sandwichOptions.fillings) === JSON.stringify(newSandwichOptions.fillings)
          );

          if (existing) {
            currentCart = currentCart.map(item =>
              item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
            );
          } else {
            currentCart.push({
              id: Math.random().toString(36).substr(2, 9),
              productId: selectedProductForCustom.id,
              quantity: qty,
              sandwichOptions: newSandwichOptions,
              selectedSize: selectedSize || undefined
            });
          }
        }

        return currentCart;
      });

      setIsCustomModalOpen(false);
      setSelectedProductForCustom(null);
      setSelectedSize(null);
      return;
    }

    if (selectedProductForCustom.isCustomCake) {
      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined,
          customStyleDescription: customCakeDescription?.trim() || undefined,
          cakeObservation: customCakeObservation?.trim() || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === selectedProductForCustom.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          item.cakeOptions.customStyleDescription === newCakeOptions.customStyleDescription &&
          item.cakeOptions.cakeObservation === newCakeOptions.cakeObservation &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: selectedProductForCustom.id,
            quantity: customItemQuantity,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setIsCustomModalOpen(false);
      setSelectedProductForCustom(null);
      return;
    }
    
    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = selectedProductForCustom.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === selectedProductForCustom.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: selectedProductForCustom.id, 
          quantity: customItemQuantity,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setIsCustomModalOpen(false);
    setSelectedProductForCustom(null);
    setSelectedSize(null);
  };

  const addDetailedProductToCart = (product: Product) => {
    // Stock validation
    if (product.trackStock) {
      const currentInCart = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const maxStock = Number(product.stockQuantity ?? 0);
      if (maxStock <= 0) {
        toast.error('Sorry, this item is currently sold out!');
        return;
      }
      if (currentInCart + customItemQuantity > maxStock) {
        toast.error(`Maximum available in stock reached! (${Math.max(0, maxStock - currentInCart)} remaining)`);
        return;
      }
    }

    if (product.isCustomCupcake) {
      const hasDoughs = Boolean(product.cupcakeDoughs && product.cupcakeDoughs.length > 0);
      const hasFillings = Boolean(product.cupcakeFillings && product.cupcakeFillings.length > 0);
      const hasFrostings = Boolean(product.cupcakeFrostings && product.cupcakeFrostings.length > 0);
      const hasFlavors = Boolean(product.cupcakeFlavors && product.cupcakeFlavors.length > 0);

      if (hasDoughs && !selectedCupcakeDough) {
        toast.error('Please select a batter / dough flavor!');
        return;
      }
      if (hasFillings && !selectedCupcakeFilling) {
        toast.error('Please select a filling option!');
        return;
      }
      if (hasFrostings && !selectedCupcakeFrosting) {
        toast.error('Please select a frosting / topping flavor!');
        return;
      }
      if (hasFlavors && !selectedCupcakeFlavor) {
        toast.error('Please select a flavor!');
        return;
      }

      const cupcakeOpts = {
        ...(selectedCupcakeDough ? { dough: selectedCupcakeDough } : {}),
        ...(selectedCupcakeFilling ? { filling: selectedCupcakeFilling } : {}),
        ...(selectedCupcakeFrosting ? { frosting: selectedCupcakeFrosting } : {}),
        ...(selectedCupcakeFlavor ? { flavor: selectedCupcakeFlavor } : {})
      };

      setCart(prev => {
        const existing = prev.find(item =>
          item.productId === product.id &&
          ((!item.selectedSize && !selectedSize) || item.selectedSize?.id === selectedSize?.id) &&
          item.cupcakeOptions?.dough === cupcakeOpts.dough &&
          item.cupcakeOptions?.filling === cupcakeOpts.filling &&
          item.cupcakeOptions?.frosting === cupcakeOpts.frosting &&
          item.cupcakeOptions?.flavor === cupcakeOpts.flavor
        );

        if (existing) {
          return prev.map(item =>
            item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item
          );
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            quantity: customItemQuantity,
            cupcakeOptions: cupcakeOpts,
            selectedSize: selectedSize || undefined
          }
        ];
      });

      setSelectedProductForDetails(null);
      setSelectedSize(null);
      setSelectedCupcakeDough('');
      setSelectedCupcakeFilling('');
      setSelectedCupcakeFrosting('');
      setSelectedCupcakeFlavor('');
      toast.success('Added to cart!');
      return;
    }

    if (product.isCustomBox) {
      const capacity = product.boxCapacity || 24;
      const flavorsList = getResolvedBoxFlavors(product, products, categories);
      const selectedFlavors = flavorsList
        .filter(f => (boxFlavorQuantities[f.id || f.name] || 0) > 0)
        .map(f => ({
          id: f.id,
          name: f.name,
          quantity: boxFlavorQuantities[f.id || f.name] || 0,
          unitPrice: typeof f.price === 'number' ? f.price : 0
        }));

      const totalUnits = selectedFlavors.reduce((sum, f) => sum + f.quantity, 0);
      if (totalUnits !== capacity) {
        toast.error(`Please select exactly ${capacity} items for this box! (${totalUnits} currently selected)`);
        return;
      }

      const baseBoxPrice = product.price || 0;
      const flavorsPrice = selectedFlavors.reduce((sum, f) => sum + (f.quantity * f.unitPrice), 0);
      const calculatedBoxPrice = baseBoxPrice + flavorsPrice;

      setCart(prev => [
        ...prev,
        {
          id: 'box_' + Math.random().toString(36).substr(2, 9),
          productId: product.id,
          quantity: customItemQuantity || 1,
          customPrice: calculatedBoxPrice,
          boxOptions: {
            capacity,
            flavors: selectedFlavors
          }
        }
      ]);

      setSelectedProductForDetails(null);
      setBoxFlavorQuantities({});
      toast.success('Box successfully added to your order!');
      return;
    }

    if (product.isCustomSandwich) {
      const activeFillings = (Object.entries(sandwichFillingQuantities) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => ({ name, qty }));

      if (activeFillings.length === 0) {
        toast.error('Choose at least 1 option!');
        return;
      }

      setCart(prev => {
        let currentCart = [...prev];

        for (const { name, qty } of activeFillings) {
          const newSandwichOptions = {
            fillings: [name]
          };

          const existing = currentCart.find(item =>
            item.productId === product.id &&
            ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
            item.sandwichOptions &&
            JSON.stringify(item.sandwichOptions.fillings) === JSON.stringify(newSandwichOptions.fillings)
          );

          if (existing) {
            currentCart = currentCart.map(item =>
              item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
            );
          } else {
            currentCart.push({
              id: Math.random().toString(36).substr(2, 9),
              productId: product.id,
              quantity: qty,
              sandwichOptions: newSandwichOptions,
              selectedSize: selectedSize || undefined
            });
          }
        }

        return currentCart;
      });

      setSelectedProductForDetails(null);
      setSelectedSize(null);
      setSelectedSandwichFillings([]);
      toast.success('Successfully added to your order!');
      return;
    }

    if (product.isCustomCake) {
      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined,
          customStyleDescription: customCakeDescription?.trim() || undefined,
          cakeObservation: customCakeObservation?.trim() || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === product.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          item.cakeOptions.customStyleDescription === newCakeOptions.customStyleDescription &&
          item.cakeOptions.cakeObservation === newCakeOptions.cakeObservation &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            quantity: customItemQuantity,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setSelectedProductForDetails(null);
      toast.success('Successfully added to your order!');
      return;
    }
    
    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = product.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + customItemQuantity } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: product.id, 
          quantity: customItemQuantity,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setSelectedProductForDetails(null);
    setSelectedSize(null);
    toast.success('Successfully added to your order!');
  };

  const handleAddComboToCart = () => {
    if (!selectedComboProduct) return;
    const targetQty = Number(selectedComboProduct.comboQuantity) || 5;
    const currentTotal = (Object.values(comboDishSelections) as number[]).reduce((a, b) => a + b, 0);

    if (currentTotal !== targetQty) {
      toast.error(`Please select exactly ${targetQty} items to complete the combo. You selected ${currentTotal}.`);
      return;
    }

    const comboItems = Object.entries(comboDishSelections)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([dishId, qty]) => {
        const dish = products.find(p => p.id === dishId);
        return {
          productId: dishId,
          productTitle: dish?.title || 'Item',
          quantity: qty as number
        };
      });

    setCart(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        productId: selectedComboProduct.id,
        quantity: 1,
        comboOptions: {
          items: comboItems
        }
      }
    ]);

    setSelectedComboProduct(null);
    setComboDishSelections({});
    toast.success('Combo successfully added to your order!');
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== cartItemId);
    });
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    let itemPrice = 0;
    if (item.customPrice !== undefined) {
      itemPrice = item.customPrice;
    } else if (item.boxOptions && item.boxOptions.flavors) {
      const baseBox = product?.price || 0;
      const flavorsTotal = item.boxOptions.flavors.reduce((sum, f) => sum + (f.quantity * f.unitPrice), 0);
      itemPrice = baseBox + flavorsTotal;
    } else {
      const basePrice = item.selectedSize ? item.selectedSize.price : ((product?.price && product.price > 0) ? product.price : (product?.oldPrice || 0));
      itemPrice = basePrice;
      if (item.mealOptions?.sides) {
        itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
      }
    }
    return total + itemPrice * item.quantity;
  }, 0);

  const checkMarmitifyLimit = () => {
    return true;
  };

  const validateCartItems = () => {
    const minVal = parseMoneyValue(settings.minOrderValue);
    if (minVal > 0 && cartTotal < minVal) {
      const diff = minVal - cartTotal;
      return {
        isValid: false,
        message: `The minimum order amount is ${currencySymbol}${minVal.toFixed(2)}. Still needed: ${currencySymbol}${diff.toFixed(2)}!`
      };
    }
    return { isValid: true, message: '' };
  };

  // Trava rígida: se o total for inferior ao pedido mínimo, impede qualquer avanço para o checkout/formulário
  useEffect(() => {
    const minVal = parseMoneyValue(settings?.minOrderValue);
    if (minVal > 0 && cartTotal < minVal && (checkoutStep === 'form' || checkoutStep === 'channels')) {
      setCheckoutStep('summary');
    }
  }, [cartTotal, settings?.minOrderValue, checkoutStep]);

  const handleSendCustomDietWhatsApp = () => {
    const brand = settings.brandName || 'team';
    const msg = `Hello ${brand}, I am browsing your menu and would like to place a custom order, can you help me?`;
    const cleanPhone = getCleanWhatsAppPhone(settings.whatsappNumber || '', settings.whatsappCountryCode || '+1');
    if (!cleanPhone) {
      toast.error('WhatsApp phone number not configured in the Admin panel.');
      return;
    }
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (cart.length === 0) {
      toast.error(settings.language === 'en' ? 'Your cart is empty!' : 'Seu carrinho está vazio!');
      return;
    }

    const minValidation = validateCartItems();
    if (!minValidation.isValid) {
      toast.error(minValidation.message);
      setCheckoutStep('summary');
      return;
    }

    // Required fields validation
    if (!formData.nome.trim()) {
      toast.error('Full Name is required!');
      return;
    }
    if (!formData.telefone.trim()) {
      toast.error('Phone number is required!');
      return;
    }
    const phoneDigits = formData.telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Please enter a valid phone number with area code!');
      return;
    }
    if (!formData.aniversario.trim()) {
      toast.error('Birthday is required!');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(formData.aniversario.trim())) {
      toast.error('Please enter birthday in MM/DD format!');
      return;
    }
    const [bMonthStr, bDayStr] = formData.aniversario.trim().split('/');
    const bMonth = parseInt(bMonthStr, 10);
    const bDay = parseInt(bDayStr, 10);
    if (bMonth < 1 || bMonth > 12 || bDay < 1 || bDay > 31) {
      toast.error('Please enter a valid date in MM/DD format (Month/Day)!');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('E-mail is required!');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address!');
      return;
    }

    // Delivery Neighborhood Validation
    const isDelivery = formData.deliveryOption === 'delivery';
    let deliveryFee = 0;
    let neighborhoodName = '';

    if (isDelivery) {
      if (!formData.neighborhood) {
        toast.error('Please select your delivery zone / neighborhood!');
        return;
      }
      if (formData.neighborhood === 'Outro') {
        if (!formData.customNeighborhood?.trim()) {
          toast.error('Please specify your delivery zone or region!');
          return;
        }
        neighborhoodName = `Other (${formData.customNeighborhood.trim()})`;
        deliveryFee = 0;
      } else {
        const found = (settings.deliveryNeighborhoods || []).find(n => n.name === formData.neighborhood);
        deliveryFee = found ? Number(found.fee || 0) : 0;
        neighborhoodName = formData.neighborhood;
      }
    } else {
      neighborhoodName = 'Store Pick Up';
      deliveryFee = 0;
    }

    if (isDelivery) {
      if (!formData.neighborhood) {
        toast.error('Please select your delivery city!');
        return;
      }
      if (!formData.street.trim()) {
        toast.error('Street/Avenue is required!');
        return;
      }
      if (!formData.zipCode?.trim()) {
        toast.error('Zip Code is required!');
        return;
      }
    }

    if (!formData.scheduledDate?.trim()) {
      toast.error(formData.deliveryOption === 'delivery' 
        ? 'Please select the delivery date!' 
        : 'Please select the pick up date!');
      return;
    }

    const validation = validateCartItems();
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }
    
    if (!checkMarmitifyLimit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const hasConsultItems = cart.some(item => {
        const p = products.find(prod => prod.id === item.productId);
        return p?.priceType === 'consult' || p?.isCustomCake === true;
      });
      
      const orderItems = cart.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        const basePrice = item.selectedSize ? item.selectedSize.price : ((product.price && product.price > 0) ? product.price : (product.oldPrice || 0));
        let itemPrice = basePrice;
        if (item.customPrice !== undefined) {
          itemPrice = item.customPrice;
        } else if (item.boxOptions && item.boxOptions.flavors) {
          const baseBox = product.price || 0;
          const flavorsTotal = item.boxOptions.flavors.reduce((sum, f) => sum + (f.quantity * f.unitPrice), 0);
          itemPrice = baseBox + flavorsTotal;
        } else if (item.mealOptions?.sides) {
          itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
        }

        const cleanedMealOptions = item.mealOptions ? {
          removals: item.mealOptions.removals || [],
          sides: (item.mealOptions.sides || []).map(side => ({
            id: side.id,
            name: side.name,
            price: side.price,
            type: side.type || 'side'
          }))
        } : null;

        return {
          title: item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title,
          quantity: item.quantity,
          price: itemPrice,
          priceType: product.priceType || 'fixed',
          mealOptions: cleanedMealOptions,
          selectedSize: item.selectedSize || null,
          cakeOptions: item.cakeOptions || null,
          cupcakeOptions: item.cupcakeOptions || null,
          sandwichOptions: item.sandwichOptions || null,
          comboOptions: item.comboOptions || null,
          boxOptions: item.boxOptions || null
        };
      });

      const calculatedTax = 0;
      const finalTotalWithDelivery = cartTotal + deliveryFee;

      const formattedDateOnly = formData.scheduledDate
        ? (formData.scheduledDate.includes('-')
            ? (() => {
                const parts = formData.scheduledDate.split('-');
                if (parts.length === 3) {
                  return `${parts[1]}/${parts[2]}/${parts[0]}`;
                }
                return formData.scheduledDate;
              })()
            : formData.scheduledDate)
        : '';

      const finalSelectedTime = formData.scheduledTime || `${deliveryHour}:${deliveryMinute} ${deliveryPeriod}`;

      const formattedPickupDate = formattedDateOnly 
        ? `${formattedDateOnly} at ${finalSelectedTime} (${formData.deliveryOption === 'delivery' ? 'DELIVERY' : 'PICK UP'})` 
        : '';

      const orderData: Omit<Order, 'id'> = {
        customerName: formData.nome,
        phone: formData.telefone,
        address: isDelivery 
          ? `${formData.street}, ${formData.number || 'S/N'}${neighborhoodName ? ` - ${neighborhoodName}` : ''}${formData.state?.trim() ? ` / ${formData.state.trim()}` : ''}${formData.zipCode ? ` - ${formData.zipCode}` : ''}`
          : 'Store Pick Up',
        street: isDelivery ? formData.street : '',
        number: isDelivery ? (formData.number || '') : '',
        zipCode: isDelivery ? (formData.zipCode || '') : '',
        city: isDelivery ? neighborhoodName : 'Store Pick Up',
        state: isDelivery ? (formData.state?.trim() || '') : '',
        pickupDate: formattedPickupDate,
        deliveryOption: formData.deliveryOption || 'delivery',
        neighborhood: neighborhoodName,
        deliveryNeighborhood: neighborhoodName,
        deliveryFee: deliveryFee,
        scheduledDate: formattedDateOnly,
        scheduledTime: finalSelectedTime,
        deliveryStatus: 'pending',
        birthday: formData.aniversario || '',
        observation: formData.observacao || '',
        email: formData.email || '',
        items: orderItems,
        total: finalTotalWithDelivery,
        subtotal: cartTotal,
        taxRate: 0,
        taxAmount: 0,
        createdAt: serverTimestamp(),
        orderLanguage: settings.language || 'pt'
      };

      console.log('Finalizando pedido...', orderData);
      await addDoc(collection(db, 'pedidos'), orderData);

      // Decrementar estoque de produtos que possuem controle de quantidade
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const updates: any = {};
          if (item.selectedSize && Array.isArray(prod.sizes)) {
            const sizeIdx = prod.sizes.findIndex(s => s.id === item.selectedSize?.id);
            if (sizeIdx >= 0 && typeof prod.sizes[sizeIdx].stockQuantity === 'number') {
              const updatedSizes = [...prod.sizes];
              const newSizeStock = Math.max(0, (updatedSizes[sizeIdx].stockQuantity || 0) - item.quantity);
              updatedSizes[sizeIdx] = {
                ...updatedSizes[sizeIdx],
                stockQuantity: newSizeStock
              };
              updates.sizes = updatedSizes;
            }
          }
          if (prod.trackStock && typeof prod.stockQuantity === 'number') {
            updates.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
          }
          if (Object.keys(updates).length > 0) {
            try {
              await updateDoc(doc(db, 'produtos', prod.id), updates);
            } catch (errStock) {
              console.error('Erro ao decrementar estoque do produto:', prod.id, errStock);
            }
          }
        }
      }
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString(settings.language === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString(settings.language === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/Sao_Paulo' });

      let message = `*${t.whatsappOrder} - ${settings.brandName || settings.slug}*\n`;
      message += `*${t.whatsappDate}:* ${dateStr} ${t.whatsappAt} ${timeStr}\n\n`;
      
      message += `*--- ${t.whatsappData} ---*\n`;
      message += `*${t.fullName}:* ${formData.nome}\n`;
      message += `*${t.phone}:* ${formData.telefone}\n`;
      message += `*${t.email}:* ${formData.email}\n`;
      message += `*${t.birthday}:* ${formData.aniversario}\n`;
      message += `*${settings.language === 'en' ? 'Order Type' : 'Modalidade'}:* ${formData.deliveryOption === 'delivery' ? (settings.language === 'en' ? 'Delivery (Address)' : 'Entrega (Delivery)') : (settings.language === 'en' ? 'Pick Up' : 'Retirada (Pick Up)')}\n`;
      if (isDelivery) {
        message += `*City:* ${neighborhoodName}\n`;
        message += `*Delivery Fee:* ${deliveryFee > 0 ? `${currencySymbol}${deliveryFee.toFixed(2)}` : (formData.neighborhood === 'Outro' ? 'To be agreed' : 'Free')}\n`;
        if (formattedDateOnly) {
          message += `*${settings.language === 'en' ? 'Delivery Date & Time' : 'Data e Horário de Entrega'}:* ${formattedDateOnly} at ${finalSelectedTime}\n`;
        }
        message += `*${t.street}:* ${formData.street}\n`;
        message += `*${t.number}:* ${formData.number || '-'}\n`;
        if (formData.zipCode) {
          message += `*Zip Code:* ${formData.zipCode}\n`;
        }
        if (formData.state?.trim()) {
          message += `*${t.state}:* ${formData.state.trim()}\n`;
        }
      } else {
        if (formattedDateOnly) {
          message += `*${settings.language === 'en' ? 'Pick Up Date & Time' : 'Data e Horário de Retirada'}:* ${formattedDateOnly} at ${finalSelectedTime}\n`;
        }
      }
      message += `*${t.observation}:* ${formData.observacao || '-'}\n\n`;

      message += `*--- ${t.whatsappItems} ---*\n`;
      orderItems.forEach((item, idx) => {
        const originalItem = cart[idx];
        if (item.priceType === 'consult') {
          message += `• ${item.quantity}x ${item.title} - (Value to Consult)\n`;
        } else {
          message += `• ${item.quantity}x ${item.title} - ${currencySymbol}${(item.price * item.quantity).toFixed(2)}\n`;
        }
        if (item.mealOptions) {
          if (item.mealOptions.removals.length > 0) {
            message += `  (Excluding: ${item.mealOptions.removals.join(', ')})\n`;
          }
          if (item.mealOptions.sides.length > 0) {
            const normalSidesArr = item.mealOptions.sides.filter(s => s.type !== 'swap');
            const swapSidesArr = item.mealOptions.sides.filter(s => s.type === 'swap');
            
            if (normalSidesArr.length > 0) {
              const grouped = normalSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
              const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
              message += `  (Sides: ${str})\n`;
            }
            if (swapSidesArr.length > 0) {
              const grouped = swapSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
              const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
              message += `  (Swaps: ${str})\n`;
            }
          }
        }
        if (originalItem && originalItem.cakeOptions) {
          const opts = originalItem.cakeOptions;
          if (opts.size) message += `  (Size: ${opts.size})\n`;
          if (opts.dough) message += `  (Dough: ${opts.dough})\n`;
          if (opts.fillings && opts.fillings.length > 0) message += `  (Fillings: ${opts.fillings.join(' + ')})\n`;
          if (opts.topping) message += `  (Topping: ${opts.topping})\n`;
          if (opts.topper) message += `  (Topper: ${opts.topper})\n`;
          if (opts.styleNumber) message += `  (Style Reference: Photo #${opts.styleNumber})\n`;
          if (opts.customStyleDescription) {
            message += `  (Custom Reference: "${opts.customStyleDescription}")\n`;
            message += `  (📸 Reference photo will be sent via WhatsApp right after this message)\n`;
          }
          if (opts.cakeObservation) message += `  (Cake Notes: "${opts.cakeObservation}")\n`;
        }
        if (originalItem && originalItem.cupcakeOptions) {
          const opts = originalItem.cupcakeOptions;
          if (opts.dough) message += `  (Batter: ${opts.dough})\n`;
          if (opts.filling) message += `  (Filling: ${opts.filling})\n`;
          if (opts.frosting) message += `  (Frosting: ${opts.frosting})\n`;
          if (opts.flavor) message += `  (Flavor: ${opts.flavor})\n`;
        }
        if (originalItem && originalItem.sandwichOptions) {
          const opts = originalItem.sandwichOptions;
          if (opts.fillings && opts.fillings.length > 0) message += `  (Selection: ${opts.fillings.join(' + ')})\n`;
        }
        if (originalItem && originalItem.comboOptions?.items && originalItem.comboOptions.items.length > 0) {
          message += `  (Combo Flavors:\n`;
          originalItem.comboOptions.items.forEach(sub => {
            message += `    • ${sub.quantity}x ${sub.productTitle}\n`;
          });
          message += `  )\n`;
        }
        if (originalItem && originalItem.boxOptions?.flavors && originalItem.boxOptions.flavors.length > 0) {
          message += `  (Box Selection - ${originalItem.boxOptions.capacity} units:\n`;
          originalItem.boxOptions.flavors.forEach(sub => {
            message += `    • ${sub.quantity}x ${sub.name} ($${Number(sub.unitPrice || 0).toFixed(2)} ea)\n`;
          });
          message += `  )\n`;
        }
      });

      message += `\n*Subtotal:* ${currencySymbol}${cartTotal.toFixed(2)}\n`;
      if (isDelivery) {
        message += `*Delivery Fee (${neighborhoodName}):* ${deliveryFee > 0 ? `${currencySymbol}${deliveryFee.toFixed(2)}` : (formData.neighborhood === 'Outro' ? 'To be agreed' : 'Free')}\n`;
      }
      message += `*${t.whatsappTotal}:* ${currencySymbol}${finalTotalWithDelivery.toFixed(2)}\n`;
      
      if (cart.some(item => item.cakeOptions?.customStyleDescription)) {
        message += `\n📸 *Important Note:* I have specified a custom cake design reference above and will send the reference photo/image right here in this chat!\n`;
      }

      if (hasConsultItems) {
        message += `\n⚠️ *${t.consultMessage}*\n`;
      }
      
      message += `\n${settings.whatsappClosingMessage || 'Thank you for your order! We will contact you shortly to confirm.'}`;

      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = getCleanWhatsAppPhone(settings.whatsappNumber || '', settings.whatsappCountryCode || '+1');
      
      if (!cleanPhone) {
        toast.error(settings.language === 'en' 
          ? 'Error: Representative contact number is not properly configured in the administration panel.' 
          : 'Erro: Número para contato não configurado corretamente no painel administrativo.'
        );
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`
        : `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      setStandardSuccessUrls({ whatsapp: whatsappUrl });
      setCheckoutStep('channels');
      setHasRedirected(false);
      toast.success(settings.language === 'en' ? 'Order saved! Select your dispatch method below.' : 'Pedido salvo! Selecione a forma de envio abaixo.');
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(settings.language === 'en' ? 'Error finalizing order. Please try again.' : 'Erro ao finalizar pedido. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteStandardOrder = () => {
    setCart([]);
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setStandardSuccessUrls(null);
    setFormData({ 
      nome: '', 
      telefone: '', 
      endereco: '', 
      street: '',
      number: '',
      zipCode: '',
      state: '',
      city: '',
      aniversario: '', 
      observacao: '', 
      email: '',
      deliveryOption: 'delivery',
      neighborhood: '',
      customNeighborhood: '',
      scheduledDate: '',
      scheduledTime: ''
    });
  };

  const handleCompleteB2bOrder = () => {
    setCart([]);
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setB2bSuccessUrls(null);
  };

   const handleFinalizarB2b = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error(settings.language === 'en' ? 'Your cart is empty!' : 'Seu carrinho está vazio!');
      return;
    }

    const validation = validateCartItems();
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bZipCode.trim() || !b2bCity.trim() || !b2bDate) {
      toast.error('Please fill in all required fields!');
      return;
    }

    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      let titleStr = item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title;
      if (item.cakeOptions) {
        const parts = [];
        if (item.cakeOptions.size) parts.push(`Size: ${item.cakeOptions.size}`);
        if (item.cakeOptions.dough) parts.push(`Dough: ${item.cakeOptions.dough}`);
        if (item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0) parts.push(`Fillings: ${item.cakeOptions.fillings.join(' + ')}`);
        if (item.cakeOptions.topping) parts.push(`Topping: ${item.cakeOptions.topping}`);
        if (item.cakeOptions.topper) parts.push(`Topper: ${item.cakeOptions.topper}`);
        if (item.cakeOptions.styleNumber) parts.push(`Estilo nº ${item.cakeOptions.styleNumber}`);
        titleStr += ` [${parts.join(', ')}]`;
      }
      if (item.sandwichOptions) {
        const parts = [];
        if (item.sandwichOptions.fillings && item.sandwichOptions.fillings.length > 0) parts.push(`${settings.language === 'en' ? 'State' : 'Estado'}: ${item.sandwichOptions.fillings.join(' + ')}`);
        titleStr += ` [${parts.join(', ')}]`;
      }
      if (item.comboOptions?.items && item.comboOptions.items.length > 0) {
        const parts = item.comboOptions.items.map(sub => `${sub.quantity}x ${sub.productTitle}`);
        titleStr += ` [Combo: ${parts.join(', ')}]`;
      }
      if (item.boxOptions?.flavors && item.boxOptions.flavors.length > 0) {
        const parts = item.boxOptions.flavors.map(sub => `${sub.quantity}x ${sub.name} ($${Number(sub.unitPrice || 0).toFixed(2)})`);
        titleStr += ` [Box (${item.boxOptions.capacity} un): ${parts.join(', ')}]`;
      }
      return {
        title: titleStr,
        quantity: item.quantity,
        price: 0,
        priceType: 'consult'
      };
    });

    const b2bOrderObj = {
      customerName: b2bName,
      phone: b2bPhone,
      address: b2bAddress,
      zipCode: b2bZipCode,
      city: b2bCity,
      pickupDate: b2bDate ? (() => {
        const [year, month, day] = b2bDate.split('-');
        return `${month}/${day}/${year}`;
      })() : '',
      birthday: '',
      observation: b2bObservation,
      email: '',
      items: orderItems,
      total: 0,
      createdAt: serverTimestamp(),
      orderLanguage: 'en',
      isB2B: true,
      isPJ: true,
      b2bManagerName: b2bResponsibleName,
      b2bFrequency: b2bFrequency,
      b2bCompanyName: b2bName,
      b2bAddress: b2bAddress,
      b2bZipCode: b2bZipCode,
      b2bCity: b2bCity
    };

    try {
      console.log('Sending corporate B2B order request...', b2bOrderObj);
      await addDoc(collection(db, 'pedidos'), b2bOrderObj);
      
      // Persist client details in localStorage so it autofills on subsequent visits!
      localStorage.setItem('b2b_profile_save', JSON.stringify({
        name: b2bName,
        manager: b2bResponsibleName,
        phone: b2bPhone,
        address: b2bAddress,
        zipCode: b2bZipCode,
        city: b2bCity
      }));
      setIsReturningB2b(true);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' });

      let message = `*Pedido Corporativo - ${settings.brandName || settings.slug}*\n`;
      message += `*Date:* ${dateStr} at ${timeStr}\n\n`;
      message += `*--- COMPANY DETAILS ---*\n`;
      message += `*Company Name:* ${b2bName}\n`;
      message += `*Contact Manager:* ${b2bResponsibleName}\n`;
      message += `*Phone:* ${b2bPhone}\n`;
      message += `*Delivery Address:* ${b2bAddress}\n`;
      message += `*Zip Code:* ${b2bZipCode}\n`;
      message += `*City:* ${b2bCity}\n`;
      message += `*Frequency:* ${b2bFrequency === 'weekly' ? 'Weekly Contract (Recurring)' : 'One-Time Order (Spot)'}\n`;
      message += `*Target Start Date:* ${b2bOrderObj.pickupDate}\n`;
      if (b2bObservation) {
        message += `*Notes:* ${b2bObservation}\n`;
      }
      message += `\n*--- ORDERED ITEMS ---*\n`;
      orderItems.forEach(item => {
        message += `• ${item.quantity}x ${item.title}\n`;
      });
      message += `\n${settings.whatsappClosingMessage || 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!'}\n`;
      
      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = getCleanWhatsAppPhone(settings.whatsappNumber || '', settings.whatsappCountryCode || '+1');

      if (!cleanPhone) {
        toast.error('Representative contact number is not fully configured in the Admin panel.');
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`
        : `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      // Save URLs and go to success channels page
      setB2bSuccessUrls({ whatsapp: whatsappUrl });
      setCheckoutStep('b2b_channels');
      setHasRedirected(false);
      toast.success('Corporate order saved! Choose how you would like to submit below.');
    } catch (error) {
      console.error('Error saving B2B corporate order details:', error);
      toast.error('Failed to submit corporate request. Please verify and try again.');
    }
  };

  if (activeScreen === 'intro') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass max-w-sm w-full rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-6 sm:space-y-8"
        >
          {/* Logo Frame */}
          <div className="relative mt-2">
            <div 
              className="w-[160px] h-[160px] rounded-full p-1 bg-white shadow-md flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: settings.primaryColor }}
            >
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Texts Section */}
          <div className="space-y-3">
            <h1 
              className="text-3xl font-serif font-extrabold italic tracking-tight"
              style={{ color: settings.brandNameColor || settings.primaryColor || '#000000' }}
            >
              {renderTitle(settings.introTitle || 'PranaYummy')}
            </h1>
            
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-[1px] w-12 bg-black/15" />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
              <div className="h-[1px] w-12 bg-black/15" />
            </div>

            <p className="text-lg font-serif italic text-black/80 font-medium">
              {settings.introSubtitle || 'Comer bem é o primeiro passo para uma vida saudável.'}
            </p>
            
            <p 
              className="text-sm font-medium italic max-w-xs mx-auto"
              style={{ color: settings.primaryColor || '#865d39' }}
            >
              {settings.introDescription || 'Se você quer mais leveza, mais saúde e mais qualidade de vida... comece pelo básico bem feito: sua alimentação.'}
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-full pt-2 space-y-3">
            <button
              onClick={() => {
                setActiveScreen('menu');
              }}
              className="w-full py-4 px-6 rounded-full font-bold text-sm tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              {settings.introButtonText || 'VIEW OUR MENU'}
            </button>
            
            <p className="text-[10px] font-mono font-bold tracking-widest opacity-60 uppercase text-black pt-1">
              {settings.introBottomText || 'HANDCRAFTED CAKES & DESSERTS'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (activeScreen === 'selector') {
    setActiveScreen('menu');
    return null;
  }

  if (loading && activeScreen === 'menu') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-4 text-center select-none">
        <div 
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" 
          style={{ borderColor: settings.primaryColor }}
        />
        <p className="mt-4 font-sans font-semibold text-sm text-black/60">
          {settings.language === 'en' ? 'Loading catalog...' : 'Carregando catálogo...'}
        </p>
      </div>
    );
  }

  const filteredCategories = categories.filter(category => {
    const cat = category.catalog;
    // Se a categoria for específica de B2B/corporativo, oculta do cardápio normal
    if (cat === 'catalog_b2b' || cat === 'b2b') {
      return false;
    }
    return true;
  }).sort((a, b) => (typeof a.order === 'number' ? a.order : 9999) - (typeof b.order === 'number' ? b.order : 9999));

  return (
    <div className="flex-grow flex flex-col items-center p-4 pb-32">
      {/* Removed catalog selector back button */}

      {/* Logo / Imagem do Topo */}
      <div className="mt-8 mb-4 relative">
        <div 
          className="w-[160px] h-[160px] rounded-full p-1 bg-white shadow-md flex items-center justify-center overflow-hidden border-2"
          style={{ borderColor: settings.primaryColor }}
        >
          <img 
            src={settings.catalog1Image || settings.logo || 'https://i.ibb.co/1t0DZbPG/patitour-2026-06-05-T085539-099.png'} 
            alt="Imagem do Topo" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <h1 
        className="text-3xl font-serif font-extrabold italic mb-2 text-center tracking-tight" 
        style={{ color: settings.brandNameColor || settings.primaryColor }}
      >
        {renderTitle(settings.catalog1Title || settings.selectorTitle || settings.introTitle || settings.brandName || 'Gabi´s sweets')}
      </h1>

      {Boolean(settings.selectorSubtitle && settings.selectorSubtitle.trim()) && (
        <p className="text-sm font-sans font-medium opacity-75 mb-6 text-center max-w-sm mx-auto" style={{ color: settings.textColor || '#3f2b1b' }}>
          {settings.selectorSubtitle}
        </p>
      )}

      {(() => {
        const text = (settings.catalog1Slogan && settings.catalog1Slogan.trim())
          ? settings.catalog1Slogan.trim()
          : (settings.slogan && settings.slogan.trim()
              ? settings.slogan.trim()
              : (settings.catalog1Desc && settings.catalog1Desc.trim() ? settings.catalog1Desc.trim() : ''));
        if (!text) return null;

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (lines.length > 0) {
          return (
            <div className="flex flex-col items-center mb-12 max-w-sm mx-auto bg-white/40 backdrop-blur-md p-5 rounded-[2rem] border border-white/20 shadow-md">
              <ul className="text-left space-y-2.5 text-xs text-black/80 font-sans font-semibold">
                {lines.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="shrink-0 select-none mt-0.5" style={{ color: settings.primaryColor || '#865d39' }}>✦</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return null;
      })()}

      <div className="w-full max-w-2xl space-y-12">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category, catIdx) => {
            const categoryProducts = products
              .filter(p => p.categoryId === category.id && p.isActive !== false && !p.onlyInCombos)
              .sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 9999;
                const orderB = typeof b.order === 'number' ? b.order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title);
              });
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id ? `menu-cat-${category.id}-${catIdx}` : `menu-cat-${catIdx}`} className="space-y-6">
                <div className="border-b border-white/20 pb-2">
                  <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight" style={{ color: settings.categoryTextColor || settings.primaryColor }}>
                    {category.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {categoryProducts.map((product, pIdx) => (
                    <motion.div
                      key={product.id ? `menu-prod-${product.id}-${pIdx}` : `menu-prod-${pIdx}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      onClick={(e) => {
                        // If user click is inside the cart button container, don't trigger card action
                        if ((e.target as HTMLElement).closest('.cart-button-area')) {
                          return;
                        }
                        
                        if (product.isCombo) {
                          setSelectedComboProduct(product);
                          setComboDishSelections({});
                          setComboSearchTerm('');
                          return;
                        }

                        setSelectedProductForDetails(product);
                        if (product.sizes && product.sizes.length > 0) {
                          setSelectedSize(product.sizes[0]);
                        } else {
                          setSelectedSize(null);
                        }
                      }}
                      className="glass rounded-2xl p-3.5 sm:p-4 md:p-5 flex gap-3.5 sm:gap-4 items-start sm:items-center cursor-pointer hover:shadow-md transition-all duration-300 w-full"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-white/50 shadow-sm border border-black/5 self-start sm:self-center">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 text-black flex flex-col justify-between self-stretch gap-2">
                        <div className="space-y-1">
                          {product.trackStock && (
                            <div className="flex justify-end w-full -mt-0.5 mb-1">
                              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-white shadow-2xs whitespace-nowrap">
                                In Stock / Ready
                              </span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm sm:text-base md:text-lg font-serif font-bold text-black leading-snug">
                                {product.title}
                              </h3>
                              {product.trackStock && (
                                (product.stockQuantity ?? 0) > 0 ? (
                                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap shadow-2xs">
                                    {product.stockQuantity} {(product.stockQuantity === 1 ? 'unit' : 'units')} in stock
                                  </span>
                                ) : (
                                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 whitespace-nowrap shadow-2xs">
                                    Sold Out
                                  </span>
                                )
                              )}
                            </div>
                            {product.isCombo && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 border border-amber-500/30 whitespace-nowrap">
                                🍱 Combo {product.comboQuantity || 5} items
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-[11px] sm:text-xs text-black/75 leading-relaxed line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          {product.sizes && product.sizes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {product.sizes.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100/60 text-amber-950 border border-amber-300/60 shadow-2xs"
                                >
                                  {s.name}: {currencySymbol}{s.price.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (product.isCombo) {
                                setSelectedComboProduct(product);
                                setComboDishSelections({});
                                setComboSearchTerm('');
                                return;
                              }
                              setSelectedProductForDetails(product);
                              if (product.sizes && product.sizes.length > 0) {
                                setSelectedSize(product.sizes[0]);
                              } else {
                                setSelectedSize(null);
                              }
                            }}
                            className="text-[11px] uppercase tracking-wider font-extrabold underline block transition-all focus:outline-none cursor-pointer hover:opacity-80 pt-0.5 text-left"
                            style={{ color: settings.detailsPriceColor || settings.primaryColor }}
                          >
                            {product.isCombo
                              ? `Build Combo (${product.comboQuantity || 5} items)`
                              : (product.sizes && product.sizes.length > 0)
                                ? 'Choose Options / Quantities'
                                : 'View Details'}
                          </button>
                        </div>

                        {/* Bottom Row: Price on left, Action Button on right */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 mt-auto">
                          <div className="flex flex-col items-start">
                            {product.isCustomBox ? (
                              <p className="text-sm sm:text-base font-black font-serif" style={{ color: settings.detailsPriceColor || settings.primaryColor }}>
                                {product.price > 0 ? `${currencySymbol}${product.price.toFixed(2)}` : `${product.boxCapacity || 24} Units Box`}
                              </p>
                            ) : (product.isCustomCake || product.priceType === 'consult') ? (
                              <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                On Request
                              </span>
                            ) : product.sizes && product.sizes.length > 0 ? (
                              <p className="text-xs sm:text-base font-bold" style={{ color: settings.detailsPriceColor || settings.primaryColor }}>
                                From {currencySymbol}{Math.min(...product.sizes.map(s => s.price)).toFixed(2)}
                              </p>
                            ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                              <div className="flex items-baseline gap-1.5">
                                {Boolean(product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0) && (
                                  <span className="text-[10px] sm:text-xs line-through opacity-40">
                                    {currencySymbol}{product.oldPrice.toFixed(2)}
                                  </span>
                                )}
                                <p className="text-sm sm:text-base font-black font-serif" style={{ color: settings.detailsPriceColor || settings.primaryColor }}>
                                  {currencySymbol}{(product.price && product.price > 0 ? product.price : product.oldPrice).toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                On Request
                              </span>
                            )}
                          </div>

                          <div className="flex-shrink-0 flex items-center justify-end cart-button-area pl-1 z-10">
                            {(() => {
                              if (product.trackStock && (product.stockQuantity ?? 0) <= 0) {
                                return (
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 select-none">
                                    Sold Out
                                  </span>
                                );
                              }

                              if (product.isCustomBox) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductForDetails(product);
                                      if (product.sizes && product.sizes.length > 0) {
                                        setSelectedSize(product.sizes[0]);
                                      } else {
                                        setSelectedSize(null);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-full shadow-md font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                  >
                                    <Plus size={14} />
                                    <span>Assemble Box</span>
                                  </button>
                                );
                              }

                              if (product.isCombo) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedComboProduct(product);
                                      setComboDishSelections({});
                                      setComboSearchTerm('');
                                    }}
                                    className="px-3.5 py-1.5 rounded-full shadow-md font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                  >
                                    <Plus size={14} />
                                    <span>Build Combo</span>
                                  </button>
                                );
                              }

                              const requiresCustomization = !!((product.sizes && product.sizes.length > 0) || product.isCustomCake || product.isMeal || product.isCustomCupcake || product.isCustomSandwich || product.isCustomBox);
                              const totalQty = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);

                              if (requiresCustomization) {
                                if (totalQty > 0) {
                                  return (
                                    <div className="flex items-center gap-1 bg-white/75 backdrop-blur-sm p-1 rounded-full border border-black/10 shadow-md">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const productCartItems = cart.filter(item => item.productId === product.id);
                                          if (productCartItems.length > 0) {
                                            const lastItem = productCartItems[productCartItems.length - 1];
                                            removeFromCart(lastItem.id);
                                          }
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200 cursor-pointer active:scale-95 transition-all text-black focus:outline-none"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="font-bold text-xs sm:text-sm min-w-[14px] sm:min-w-[20px] text-center text-black">
                                        {totalQty}
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProductForDetails(product);
                                          if (product.sizes && product.sizes.length > 0) {
                                            setSelectedSize(product.sizes[0]);
                                          } else {
                                            setSelectedSize(null);
                                          }
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProductForDetails(product);
                                        if (product.sizes && product.sizes.length > 0) {
                                          setSelectedSize(product.sizes[0]);
                                        } else {
                                          setSelectedSize(null);
                                        }
                                      }}
                                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  );
                                }
                              } else {
                                if (totalQty > 0) {
                                  return (
                                    <div className="flex items-center gap-1 bg-white/75 backdrop-blur-sm p-1 rounded-full border border-black/10 shadow-md">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const item = cart.find(i => i.productId === product.id);
                                          if (item) removeFromCart(item.id);
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200 cursor-pointer active:scale-95 transition-all text-black focus:outline-none"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="font-bold text-xs sm:text-sm min-w-[14px] sm:min-w-[20px] text-center text-black">
                                        {totalQty}
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToCart(product);
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(product);
                                      }}
                                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  );
                                }
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 opacity-60 glass rounded-2xl">
            {settings.language === 'en' ? 'No products found.' : 'Nenhum produto encontrado.'}
          </div>
        )}
      </div>

      {settings?.showStorageInstructionsButton !== false && (
        <div className="w-full flex flex-col items-center mt-28 mb-16 gap-16 relative">
          {/* Button 1: CONSUMPTION INSTRUCTIONS */}
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-7 z-10 flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
              <div 
                className="text-white w-[34px] h-[34px] rounded-xl text-sm font-black shadow-md relative flex items-center justify-center border border-white/20"
                style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
              >
                ?
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white/20"
                  style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="px-8 py-3.5 rounded-full font-bold text-white hover:opacity-95 active:scale-95 transition-all shadow-lg border-0 text-center flex items-center justify-center min-h-[50px] leading-tight"
              style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
            >
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                CONSUMPTION INSTRUCTIONS
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {/* ConsumptionInstructionsModal disabled temporarily pending new instructions */}

      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
          >
            {(() => {
              const minVal = parseMoneyValue(settings?.minOrderValue);
              const isBelowMin = minVal > 0 && cartTotal < minVal;
              const diff = Math.max(0, minVal - cartTotal);

              return (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className={cn(
                    "w-full rounded-2xl shadow-2xl flex items-center justify-between px-5 font-bold transition-all active:scale-95 cursor-pointer border",
                    isBelowMin 
                      ? "py-3 bg-amber-950/95 text-amber-100 border-amber-500/40 backdrop-blur-md" 
                      : "h-16 border-transparent"
                  )}
                  style={isBelowMin ? undefined : { backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                >
                  <div className="flex items-center gap-3 font-serif">
                    {isBelowMin ? <Lock size={22} className="text-amber-300 shrink-0" /> : <ShoppingBag size={24} />}
                    <div className="flex flex-col text-left">
                      <span className="text-base sm:text-lg leading-tight">
                        {settings.language === 'en' ? 'View Order' : 'Ver Pedido'}
                      </span>
                      {isBelowMin && (
                        <span className="text-[11px] text-amber-300/90 font-sans font-medium">
                          Minimum: {currencySymbol}{minVal.toFixed(2)} • Needed: {currencySymbol}{diff.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-serif text-sm shrink-0">
                    <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-sans">
                      {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="font-bold">{currencySymbol}{cartTotal.toFixed(2)}</span>
                  </div>
                </button>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setCheckoutStep('summary');
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>
                  {checkoutStep === 'summary' ? t.cartTitle : t.finish}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setCheckoutStep('summary');
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {checkoutStep === 'summary' ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {cart.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.id ? `cart-item-${item.id}-${idx}` : `cart-item-${idx}`} className="bg-white/50 p-3.5 rounded-2xl border border-white/30 w-full shadow-sm space-y-2.5">
                            {/* Top row: Image + Full width Title and Badges */}
                            <div className="flex items-start gap-3 w-full">
                              <img 
                                src={product.image} 
                                alt={product.title} 
                                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-white/60 border border-black/5" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-black leading-snug break-words">
                                  {product.title}
                                </h4>
                                
                                {item.selectedSize && (
                                  <div className="mt-1">
                                    <span className="inline-block bg-[#ffedd5] text-[#7c2d12] text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md leading-tight border border-[#fed7aa] max-w-fit break-words">
                                      {item.selectedSize.name}
                                    </span>
                                  </div>
                                )}

                                {item.cupcakeOptions && (
                                  <div className="text-[10px] leading-tight mt-1 space-y-0.5 text-black/70 break-words">
                                    {item.cupcakeOptions.dough && (
                                      <div>Batter: <span className="font-bold text-black">{item.cupcakeOptions.dough}</span></div>
                                    )}
                                    {item.cupcakeOptions.filling && (
                                      <div>Filling: <span className="font-bold text-black">{item.cupcakeOptions.filling}</span></div>
                                    )}
                                    {item.cupcakeOptions.frosting && (
                                      <div>Frosting: <span className="font-bold text-black">{item.cupcakeOptions.frosting}</span></div>
                                    )}
                                    {item.cupcakeOptions.flavor && (
                                      <div>Flavor: <span className="font-bold text-black">{item.cupcakeOptions.flavor}</span></div>
                                    )}
                                  </div>
                                )}

                                {item.cakeOptions && (
                                  <div className="text-[10px] leading-tight mt-1 space-y-0.5 text-black/60 break-words">
                                    {item.cakeOptions.size && (
                                      <div>Size: <span className="font-bold text-black">{item.cakeOptions.size}</span></div>
                                    )}
                                    {item.cakeOptions.dough && (
                                      <div>Batter: <span className="font-bold text-black">{item.cakeOptions.dough}</span></div>
                                    )}
                                    {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                      <div>Filling: <span className="font-bold text-black">{item.cakeOptions.fillings.join(' + ')}</span></div>
                                    )}
                                    {item.cakeOptions.topping && (
                                      <div>Frosting: <span className="font-bold text-black">{item.cakeOptions.topping}</span></div>
                                    )}
                                    {item.cakeOptions.topper && (
                                      <div>Topper: <span className="font-bold text-black">{item.cakeOptions.topper}</span></div>
                                    )}
                                    {item.cakeOptions.styleNumber && (
                                      <div>Reference: <span className="font-bold text-black">Photo #{item.cakeOptions.styleNumber}</span></div>
                                    )}
                                    {item.cakeOptions.customStyleDescription && (
                                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-950 font-medium space-y-0.5 mt-0.5">
                                        <div>Custom Ref: <span className="font-bold text-black">"{item.cakeOptions.customStyleDescription}"</span></div>
                                        <div className="text-[9px] text-amber-800 font-bold">📸 Send photo via WhatsApp</div>
                                      </div>
                                    )}
                                    {item.cakeOptions.cakeObservation && (
                                      <div>Note: <span className="font-bold text-black">"{item.cakeOptions.cakeObservation}"</span></div>
                                    )}
                                  </div>
                                )}
                                {item.comboOptions && item.comboOptions.items.length > 0 && (
                                  <div className="text-[10px] leading-tight mt-1.5 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-black/80 break-words space-y-1">
                                    <span className="font-black text-amber-950 uppercase text-[9px] block">
                                      Selected Flavors:
                                    </span>
                                    <ul className="space-y-0.5">
                                      {item.comboOptions.items.map((sub, sIdx) => (
                                        <li key={sIdx} className="font-medium text-black">
                                          • <span className="font-bold">{sub.quantity}x</span> {sub.productTitle}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {item.boxOptions && item.boxOptions.flavors && item.boxOptions.flavors.length > 0 && (
                                  <div className="text-[10px] leading-tight mt-1.5 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-black/80 break-words space-y-1">
                                    <span className="font-black text-amber-950 uppercase text-[9px] block">
                                      Box Selection ({item.boxOptions.capacity} units):
                                    </span>
                                    <ul className="space-y-0.5">
                                      {item.boxOptions.flavors.map((sub, sIdx) => (
                                        <li key={sIdx} className="font-medium text-black flex justify-between items-center gap-2">
                                          <span>• <span className="font-bold">{sub.quantity}x</span> {sub.name}</span>
                                          <span className="font-bold text-amber-950 text-[10px] shrink-0">
                                            {sub.unitPrice > 0 ? `$${(sub.quantity * sub.unitPrice).toFixed(2)}` : 'Included'}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom row: Price and Stepper controls */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-black/5">
                              <div>
                                {item.customPrice !== undefined ? (
                                  <p className="text-sm font-bold text-black">
                                    {currencySymbol}{(item.customPrice * item.quantity).toFixed(2)}
                                  </p>
                                ) : (product.isCustomCake || product.priceType === 'consult') ? (
                                  <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                    {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                                  </span>
                                ) : item.selectedSize ? (
                                  <div className="flex items-baseline gap-1.5">
                                    {Boolean(item.selectedSize.oldPrice && item.selectedSize.oldPrice > 0) && (
                                      <span className="text-[10px] line-through opacity-40">
                                        {currencySymbol}{item.selectedSize.oldPrice.toFixed(2)}
                                      </span>
                                    )}
                                    <p className="text-sm font-bold text-black">
                                      {currencySymbol}{((item.selectedSize.price + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                                  <div className="flex items-baseline gap-1.5">
                                    {Boolean(product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0) && (
                                      <span className="text-[10px] line-through opacity-40">
                                        {currencySymbol}{product.oldPrice.toFixed(2)}
                                      </span>
                                    )}
                                    <p className="text-sm font-bold text-black">
                                      {currencySymbol}{(((product.price && product.price > 0 ? product.price : product.oldPrice) + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                    {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-90 shadow-sm border border-gray-200 active:scale-95 transition-all cursor-pointer select-none"
                                >
                                  <Minus size={14} style={{ color: '#000000' }} />
                                </button>
                                <span className="font-bold text-sm text-black min-w-[18px] text-center">{item.quantity}</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const prod = products.find(p => p.id === item.productId);
                                    if (prod && prod.trackStock) {
                                      const currentInCart = cart.filter(c => c.productId === prod.id).reduce((sum, c) => sum + c.quantity, 0);
                                      const maxStock = Number(prod.stockQuantity ?? 0);
                                      if (currentInCart + 1 > maxStock) {
                                        toast.error('Maximum quantity available in stock reached!');
                                        return;
                                      }
                                    }
                                    setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                  }}
                                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm font-bold active:scale-95 transition-all cursor-pointer select-none"
                                  style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold" style={{ color: '#000000' }}>{t.total}</span>
                        <span className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {currencySymbol}{cartTotal.toFixed(2)}
                        </span>
                      </div>
                      {cart.some(item => {
                        const p = products.find(prod => prod.id === item.productId);
                        return p?.priceType === 'consult' || p?.isCustomCake === true;
                      }) && (
                        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-yellow-800 font-medium">
                          {t.consultMessage}
                        </div>
                      )}
                    </div>

                    {/* Pedido Mínimo Widget */}
                    {(() => {
                      const minVal = parseMoneyValue(settings.minOrderValue);
                      if (minVal <= 0) return null;
                      const isBelow = cartTotal < minVal;
                      const diff = Math.max(0, minVal - cartTotal);
                      const percent = Math.min(100, Math.round((cartTotal / minVal) * 100));

                      return (
                        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs space-y-2.5 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-amber-950">
                              Minimum Order: {currencySymbol}{minVal.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 whitespace-nowrap">
                              🚚 Minimum Order
                            </span>
                          </div>

                          <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                            {isBelow 
                              ? `The minimum order amount is ${currencySymbol}${minVal.toFixed(2)}.`
                              : `Congratulations! You have reached the minimum order amount of ${currencySymbol}${minVal.toFixed(2)}.`
                            }
                          </p>

                          {/* Progress Bar */}
                          <div className="w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isBelow ? 'bg-amber-600' : 'bg-emerald-600'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={isBelow ? "text-amber-900 font-extrabold" : "text-emerald-700 font-extrabold"}>
                              {isBelow ? `Remaining for minimum: ${currencySymbol}${diff.toFixed(2)}` : '✓ Minimum order reached!'}
                            </span>
                            <span className="text-amber-800 text-[10px]">{percent}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const minVal = parseMoneyValue(settings.minOrderValue);
                      const isBelowMin = minVal > 0 && cartTotal < minVal;
                      const diff = Math.max(0, minVal - cartTotal);

                      if (isBelowMin) {
                        return (
                          <div className="space-y-2 pt-1">
                            <button 
                              type="button"
                              disabled
                              className="w-full py-4 rounded-xl font-black text-sm bg-gray-200 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2 select-none border border-gray-300 shadow-none"
                            >
                              <span>🔒 Minimum {currencySymbol}{minVal.toFixed(2)} ({currencySymbol}{diff.toFixed(2)} remaining)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsModalOpen(false)}
                              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md active:scale-95 transition-all cursor-pointer border-0 text-center flex items-center justify-center gap-2"
                              style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                            >
                              <span>+ Add more items from the menu</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button 
                          onClick={() => {
                            const validation = validateCartItems();
                            if (!validation.isValid) {
                              toast.error(validation.message);
                              return;
                            }
                            if (checkMarmitifyLimit()) {
                              setCheckoutStep('form');
                            }
                          }}
                          className="w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95 cursor-pointer"
                          style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                        >
                          {t.next}
                        </button>
                      );
                    })()}
                  </div>
                ) : checkoutStep === 'channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={36} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        ORDER SAVED!
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        Your order details have been successfully recorded.
                      </p>
                    </div>

                    {/* Exibição detalhada de entrega / taxa no resumo final */}
                    {formData.deliveryOption === 'delivery' ? (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-left max-w-sm mx-auto space-y-1.5 font-sans shadow-xs">
                        <div className="flex justify-between text-gray-700">
                          <span>Items Subtotal:</span>
                          <span className="font-bold text-black">{currencySymbol}{cartTotal.toFixed(2)}</span>
                        </div>
                        {(() => {
                          const foundNeighborhood = (settings.deliveryNeighborhoods || []).find(n => n.name === formData.neighborhood);
                          const fee = formData.neighborhood === 'Outro' ? 0 : Number(foundNeighborhood?.fee || 0);
                          const neighborhoodLabel = formData.neighborhood === 'Outro' 
                            ? (formData.customNeighborhood ? `Other (${formData.customNeighborhood})` : 'Other') 
                            : (formData.neighborhood || 'Delivery');
                          return (
                            <>
                              <div className="flex justify-between text-gray-700">
                                <span>Delivery Fee ({neighborhoodLabel}):</span>
                                <span className="font-bold text-black">
                                  {formData.neighborhood === 'Outro'
                                    ? 'To be agreed (WhatsApp)'
                                    : fee > 0
                                      ? `${currencySymbol}${fee.toFixed(2)}`
                                      : 'Free'}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-black text-sm">
                                <span>Order Total:</span>
                                <span className="text-base font-black" style={{ color: settings.primaryColor || '#000000' }}>
                                  {currencySymbol}{(cartTotal + fee).toFixed(2)}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-left max-w-sm mx-auto space-y-1 font-sans shadow-xs">
                        <div className="flex justify-between text-gray-700">
                          <span>Fulfillment Option:</span>
                          <span className="font-bold text-black">Store Pick Up</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Delivery Fee:</span>
                          <span className="font-bold text-black">Free ({currencySymbol}0.00)</span>
                        </div>
                        <div className="pt-1.5 border-t border-gray-200 flex justify-between font-bold text-black text-sm">
                          <span>Total Amount:</span>
                          <span className="text-base font-black" style={{ color: settings.primaryColor || '#000000' }}>
                            {currencySymbol}{cartTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {!hasRedirected ? (
                      <>
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                          To finalize your order and send a copy to our kitchen, click the WhatsApp button below:
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = standardSuccessUrls?.whatsapp || '#';
                              try {
                                const win = window.open(url, '_blank');
                                if (!win || win.closed || typeof win.closed === 'undefined') {
                                  window.location.href = url;
                                }
                              } catch (e) {
                                window.location.href = url;
                              }
                              setHasRedirected(true);
                            }}
                            className="flex items-center justify-center w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Send Order via WhatsApp</span>
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setCheckoutStep('form');
                            setStandardSuccessUrls(null);
                          }}
                          className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                        >
                          Back to Details
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-950 font-medium text-xs font-sans text-left leading-relaxed space-y-2">
                          <p className="font-bold text-sm text-green-800">Your order is ready to send via WhatsApp!</p>
                          <p>If WhatsApp opened and you sent your message, you can finish and clear your shopping cart now.</p>
                          <p className="text-amber-700">If the chat didn't open or you need to make changes, click "Back and Adjust" to review your info without losing anything!</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleCompleteStandardOrder();
                            }}
                            className="flex items-center justify-center w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Yes, Clear Cart and Finish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = standardSuccessUrls?.whatsapp || '#';
                              try {
                                const win = window.open(url, '_blank');
                                if (!win || win.closed || typeof win.closed === 'undefined') {
                                  window.location.href = url;
                                }
                              } catch (e) {
                                window.location.href = url;
                              }
                            }}
                            className="flex items-center justify-center w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold font-sans text-xs shadow-sm transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Try Sending Again</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => {
                              setHasRedirected(false);
                            }}
                            className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-2 uppercase tracking-wider block mx-auto cursor-pointer"
                          >
                            Back and Adjust
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : checkoutStep === 'b2b_channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={36} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        ORDER SAVED!
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        Your corporate order details have been registered successfully.
                      </p>
                    </div>

                    {!hasRedirected ? (
                      <>
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                          To finalize your corporate order and send a copy, click the button below:
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = b2bSuccessUrls?.whatsapp || '#';
                              try {
                                const win = window.open(url, '_blank');
                                if (!win || win.closed || typeof win.closed === 'undefined') {
                                  window.location.href = url;
                                }
                              } catch (e) {
                                window.location.href = url;
                              }
                              setHasRedirected(true);
                            }}
                            className="flex items-center justify-center w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Send Order via WhatsApp</span>
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setCheckoutStep('form');
                            setB2bSuccessUrls(null);
                          }}
                          className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                        >
                          Back to Details
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-950 font-medium text-xs font-sans text-left leading-relaxed space-y-2">
                          <p className="font-bold text-sm text-green-800">Your corporate order was directed to WhatsApp!</p>
                          <p>If the chat opened and you sent your message, you can finish and clear your corporate shopping cart now.</p>
                          <p className="text-amber-700">If you need to make changes or re-send, click "Back and Adjust"!</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleCompleteB2bOrder();
                            }}
                            className="flex items-center justify-center w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Yes, Clear Cart and Finish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = b2bSuccessUrls?.whatsapp || '#';
                              try {
                                const win = window.open(url, '_blank');
                                if (!win || win.closed || typeof win.closed === 'undefined') {
                                  window.location.href = url;
                                }
                              } catch (e) {
                                window.location.href = url;
                              }
                            }}
                            className="flex items-center justify-center w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold font-sans text-xs shadow-sm transition-all active:scale-95 cursor-pointer border-0 text-center"
                          >
                            <span>Try Sending Again</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => {
                              setHasRedirected(false);
                            }}
                            className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-2 uppercase tracking-wider block mx-auto cursor-pointer"
                          >
                            Back and Adjust
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : false ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide" style={{ color: settings.primaryColor }}>
                        Corporate Order Details
                      </h3>
                      <p className="text-xs font-semibold text-black/60 font-sans max-w-sm mx-auto">
                        Enter your company details to submit the order.
                      </p>
                    </div>

                    {isReturningB2b && (
                      <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-950 flex flex-col gap-1.5 font-sans">
                        <p className="text-xs font-bold flex items-center gap-1.5 text-teal-800">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                          Saved Corporate Account
                        </p>
                        <p className="text-[10px] opacity-90 leading-tight font-medium">
                          Your details are saved on this device. Review below or clear for new details.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('b2b_profile_save');
                            setB2bName('');
                            setB2bResponsibleName('');
                            setB2bPhone('');
                            setB2bAddress('');
                            setIsReturningB2b(false);
                            toast.success('Fields cleared successfully!');
                          }}
                          className="self-start text-[9px] uppercase tracking-wider font-extrabold text-red-700 hover:underline mt-1 bg-white border border-red-200 px-2 py-1 rounded-lg border-0 cursor-pointer"
                        >
                          Clear Saved Profile
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleFinalizarB2b} className="space-y-4">
                      {/* Company Name */}
                      <div className="space-y-1 relative">
                        <label className="text-xs font-bold uppercase text-black">Company / Authorized Entity Name *</label>
                        <input 
                          required
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bName}
                          onChange={e => {
                            const val = e.target.value;
                            setB2bName(val);
                            if (val.trim().length > 1) {
                              const matched = b2bProfiles.filter(p => 
                                p.name.toLowerCase().includes(val.toLowerCase())
                              );
                              setB2bSearchResults(matched);
                              setShowB2bSearchDropdown(matched.length > 0);
                            } else {
                              setShowB2bSearchDropdown(false);
                            }
                          }}
                        />
                        {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {b2bSearchResults.map((profile, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-xs font-semibold text-gray-800 border-b border-gray-50 last:border-b-0 border-0 cursor-pointer"
                                onClick={() => {
                                  setB2bName(profile.name);
                                  setB2bResponsibleName(profile.manager || '');
                                  setB2bPhone(profile.phone || '');
                                  setB2bAddress(profile.address || '');
                                  setShowB2bSearchDropdown(false);
                                }}
                              >
                                {profile.name} (Responsible: {profile.manager})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Responsible names */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Authorized Contact Manager *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bResponsibleName}
                            onChange={e => setB2bResponsibleName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Corporate/Business Phone *</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-extrabold text-green-700 bg-green-50 px-1 rounded pointer-events-none select-none">
                              {settings.whatsappCountryCode === '+55' ? '+55' : '+1'}
                            </span>
                            <input 
                              required
                              type="tel" 
                              className="w-full p-3 pl-12 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={b2bPhone}
                              onChange={e => {
                                const formatted = settings.whatsappCountryCode === '+55' ? formatBRPhone(e.target.value) : formatUSPhone(e.target.value);
                                setB2bPhone(formatted);
                              }}
                              placeholder={settings.whatsappCountryCode === '+55' ? "(99) 99999-9999" : "(555) 000-0000"}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Commercial Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Company Receiving Address *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Street, Number, Suite, Postal Code..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bAddress}
                          onChange={e => setB2bAddress(e.target.value)}
                        />
                      </div>

                      {/* Zip Code and City */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Zip Code *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Zip Code"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bZipCode}
                            onChange={e => setB2bZipCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">City *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="City"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bCity}
                            onChange={e => setB2bCity(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Plan and Date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-black block">Preferred Order Interval *</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('one-time')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'one-time'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              One-Time Order (Spot)
                            </button>
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('weekly')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'weekly'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              Weekly Plan (Recurring)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Target Deliver Date *</label>
                          <input 
                            required
                            type="date" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bDate}
                            onChange={e => setB2bDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Observations */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Additional Handling Instructions / Notes</label>
                        <textarea 
                          rows={2}
                          placeholder="EX: Prefer receiving hours, special billing details or building receiving dock specs..."
                          className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black text-xs font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bObservation}
                          onChange={e => setB2bObservation(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-6 py-4 rounded-xl bg-white border border-gray-200 text-black font-bold cursor-pointer font-serif border-0 hover:bg-gray-50 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          className="flex-grow py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95 cursor-pointer font-serif border-0"
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          Submit Corporate Order
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-bold" style={{ color: '#000000' }}>{t.orderDetails}</h3>
                      {settings.checkoutTitle && (
                        <p className="text-sm font-medium italic leading-relaxed px-4" style={{ color: '#000000' }}>
                          {settings.checkoutTitle}
                        </p>
                      )}
                    </div>

                    {(settings.infoBlock1Title || settings.infoBlock1Text || settings.infoBlock2Title || settings.infoBlock2Text) && (
                      <div className="grid grid-cols-1 gap-3">
                        {settings.infoBlock1Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock1Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock1Text}</p>
                          </div>
                        )}
                        {settings.infoBlock2Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock2Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock2Text}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleFinalizar} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.fullName}</label>
                        <input 
                          required
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.nome}
                          onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black flex items-center gap-1">
                            {t.phone} <span className="text-green-600 font-extrabold text-[10px] bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                              {settings.whatsappCountryCode === '+55' ? 'BR (+55)' : 'US (+1)'}
                            </span>
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-extrabold text-green-700 bg-green-50 px-1 rounded pointer-events-none select-none">
                              {settings.whatsappCountryCode === '+55' ? '+55' : '+1'}
                            </span>
                            <input 
                              required
                              type="tel" 
                              className="w-full p-3 pl-12 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-semibold"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.telefone}
                              onChange={e => {
                                const formatted = settings.whatsappCountryCode === '+55' ? formatBRPhone(e.target.value) : formatUSPhone(e.target.value);
                                setFormData({...formData, telefone: formatted});
                              }}
                              placeholder={settings.whatsappCountryCode === '+55' ? "(99) 99999-9999" : "(555) 000-0000"}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">
                            {t.birthday}
                          </label>
                          <input 
                            required
                            type="text" 
                            placeholder={t.birthdayPlaceholder}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.aniversario}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 4) val = val.slice(0, 4);
                              if (val.length > 2) {
                                val = val.slice(0, 2) + '/' + val.slice(2);
                              }
                              setFormData({...formData, aniversario: val});
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.email}</label>
                        <input 
                          required
                          type="email" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>

                      {/* Modalidade de Entrega / Retirada */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold uppercase text-black block">
                          {settings.language === 'en' ? 'Fulfillment Option *' : 'Modalidade do Pedido *'}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, deliveryOption: 'delivery' })}
                            className={cn(
                              "py-3 px-3 rounded-xl font-bold text-xs border flex items-center justify-center text-center transition-all cursor-pointer",
                              formData.deliveryOption === 'delivery'
                                ? "bg-black text-white border-black shadow-sm"
                                : "bg-white text-black border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <span>{settings.language === 'en' ? 'Delivery (Address)' : 'Entrega (Delivery)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, deliveryOption: 'pickup' })}
                            className={cn(
                              "py-3 px-3 rounded-xl font-bold text-xs border flex items-center justify-center text-center transition-all cursor-pointer",
                              formData.deliveryOption === 'pickup'
                                ? "bg-black text-white border-black shadow-sm"
                                : "bg-white text-black border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <span>{settings.language === 'en' ? 'Pick Up (Store)' : 'Retirada (Pick Up)'}</span>
                          </button>
                        </div>
                      </div>
                      
                      {formData.deliveryOption === 'delivery' ? (
                        <div className="space-y-4">
                          {/* Delivery City and Fee */}
                          <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                            <label className="text-xs font-bold uppercase text-amber-950 flex items-center justify-between">
                              <span>Delivery City *</span>
                              <span className="text-[10px] text-amber-800 font-semibold lowercase">calculates fee</span>
                            </label>
                            
                            <select
                              required
                              value={formData.neighborhood}
                              onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                              className="w-full p-3 rounded-xl border border-gray-300 bg-white focus:ring-2 outline-none text-black text-xs font-bold cursor-pointer"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                            >
                              <option value="">Select your delivery city...</option>
                              {[...(settings.deliveryNeighborhoods || [])]
                                .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                                .map((n, i) => (
                                  <option key={n.id || i} value={n.name}>
                                    {n.name} - {currencySymbol} {Number(n.fee || 0).toFixed(2)}
                                  </option>
                              ))}
                              <option value="Outro">Other (City not listed - fee to be agreed via WhatsApp)</option>
                            </select>

                            {formData.neighborhood === 'Outro' && (
                              <div className="pt-2 space-y-1">
                                <label className="text-[11px] font-bold text-amber-950 uppercase">
                                  What is your city? *
                                </label>
                                <input
                                  required
                                  type="text"
                                  placeholder="Enter your city name..."
                                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 outline-none text-black text-xs font-medium"
                                  style={{ '--tw-ring-color': settings.primaryColor } as any}
                                  value={formData.customNeighborhood}
                                  onChange={e => setFormData({ ...formData, customNeighborhood: e.target.value })}
                                />
                                <p className="text-[10px] text-amber-800 font-medium italic">
                                  * Since this city is not in the automatic list, the delivery fee will be confirmed via WhatsApp.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-xs font-bold uppercase text-black">{t.street} *</label>
                              <input 
                                required
                                type="text" 
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.street}
                                onChange={e => setFormData({...formData, street: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-black">{t.number}</label>
                              <input 
                                type="text" 
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.number}
                                onChange={e => setFormData({...formData, number: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-black">{t.zipCode || 'Zip Code'} *</label>
                              <input 
                                required
                                type="text" 
                                placeholder="12345"
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.zipCode}
                                onChange={e => {
                                  let val = e.target.value.replace(/[^\d-]/g, '');
                                  if (val.length > 10) val = val.slice(0, 10);
                                  setFormData({...formData, zipCode: val});
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-black">{t.state} (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. CA, NY, SP..."
                                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                                value={formData.state}
                                onChange={e => setFormData({...formData, state: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-1">
                          <p className="text-xs font-bold text-amber-950">
                            📍 Store Pick Up
                          </p>
                          <p className="text-[11px] text-amber-900/80">
                            You will pick up your order directly at our address, with no added delivery charge.
                          </p>
                        </div>
                      )}

                      {/* DELIVERY / PICK UP DATE & TIME */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3 overflow-hidden">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-900 text-white flex items-center justify-center shrink-0 shadow-2xs" style={{ backgroundColor: settings.primaryColor || '#865d39' }}>
                            <Calendar size={17} />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs uppercase text-amber-950 tracking-wider">
                              {formData.deliveryOption === 'delivery' ? 'Delivery Date & Time *' : 'Pick Up Date & Time *'}
                            </h5>
                            <p className="text-[10px] sm:text-[11px] text-amber-800">
                              {formData.deliveryOption === 'delivery'
                                ? 'Select your preferred date and time for delivery'
                                : 'Select your preferred date and time for pickup'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 sm:gap-3.5 pt-1">
                          {/* Date Field */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 uppercase">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-amber-900" />
                                Date (Calendar) *
                              </span>
                              <span className="text-[10px] text-amber-800/80 lowercase font-medium">MM/DD/YYYY</span>
                            </div>
                            <input 
                              type="date"
                              required
                              value={formData.scheduledDate}
                              onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full py-2 px-2.5 rounded-xl border border-gray-300 bg-white text-black text-xs font-semibold focus:ring-2 outline-none cursor-pointer"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                            />
                          </div>

                          {/* Preferred Time Field */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 uppercase">
                              <span className="flex items-center gap-1.5">
                                <Clock size={13} className="text-amber-900" />
                                Preferred Time *
                              </span>
                              <span className="text-[10px] text-amber-800/80 uppercase font-medium">AM / PM</span>
                            </div>
                            <div className="flex items-center gap-1 w-full min-w-0">
                              {/* Hour */}
                              <select
                                value={deliveryHour}
                                onChange={e => setDeliveryHour(e.target.value)}
                                className="w-[52px] sm:w-[58px] py-2 px-1 text-center rounded-xl border border-gray-300 bg-white text-black text-xs font-bold focus:ring-2 outline-none cursor-pointer shrink-0"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                              >
                                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>

                              <span className="font-bold text-gray-500 text-xs shrink-0">:</span>

                              {/* Minute */}
                              <select
                                value={deliveryMinute}
                                onChange={e => setDeliveryMinute(e.target.value)}
                                className="w-[52px] sm:w-[58px] py-2 px-1 text-center rounded-xl border border-gray-300 bg-white text-black text-xs font-bold focus:ring-2 outline-none cursor-pointer shrink-0"
                                style={{ '--tw-ring-color': settings.primaryColor } as any}
                              >
                                {['00', '15', '30', '45'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>

                              {/* AM / PM Toggle */}
                              <div className="flex rounded-xl border border-gray-300 p-0.5 bg-gray-100 shrink-0 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => setDeliveryPeriod('AM')}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer",
                                    deliveryPeriod === 'AM'
                                      ? "text-white shadow-xs"
                                      : "text-gray-600 hover:text-black"
                                  )}
                                  style={deliveryPeriod === 'AM' ? { backgroundColor: settings.primaryColor || '#865d39' } : {}}
                                >
                                  AM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeliveryPeriod('PM')}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer",
                                    deliveryPeriod === 'PM'
                                      ? "text-white shadow-xs"
                                      : "text-gray-600 hover:text-black"
                                  )}
                                  style={deliveryPeriod === 'PM' ? { backgroundColor: settings.primaryColor || '#865d39' } : {}}
                                >
                                  PM
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.observation}</label>
                        <textarea 
                          rows={2}
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.observacao}
                          onChange={e => setFormData({...formData, observacao: e.target.value})}
                        />
                      </div>

                      {/* Resumo com Taxa de Entrega e Total */}
                      {(() => {
                        const selectedNeighborhoodObj = (settings.deliveryNeighborhoods || []).find(n => n.name === formData.neighborhood);
                        const deliveryFee = formData.deliveryOption === 'delivery'
                          ? (formData.neighborhood === 'Outro' ? 0 : Number(selectedNeighborhoodObj?.fee || 0))
                          : 0;
                        const finalTotal = cartTotal + deliveryFee;

                        return (
                          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-2xs space-y-2 text-xs">
                            <div className="flex justify-between text-gray-700">
                              <span>Items Subtotal:</span>
                              <span className="font-bold text-black">{currencySymbol}{cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                              <span>Delivery Fee:</span>
                              <span className="font-bold text-black">
                                {formData.deliveryOption === 'pickup'
                                  ? 'Free (Store Pick Up)'
                                  : formData.neighborhood === 'Outro'
                                    ? 'To be agreed (WhatsApp)'
                                    : formData.neighborhood
                                      ? `${currencySymbol}${deliveryFee.toFixed(2)}`
                                      : 'Select delivery area'}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-black">
                              <span>Total Amount:</span>
                              <span className="text-lg font-black" style={{ color: settings.primaryColor || '#000000' }}>
                                {currencySymbol}{finalTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-6 py-4 rounded-xl bg-white border border-gray-200 font-bold"
                          style={{ color: '#000000' }}
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className={`flex-grow py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          {isSubmitting 
                            ? (settings.language === 'en' ? 'Processing...' : 'Processando...') 
                            : t.finish}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductForDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForDetails(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-black font-sans force-dark-headings"
              style={{ '--text-color': '#000000' } as any}
            >
              {/* Close button top right overlay */}
              <button
                onClick={() => setSelectedProductForDetails(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm rounded-full transition-all border-0 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Scrollable Container */}
              <div className="overflow-y-auto w-full flex-grow">
                {/* Hero Product Image */}
                <div className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src={selectedProductForDetails.image} 
                    alt={selectedProductForDetails.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Title & Stats */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-black leading-tight">
                        {selectedProductForDetails.title}
                      </h2>
                      {selectedProductForDetails.trackStock && (
                        (selectedProductForDetails.stockQuantity ?? 0) > 0 ? (
                          <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                            {selectedProductForDetails.stockQuantity} {selectedProductForDetails.stockQuantity === 1 ? 'unit ready in stock' : 'units ready in stock'}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700 border border-red-200">
                            Sold Out
                          </span>
                        )
                      )}
                    </div>
                    {selectedProductForDetails.categoryTitle && (
                      <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-950 rounded-lg">
                        {selectedProductForDetails.categoryTitle}
                      </span>
                    )}
                  </div>

                  {/* Pricing and Size Options Display */}
                  <div className="p-4 rounded-2xl bg-white/50 border border-white/20">
                    {selectedProductForDetails.isCustomBox ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-xl font-bold text-amber-950 block font-serif">
                            {selectedProductForDetails.price > 0 
                              ? `Base ${currencySymbol}${selectedProductForDetails.price.toFixed(2)} + items` 
                              : `Box (${selectedProductForDetails.boxCapacity || 24} units)`}
                          </span>
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Price calculated per item
                          </span>
                        </div>
                        <p className="text-[11px] text-black/60 font-semibold leading-relaxed">
                          Choose the flavors below to assemble your box. Each unit is added to the final total.
                        </p>
                      </div>
                    ) : (selectedProductForDetails.isCustomCake || selectedProductForDetails.priceType === 'consult' || (!selectedProductForDetails.price && !selectedProductForDetails.oldPrice && (!selectedProductForDetails.sizes || selectedProductForDetails.sizes.length === 0))) ? (
                      <div className="space-y-1">
                        <span className="text-xl font-bold text-amber-950 block font-serif">
                          On Request
                        </span>
                        <p className="text-[11px] text-black/60 font-semibold leading-relaxed">
                          Configure your preferences by clicking to add/customize.
                        </p>
                      </div>
                    ) : selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-black/80 uppercase tracking-wider">
                            Choose package size / quantity:
                          </p>
                          <span className="text-[10px] font-bold text-amber-900/60 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {selectedProductForDetails.sizes.length} options available
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {selectedProductForDetails.sizes.map((s, idx) => {
                            const isSelected = selectedSize?.id === s.id;
                            const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                            const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                            const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                            const isCustomSandwichOpt = !!selectedProductForDetails.isCustomSandwich;
                            const requiresCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;

                            if (requiresCustomization) {
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSize(s);
                                    if (selectedProductForDetails.isCustomSandwich) {
                                      setSelectedSandwichFillings([]);
                                    }
                                  }}
                                  className={cn(
                                    "w-full flex flex-col items-center justify-center text-center p-3.5 rounded-2xl font-bold text-black text-xs border-2 transition-all cursor-pointer relative",
                                    isSelected 
                                      ? "border-amber-600 bg-white shadow-md scale-[1.01]" 
                                      : "border-gray-200/60 bg-white/80 hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap text-center">
                                    <span className="text-sm font-bold text-black">{s.name}</span>
                                    {typeof s.stockQuantity === 'number' && (
                                      <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-none",
                                        s.stockQuantity > 0 
                                          ? "bg-amber-50 text-amber-900 border-amber-200" 
                                          : "bg-red-100 text-red-700 border-red-200"
                                      )}>
                                        {s.stockQuantity > 0 ? `${s.stockQuantity} units` : 'Sold Out'}
                                      </span>
                                    )}
                                  </div>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs text-amber-900 font-black mt-0.5 text-center">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full border border-amber-600 bg-amber-600 text-white flex items-center justify-center">
                                      <Check size={11} />
                                    </div>
                                  )}
                                </button>
                              );
                            }

                            const cartItem = cart.find(item => item.productId === selectedProductForDetails.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            const isSizeOutOfStock = typeof s.stockQuantity === 'number' && s.stockQuantity <= 0;

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex justify-between items-center p-3.5 bg-white rounded-2xl border transition-all shadow-xs",
                                  isSizeOutOfStock ? "opacity-60 bg-gray-50/50" : (qty > 0 ? "border-amber-500/50 bg-amber-50/20" : "border-gray-200/70")
                                )}
                              >
                                <div className="flex flex-col pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-bold text-gray-950 leading-snug">{s.name}</span>
                                    {typeof s.stockQuantity === 'number' && (
                                      <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-none",
                                        s.stockQuantity > 0 
                                          ? "bg-amber-50 text-amber-900 border-amber-200" 
                                          : "bg-red-100 text-red-700 border-red-200"
                                      )}>
                                        {s.stockQuantity > 0 ? `${s.stockQuantity} units` : 'Sold Out'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-baseline gap-1.5 mt-0.5">
                                    {Boolean(s.oldPrice && s.oldPrice > s.price) && (
                                      <span className="text-xs text-gray-400 line-through font-semibold">
                                        {currencySymbol}{s.oldPrice!.toFixed(2)}
                                      </span>
                                    )}
                                    {typeof s.price === 'number' && s.price > 0 && (
                                      <span className="text-sm text-amber-950 font-black">
                                        {currencySymbol}{s.price.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {isSizeOutOfStock ? (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200">
                                      Sold Out
                                    </span>
                                  ) : qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                        aria-label="Increase quantity"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1 focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>Add</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif font-black text-black">
                          {currencySymbol}{(selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0)).toFixed(2)}
                        </p>
                        {Boolean(selectedProductForDetails.price > 0 && selectedProductForDetails.oldPrice && selectedProductForDetails.oldPrice > 0) && (
                          <span className="text-sm line-through opacity-40">
                            {currencySymbol}{selectedProductForDetails.oldPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extended Description Section */}
                  <div className="space-y-2 text-black">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Product Description</h3>
                    <p className="text-sm leading-relaxed text-black/80 font-medium whitespace-pre-wrap">
                      {selectedProductForDetails.description || 'No detailed specifications provided.'}
                    </p>
                  </div>

                  {/* Ingredients Section */}
                  {selectedProductForDetails.ingredients && (
                    <div className="space-y-1.5 pt-3 border-t border-gray-200/40 text-black">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Ingredients</h3>
                      <p className="text-xs leading-relaxed text-black/75 font-medium whitespace-pre-wrap">
                        {selectedProductForDetails.ingredients}
                      </p>
                    </div>
                  )}

                  {/* Cupcake & Customizable Sweets Customization */}
                  {selectedProductForDetails.isCustomCupcake && (() => {
                    const hasDoughs = Boolean(selectedProductForDetails.cupcakeDoughs && selectedProductForDetails.cupcakeDoughs.length > 0);
                    const hasFillings = Boolean(selectedProductForDetails.cupcakeFillings && selectedProductForDetails.cupcakeFillings.length > 0);
                    const hasFrostings = Boolean(selectedProductForDetails.cupcakeFrostings && selectedProductForDetails.cupcakeFrostings.length > 0);
                    const hasFlavors = Boolean(selectedProductForDetails.cupcakeFlavors && selectedProductForDetails.cupcakeFlavors.length > 0);

                    if (!hasDoughs && !hasFillings && !hasFrostings && !hasFlavors) {
                      return null;
                    }

                    let stepCounter = 0;
                    const doughStep = hasDoughs ? ++stepCounter : 0;
                    const fillingStep = hasFillings ? ++stepCounter : 0;
                    const frostingStep = hasFrostings ? ++stepCounter : 0;
                    const flavorStep = hasFlavors ? ++stepCounter : 0;

                    return (
                      <div className="border-t border-gray-200/40 pt-5 space-y-6">
                        {/* Step: Choose Batter / Dough Flavor */}
                        {hasDoughs && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black uppercase tracking-wider text-black/80 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center">
                                  {doughStep}
                                </span>
                                Choose Batter / Dough Flavor *
                              </label>
                              {selectedCupcakeDough && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                  Selected: {selectedCupcakeDough}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedProductForDetails.cupcakeDoughs!.map((dough, dIdx) => {
                                const isSelected = selectedCupcakeDough === dough;
                                return (
                                  <button
                                    key={dIdx}
                                    type="button"
                                    onClick={() => setSelectedCupcakeDough(dough)}
                                    className={cn(
                                      "p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2",
                                      isSelected
                                        ? "border-amber-700 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-700"
                                        : "border-gray-200/80 bg-white/90 hover:border-gray-300 text-black"
                                    )}
                                  >
                                    <span>{dough}</span>
                                    {isSelected && <Check size={14} className="text-amber-700 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Step: Choose Filling Option */}
                        {hasFillings && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black uppercase tracking-wider text-black/80 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center">
                                  {fillingStep}
                                </span>
                                Choose Filling Option *
                              </label>
                              {selectedCupcakeFilling && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                  Selected: {selectedCupcakeFilling}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedProductForDetails.cupcakeFillings!.map((filling, fiIdx) => {
                                const isSelected = selectedCupcakeFilling === filling;
                                return (
                                  <button
                                    key={fiIdx}
                                    type="button"
                                    onClick={() => setSelectedCupcakeFilling(filling)}
                                    className={cn(
                                      "p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2",
                                      isSelected
                                        ? "border-amber-700 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-700"
                                        : "border-gray-200/80 bg-white/90 hover:border-gray-300 text-black"
                                    )}
                                  >
                                    <span>{filling}</span>
                                    {isSelected && <Check size={14} className="text-amber-700 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Step: Choose Frosting / Topping */}
                        {hasFrostings && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black uppercase tracking-wider text-black/80 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center">
                                  {frostingStep}
                                </span>
                                Choose Frosting / Topping *
                              </label>
                              {selectedCupcakeFrosting && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                  Selected: {selectedCupcakeFrosting}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedProductForDetails.cupcakeFrostings!.map((frosting, fIdx) => {
                                const isSelected = selectedCupcakeFrosting === frosting;
                                return (
                                  <button
                                    key={fIdx}
                                    type="button"
                                    onClick={() => setSelectedCupcakeFrosting(frosting)}
                                    className={cn(
                                      "p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2",
                                      isSelected
                                        ? "border-amber-700 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-700"
                                        : "border-gray-200/80 bg-white/90 hover:border-gray-300 text-black"
                                    )}
                                  >
                                    <span>{frosting}</span>
                                    {isSelected && <Check size={14} className="text-amber-700 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Step: Choose Available Flavor */}
                        {hasFlavors && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black uppercase tracking-wider text-black/80 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center">
                                  {flavorStep}
                                </span>
                                Choose Flavor *
                              </label>
                              {selectedCupcakeFlavor && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                  Selected: {selectedCupcakeFlavor}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedProductForDetails.cupcakeFlavors!.map((flavor, flIdx) => {
                                const isSelected = selectedCupcakeFlavor === flavor;
                                return (
                                  <button
                                    key={flIdx}
                                    type="button"
                                    onClick={() => setSelectedCupcakeFlavor(flavor)}
                                    className={cn(
                                      "p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2",
                                      isSelected
                                        ? "border-amber-700 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-700"
                                        : "border-gray-200/80 bg-white/90 hover:border-gray-300 text-black"
                                    )}
                                  >
                                    <span>{flavor}</span>
                                    {isSelected && <Check size={14} className="text-amber-700 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Custom Box / Kit Customization (Monte sua Caixa) */}
                  {selectedProductForDetails.isCustomBox && (() => {
                    const capacity = selectedProductForDetails.boxCapacity || 24;
                    const maxFlavorsLimit = (typeof selectedProductForDetails.boxMaxFlavors === 'number' && selectedProductForDetails.boxMaxFlavors > 0)
                      ? selectedProductForDetails.boxMaxFlavors
                      : null;
                    const flavors = getResolvedBoxFlavors(selectedProductForDetails, products, categories);
                    const currentTotalUnits = flavors.reduce((sum, f) => sum + (boxFlavorQuantities[f.id || f.name] || 0), 0);
                    const remainingUnits = Math.max(0, capacity - currentTotalUnits);
                    const isComplete = currentTotalUnits === capacity;
                    const isOver = currentTotalUnits > capacity;

                    // Active flavors chosen (qty > 0)
                    const chosenFlavorsCount = flavors.filter(f => (boxFlavorQuantities[f.id || f.name] || 0) > 0).length;
                    const hasReachedMaxVariety = maxFlavorsLimit !== null && chosenFlavorsCount >= maxFlavorsLimit;

                    const currentTotalFlavorPrice = flavors.reduce((sum, f) => {
                      const qty = boxFlavorQuantities[f.id || f.name] || 0;
                      return sum + (qty * (f.price || 0));
                    }, 0);
                    const totalBoxPrice = (selectedProductForDetails.price || 0) + currentTotalFlavorPrice;

                    return (
                      <div className="border-t border-gray-200/50 pt-5 space-y-4">
                        {/* Box Header & Capacity Summary Card */}
                        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🎁</span>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-amber-950 font-serif">
                                  Build Your Box ({capacity} units)
                                </h4>
                                <p className="text-[11px] text-amber-900/80 font-medium">
                                  {maxFlavorsLimit !== null 
                                    ? `Choose up to ${maxFlavorsLimit} different flavors to fill your ${capacity}-piece box.`
                                    : `Select your flavors below to fill your ${capacity}-piece box.`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-2xs border",
                                isComplete
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : isOver
                                    ? "bg-red-600 text-white border-red-700"
                                    : "bg-amber-800 text-white border-amber-900"
                              )}>
                                {isComplete ? (
                                  <>
                                    <Check size={12} className="stroke-[3]" />
                                    <span>Box Complete ({currentTotalUnits}/{capacity})</span>
                                  </>
                                ) : isOver ? (
                                  <span>Limit Exceeded ({currentTotalUnits}/{capacity})</span>
                                ) : (
                                  <span>{currentTotalUnits} of {capacity} units selected</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="w-full bg-amber-200/70 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-300 rounded-full",
                                  isComplete ? "bg-emerald-600" : isOver ? "bg-red-500" : "bg-amber-800"
                                )}
                                style={{ width: `${Math.min(100, (currentTotalUnits / capacity) * 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                              <span>
                                {isComplete 
                                  ? '✓ All units chosen! Ready to add.' 
                                  : `${remainingUnits} unit${remainingUnits === 1 ? '' : 's'} remaining to complete box`}
                              </span>
                              <span className="font-serif font-black text-sm text-amber-950">
                                Box Total: {currencySymbol}{totalBoxPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Variety limit badge */}
                          {maxFlavorsLimit !== null && (
                            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-950 bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-200/80">
                              <span>Different Flavors Allowed:</span>
                              <span className="font-bold">
                                {chosenFlavorsCount} of {maxFlavorsLimit} chosen
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Flavors List */}
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-wider text-black/80 flex items-center justify-between">
                            <span>Choose Flavors & Quantities:</span>
                            <span className="text-[11px] text-gray-500 font-semibold normal-case">
                              {maxFlavorsLimit !== null 
                                ? `Max ${maxFlavorsLimit} flavors • ${capacity} units total`
                                : `Max capacity: ${capacity} units`}
                            </span>
                          </label>

                          {flavors.length === 0 ? (
                            <p className="text-xs text-gray-500 italic p-4 bg-white/70 rounded-xl border border-dashed border-gray-300 text-center">
                              No flavors configured for this box yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                              {flavors.map((flavor, fIdx) => {
                                const flavorKey = flavor.id || flavor.name;
                                const qty = boxFlavorQuantities[flavorKey] || 0;
                                const unitPrice = flavor.price || 0;
                                const isLockedByVariety = hasReachedMaxVariety && qty === 0;
                                const isLockedByCapacity = currentTotalUnits >= capacity;
                                const isAddDisabled = isLockedByCapacity || isLockedByVariety;

                                return (
                                  <div
                                    key={flavorKey || fIdx}
                                    className={cn(
                                      "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white shadow-xs",
                                      qty > 0 
                                        ? "border-amber-700 bg-amber-50/40 ring-1 ring-amber-700/50" 
                                        : isLockedByVariety
                                          ? "border-gray-200/60 bg-gray-50/70 opacity-60"
                                          : "border-gray-200/90"
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-xs text-gray-900 truncate">
                                          {flavor.name}
                                        </p>
                                        {isLockedByVariety && (
                                          <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                            Limit reached
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] font-extrabold text-amber-900 mt-0.5">
                                        {unitPrice > 0 ? `+${currencySymbol}${unitPrice.toFixed(2)} / unit` : 'Included'}
                                      </p>
                                    </div>

                                    {/* Stepper with Lock */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        disabled={qty <= 0}
                                        onClick={() => {
                                          setBoxFlavorQuantities(prev => ({
                                            ...prev,
                                            [flavorKey]: Math.max(0, (prev[flavorKey] || 0) - 1)
                                          }));
                                        }}
                                        className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border",
                                          qty > 0
                                            ? "bg-white hover:bg-gray-100 text-black border-gray-300 active:scale-95 cursor-pointer shadow-xs"
                                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-40"
                                        )}
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus size={12} />
                                      </button>

                                      <span className="w-6 text-center text-xs font-black text-black">
                                        {qty}
                                      </span>

                                      <button
                                        type="button"
                                        disabled={isAddDisabled}
                                        onClick={() => {
                                          if (isLockedByVariety) {
                                            toast.error(`You can choose up to ${maxFlavorsLimit} different flavors for this box!`);
                                            return;
                                          }
                                          if (currentTotalUnits < capacity) {
                                            setBoxFlavorQuantities(prev => ({
                                              ...prev,
                                              [flavorKey]: (prev[flavorKey] || 0) + 1
                                            }));
                                          }
                                        }}
                                        className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs",
                                          !isAddDisabled
                                            ? "text-white active:scale-95 cursor-pointer"
                                            : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-40"
                                        )}
                                        style={!isAddDisabled ? {
                                          backgroundColor: settings.primaryColor || '#865d39',
                                          color: getContrastText(settings.primaryColor || '#865d39')
                                        } : {}}
                                        aria-label="Increase quantity"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Custom Cake Options in Details Modal */}
                  {selectedProductForDetails.isCustomCake && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Cake Customization</h4>
                      
                      {/* Size Selection */}
                      {cakeSizesList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Size / Slices / Weight</p>
                          <div className="grid grid-cols-1 gap-2">
                            {cakeSizesList.map((sizeOpt, idx) => {
                              const isSelected = selectedCakeSize === sizeOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedCakeSize(sizeOpt)}
                                  className={cn(
                                    "p-3 rounded-xl border-2 transition-all flex items-center justify-center text-center w-full font-bold text-xs cursor-pointer",
                                    isSelected 
                                      ? "shadow-md scale-[1.01]" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span className="text-center px-4">{sizeOpt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dough Selection */}
                      {cakeDoughsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Dough Selection</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeDoughsList.map((doughOpt, idx) => {
                              const isSelected = selectedDough === doughOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedDough(doughOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-center text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span className="text-center">{doughOpt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fillings Selection */}
                      {cakeFillingsList.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs font-bold text-black/60">Filling Options</p>
                            <span className="text-[10px] text-gray-500 font-bold">Choose up to {settings.cakeFillingsMax || 2}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeFillingsList.map((fillingOpt, idx) => {
                              const isSelected = selectedFillings.includes(fillingOpt);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                    } else {
                                      const maxFillings = settings.cakeFillingsMax || 2;
                                      if (selectedFillings.length >= maxFillings) {
                                        toast.error(`You can choose a maximum of ${maxFillings} fillings!`);
                                        return;
                                      }
                                      setSelectedFillings([...selectedFillings, fillingOpt]);
                                    }
                                  }}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-center text-center font-bold text-xs cursor-pointer min-h-[46px]",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span className="text-center w-full px-3 leading-snug">{fillingOpt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toppings Selection */}
                      {cakeToppingsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Topping / Frosting Selection</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeToppingsList.map((toppingOpt, idx) => {
                              const isSelected = selectedTopping === toppingOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopping(toppingOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-center text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span className="text-center">{toppingOpt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Topper Selection */}
                      {cakeToppersList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Cake Topper</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeToppersList.map((topperOpt, idx) => {
                              const isSelected = selectedTopper === topperOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopper(topperOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-center text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span className="text-center">{topperOpt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Style Selection Reference */}
                      {selectedProductForDetails.cakeGalleryId && (
                        (() => {
                          const associatedGallery = galleries.find(g => g.id === selectedProductForDetails.cakeGalleryId);
                          const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                          if (validImages.length === 0) return null;
                          
                          const isNoRefSelected = selectedStyleNumber === null;

                          return (
                            <div className="space-y-3 pt-2">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-black/80">Select One of the Images as Visual Reference</p>
                                <p className="text-[10px] text-gray-500 font-semibold">Please choose one of the photos below as the visual reference for your cake:</p>
                              </div>

                              {/* 1. Images Grid */}
                              <div className="grid grid-cols-3 gap-2">
                                {associatedGallery?.images?.map((img, idx) => {
                                  if (!img || img.trim() === '') return null;
                                  const isSelected = selectedStyleNumber === (idx + 1);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedStyleNumber(idx + 1)}
                                      className={cn(
                                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-white p-0 text-left cursor-pointer",
                                        isSelected ? "scale-[1.01]" : "border-gray-200 hover:border-gray-300"
                                      )}
                                      style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                    >
                                      <img
                                        src={img}
                                        alt={`Style ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute top-1 left-1 bg-black/75 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                                        #{idx + 1}
                                      </div>
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                            <Check size={12} />
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* 2. Button "I didn't find the reference I'm looking for" placed below the images */}
                              <div className="w-full pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStyleNumber(null)}
                                  className={cn(
                                    "w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 border-2 cursor-pointer uppercase tracking-wider text-center",
                                    isNoRefSelected
                                      ? "shadow-md text-white border-transparent"
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{
                                    backgroundColor: isNoRefSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isNoRefSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {isNoRefSelected ? <Check size={14} /> : <HelpCircle size={14} />}
                                  <span>{isNoRefSelected ? "✓ Selected: I didn't find the reference I'm looking for" : "I didn't find the reference I'm looking for"}</span>
                                </button>
                              </div>

                              {/* 3. Special Notes & Observations field placed below the button */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-xs font-bold text-black/80 flex items-center justify-between">
                                  <span>Special Notes & Observations</span>
                                  <span className="text-[10px] text-gray-500 font-normal">Optional</span>
                                </label>
                                <textarea
                                  value={customCakeObservation}
                                  onChange={(e) => setCustomCakeObservation(e.target.value)}
                                  placeholder="Describe colors, theme details, names, ages, or any custom instructions here..."
                                  rows={2}
                                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-black/50 focus:ring-1 focus:ring-black/20 focus:outline-none text-xs text-black placeholder:text-gray-400 bg-white resize-none shadow-sm"
                                />
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* Customizable Meal Options in Details Modal */}
                  {selectedProductForDetails.isMeal && (() => {
                    const hasExclusions = !!(selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                    const hasSides = !!(selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                    if (!hasExclusions && !hasSides) return null;
                    return (
                      <div className="border-t border-gray-200/30 pt-6 space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Customize Meal</h4>
                        
                        {/* Exclusions */}
                        {selectedProductForDetails.ingredients && (() => {
                          const ingredientsList = selectedProductForDetails.ingredients
                            .split(',')
                            .map(i => i.trim())
                            .filter(Boolean);
                          if (ingredientsList.length === 0) return null;
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-black/60">{t.excludeIngredients}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ingredientsList.map((ingredient, idx) => {
                                  const isSelected = mealSelections.removals.includes(ingredient);
                                  return (
                                    <button 
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setMealSelections({
                                            ...mealSelections,
                                            removals: mealSelections.removals.filter(r => r !== ingredient)
                                          });
                                        } else {
                                          setMealSelections({
                                            ...mealSelections,
                                            removals: [...mealSelections.removals, ingredient]
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-full border-2 font-bold transition-all text-xs cursor-pointer",
                                        isSelected 
                                          ? "bg-red-500 border-red-500 text-white shadow-sm" 
                                          : "bg-white border-gray-200 text-black"
                                      )}
                                    >
                                      {ingredient}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Sides and Swaps */}
                        {selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.length > 0 && (
                          (() => {
                            const allowedSidesList = (selectedProductForDetails.allowedSides || [])
                              .map(id => sides.find(s => s.id === id))
                              .filter(Boolean) as Side[];
                            
                            const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                            const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                            if (regularSides.length === 0 && swapSides.length === 0) return null;

                            const renderSideItem = (side: Side) => {
                              const qty = sideQuantities[side.id] || 0;
                              return (
                                <div 
                                  key={side.id}
                                  className={cn(
                                    "p-3 rounded-xl border border-gray-200 font-bold transition-all flex justify-between items-center bg-white text-xs text-black shadow-sm"
                                  )}
                                >
                                  <div className="flex flex-col min-w-0 pr-2">
                                    <span className="font-bold text-black truncate">{side.name}</span>
                                    <span className="text-[10px] text-gray-500 font-extrabold mt-0.5">
                                      {side.price > 0 ? `+ ${currencySymbol}${side.price.toFixed(2)}` : 'Free'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <button 
                                      type="button"
                                      onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer border border-gray-200 focus:outline-none"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span className="w-4 text-center font-bold text-black">{qty}</span>
                                    <button 
                                      type="button"
                                      onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <div className="space-y-4">
                                {regularSides.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-black/60">{t.chooseSides}</p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {regularSides.map(renderSideItem)}
                                    </div>
                                  </div>
                                )}
                                {swapSides.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-amber-800">
                                      Swap Options
                                    </p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {swapSides.map(renderSideItem)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    );
                  })()}

                  {/* Customizable Sandwich / Special Options in Details Modal */}
                  {selectedProductForDetails.isCustomSandwich && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">
                        {settings.language === 'en' ? 'Custom Options & Flavors' : 'Opções e Sabores Personalizados'}
                      </h4>
                      
                      {/* Fillings Selection for Custom Sandwich */}
                      {selectedProductForDetails.customFillings && (() => {
                        const fillingsList = selectedProductForDetails.customFillings
                          .split(',')
                          .map(f => f.trim())
                          .filter(Boolean);
                        if (fillingsList.length === 0) return null;
                        return (
                          <div className="space-y-4">
                            <p className="text-xs font-bold text-black/60">
                              {settings.language === 'en' ? 'Select Quantities per Option' : 'Selecione as Quantidades por Opção'}
                            </p>
                            <div className="grid grid-cols-1 gap-2.5">
                              {fillingsList.map((fillingOpt, idx) => {
                                const qty = sandwichFillingQuantities[fillingOpt] || 0;
                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl border transition-all flex items-center justify-between font-bold text-xs bg-white/70 border-white/25 shadow-sm"
                                  >
                                    <span className="text-sm font-bold text-black">{fillingOpt}</span>
                                    
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={qty === 0}
                                        onClick={() => {
                                          setSandwichFillingQuantities(prev => ({
                                            ...prev,
                                            [fillingOpt]: Math.max(0, qty - 1)
                                          }));
                                        }}
                                        className={cn(
                                          "w-7 h-7 rounded-full bg-white flex items-center justify-center text-black border border-gray-200 shadow-xs cursor-pointer active:scale-95 transition-all text-xs font-bold",
                                          qty === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"
                                        )}
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-xs font-black min-w-[16px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSandwichFillingQuantities(prev => ({
                                            ...prev,
                                            [fillingOpt]: qty + 1
                                          }));
                                        }}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-xs cursor-pointer active:scale-95 transition-all text-xs font-bold"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Block */}
              <div className="p-4 pb-6 md:p-6 bg-white/40 border-t border-white/20 flex flex-col gap-4">
                {(() => {
                  const hasSizesOpt = !!(selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0);
                  const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                  const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                  const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                  const isCustomSandwichOpt = !!selectedProductForDetails.isCustomSandwich;
                  const isCustomBoxOpt = !!selectedProductForDetails.isCustomBox;
                  const requiresCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt || isCustomBoxOpt;
                  
                  const isSizesOnly = hasSizesOpt && !requiresCustomization;
                  const showGlobalQuantity = !isCustomSandwichOpt && !hasSizesOpt && !isCustomBoxOpt;

                  if (!showGlobalQuantity) return null;

                  return (
                    <div id="details-modal-qty-container" className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-white/10">
                      <span id="details-modal-qty-label" className="text-xs font-bold text-black uppercase tracking-wider">
                        {settings.language === 'en' ? 'Quantity' : 'Quantidade'}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button
                          id="details-modal-qty-dec-btn"
                          type="button"
                          onClick={() => setCustomItemQuantity(prev => Math.max(1, prev - 1))}
                          className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all text-sm font-bold border border-gray-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span id="details-modal-qty-value" className="text-sm font-black min-w-[20px] text-center text-black">{customItemQuantity}</span>
                        <button
                          id="details-modal-qty-inc-btn"
                          type="button"
                          onClick={() => setCustomItemQuantity(prev => prev + 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-sm font-bold"
                          style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const hasSizesOpt = !!(selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0);
                  const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                  const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                  const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                  const isCustomSandwichOpt = !!selectedProductForDetails.isCustomSandwich;
                  const requiresCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt;
                  const isSizesOnly = hasSizesOpt && !requiresCustomization;

                  if (isSizesOnly) {
                    const minVal = parseMoneyValue(settings.minOrderValue);
                    const isBelowMin = minVal > 0 && cartTotal < minVal;
                    const diff = Math.max(0, minVal - cartTotal);
                    const hasItemsInCart = cart.some(item => item.productId === selectedProductForDetails.id);

                    return (
                      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForDetails(null)}
                          className="px-5 py-3 rounded-xl border border-black/15 bg-white hover:bg-gray-50 text-black font-serif font-bold text-xs cursor-pointer transition-all focus:outline-none text-center"
                        >
                          ← Back to Menu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasItemsInCart && cart.length === 0) {
                              toast.error(
                                'Please select at least one option to add to cart, or click Back to Menu.'
                              );
                              return;
                            }
                            setSelectedProductForDetails(null);
                            setIsModalOpen(true);
                          }}
                          className="flex-grow py-3 px-5 rounded-xl font-serif font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all text-center border-0 focus:outline-none cursor-pointer flex justify-center items-center gap-1.5"
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          {isBelowMin ? (
                            <span>View Cart • Needed: {currencySymbol}{diff.toFixed(2)}</span>
                          ) : (
                            <span>View Cart ({currencySymbol}{cartTotal.toFixed(2)})</span>
                          )}
                        </button>
                      </div>
                    );
                  }

                  const isCakeIncomplete = selectedProductForDetails.isCustomCake && (
                    (cakeSizesList.length > 0 && !selectedCakeSize) ||
                    (cakeDoughsList.length > 0 && !selectedDough) ||
                    (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                    (cakeToppingsList.length > 0 && !selectedTopping) ||
                    (cakeToppersList.length > 0 && !selectedTopper)
                  );

                  const hasCupcakeDoughs = Boolean(selectedProductForDetails.cupcakeDoughs && selectedProductForDetails.cupcakeDoughs.length > 0);
                  const hasCupcakeFillings = Boolean(selectedProductForDetails.cupcakeFillings && selectedProductForDetails.cupcakeFillings.length > 0);
                  const hasCupcakeFrostings = Boolean(selectedProductForDetails.cupcakeFrostings && selectedProductForDetails.cupcakeFrostings.length > 0);
                  const hasCupcakeFlavors = Boolean(selectedProductForDetails.cupcakeFlavors && selectedProductForDetails.cupcakeFlavors.length > 0);

                  const isCupcakeIncomplete = Boolean(selectedProductForDetails.isCustomCupcake) && (
                    (hasCupcakeDoughs && !selectedCupcakeDough) || 
                    (hasCupcakeFillings && !selectedCupcakeFilling) ||
                    (hasCupcakeFrostings && !selectedCupcakeFrosting) ||
                    (hasCupcakeFlavors && !selectedCupcakeFlavor)
                  );

                  const isSandwichIncomplete = selectedProductForDetails.isCustomSandwich && (
                    (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0) === 0
                  );

                  const isCustomBoxOpt = Boolean(selectedProductForDetails.isCustomBox);
                  const boxCapacity = selectedProductForDetails.boxCapacity || 24;
                  const boxFlavorsList = getResolvedBoxFlavors(selectedProductForDetails, products, categories);
                  const currentBoxUnits = boxFlavorsList.reduce((sum, f) => sum + (boxFlavorQuantities[f.id || f.name] || 0), 0);
                  const isBoxIncomplete = isCustomBoxOpt && currentBoxUnits !== boxCapacity;

                  const boxFlavorsTotalPrice = boxFlavorsList.reduce((sum, f) => {
                    const qty = boxFlavorQuantities[f.id || f.name] || 0;
                    return sum + (qty * (f.price || 0));
                  }, 0);
                  const totalCalculatedBoxPrice = (selectedProductForDetails.price || 0) + boxFlavorsTotalPrice;

                  const basePrice = (selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 && selectedSize) 
                    ? selectedSize.price 
                    : (selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0));
                  
                  const sidesPrice = Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                    const side = sides.find(s => s.id === id);
                    return sum + (side ? side.price * (qty as number) : 0);
                  }, 0);

                  const totalPrice = basePrice + sidesPrice;

                  const isOutOfStock = !!(selectedProductForDetails.trackStock && (selectedProductForDetails.stockQuantity ?? 0) <= 0);

                  const getButtonLabel = () => {
                    if (isOutOfStock) {
                      return 'Sold Out';
                    }
                    if (isCustomBoxOpt) {
                      if (currentBoxUnits < boxCapacity) {
                        const missing = boxCapacity - currentBoxUnits;
                        return `Select ${missing} More ${missing === 1 ? 'Unit' : 'Units'} (${currentBoxUnits}/${boxCapacity})`;
                      } else if (currentBoxUnits > boxCapacity) {
                        return `Remove ${currentBoxUnits - boxCapacity} Units (Max ${boxCapacity})`;
                      }
                      return `Add Box to Order • ${currencySymbol}${totalCalculatedBoxPrice.toFixed(2)}`;
                    }
                    if (isCustomCakeOpt && isCakeIncomplete) {
                      return 'Complete Cake Options';
                    }
                    if (selectedProductForDetails.isCustomCupcake && isCupcakeIncomplete) {
                      const needsDough = hasCupcakeDoughs && !selectedCupcakeDough;
                      const needsFilling = hasCupcakeFillings && !selectedCupcakeFilling;
                      const needsFrosting = hasCupcakeFrostings && !selectedCupcakeFrosting;
                      const needsFlavor = hasCupcakeFlavors && !selectedCupcakeFlavor;
                      if (needsDough) return 'Choose Batter First';
                      if (needsFilling) return 'Choose Filling First';
                      if (needsFrosting) return 'Choose Frosting First';
                      if (needsFlavor) return 'Choose Flavor First';
                      return 'Choose Options First';
                    }
                    if (selectedProductForDetails.isCustomSandwich && isSandwichIncomplete) {
                      return 'Select Option First';
                    }
                    return 'Add to Order';
                  };

                  const isDisabled = isOutOfStock || !!isCakeIncomplete || !!isCupcakeIncomplete || !!isSandwichIncomplete || !!isBoxIncomplete;

                  const totalQty = selectedProductForDetails.isCustomSandwich
                    ? (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0)
                    : customItemQuantity;

                  return (
                    <div className="flex gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedProductForDetails(null)}
                        className="px-5 py-3 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black font-serif font-bold text-xs cursor-pointer transition-all border-0 focus:outline-none"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          const requiresFullCustomization = hasSizesOpt || hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt || isCustomSandwichOpt || Boolean(selectedProductForDetails.isCustomCupcake) || isCustomBoxOpt;
                          if (requiresFullCustomization) {
                            addDetailedProductToCart(selectedProductForDetails);
                          } else {
                            addToCart(selectedProductForDetails, customItemQuantity);
                            setSelectedProductForDetails(null);
                            toast.success('Item added to cart!');
                          }
                        }}
                        className={cn(
                          "flex-grow py-3 px-5 rounded-xl font-serif font-bold text-xs shadow-md transition-all text-center border-0 focus:outline-none cursor-pointer flex justify-center items-center gap-1.5",
                          isDisabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                        )}
                        style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                      >
                        <span>{getButtonLabel()}</span>
                        {!isCustomBoxOpt && totalPrice > 0 && (
                          <span className="opacity-80 font-normal">
                            ({currencySymbol}{(totalPrice * totalQty).toFixed(2)})
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMBO SELECTION MODAL */}
      <AnimatePresence>
        {selectedComboProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedComboProduct(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#ece6db] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 border border-white/40"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-5 border-b border-gray-200/60 bg-white/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {selectedComboProduct.image && (
                    <img 
                      src={selectedComboProduct.image} 
                      alt={selectedComboProduct.title} 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-gray-200 shrink-0 shadow-sm" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 inline-block mb-0.5">
                      Customizable Combo
                    </span>
                    <h3 className="font-serif font-bold text-sm sm:text-lg text-gray-900 truncate leading-tight">
                      {selectedComboProduct.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block leading-none">Price</span>
                    <span className="font-serif font-black text-sm sm:text-lg text-gray-900 whitespace-nowrap">
                      {currencySymbol} {(selectedComboProduct.price > 0 ? selectedComboProduct.price : (selectedComboProduct.oldPrice || 0)).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedComboProduct(null)} 
                    className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-600 hover:text-black shrink-0 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center border-0 bg-transparent"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Progress & Target Lock Banner */}
              {(() => {
                const targetQty = Number(selectedComboProduct.comboQuantity) || 5;
                const currentTotal = (Object.values(comboDishSelections) as number[]).reduce((a, b) => a + b, 0);
                const isComplete = currentTotal === targetQty;
                const remaining = targetQty - currentTotal;
                const progressPct = Math.min(100, (currentTotal / targetQty) * 100);

                return (
                  <div className={cn(
                    "p-3.5 sm:p-4 transition-colors border-b space-y-2",
                    isComplete 
                      ? "bg-emerald-50/90 border-emerald-200 text-emerald-950" 
                      : "bg-amber-50/90 border-amber-200 text-amber-950"
                  )}>
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide">
                      <span className="flex items-center gap-1.5">
                        {isComplete ? '✓ Combo Complete!' : `Choose your items/flavors:`}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold",
                        isComplete ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                      )}>
                        {currentTotal} of {targetQty} items selected
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-300 rounded-full",
                          isComplete ? "bg-emerald-600" : "bg-amber-600"
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <p className="text-[11px] font-medium leading-tight">
                      {isComplete ? (
                        <span className="text-emerald-800 font-bold">
                          All set! You selected all {targetQty} items. Click the button below to add to your order.
                        </span>
                      ) : remaining > 0 ? (
                        <span className="text-amber-900">
                          Select <strong>{remaining} more item(s)</strong> to reach the limit of {targetQty} items for this combo.
                        </span>
                      ) : (
                        <span className="text-red-700 font-bold">
                          You exceeded the limit! Please remove {Math.abs(remaining)} item(s).
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Body: Search and Dishes List */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-grow space-y-4">
                {selectedComboProduct.description && (
                  <p className="text-xs text-gray-600 italic bg-white/40 p-2.5 rounded-xl border border-black/5">
                    {selectedComboProduct.description}
                  </p>
                )}

                {/* Filter Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search flavor or item..."
                    value={comboSearchTerm}
                    onChange={e => setComboSearchTerm(e.target.value)}
                    className="w-full p-2.5 pl-9 text-xs rounded-xl border border-gray-300 bg-white text-black font-medium focus:ring-2 focus:ring-amber-800/30"
                  />
                </div>

                {/* List of Dishes */}
                {(() => {
                  const targetQty = Number(selectedComboProduct.comboQuantity) || 5;
                  const currentTotal = (Object.values(comboDishSelections) as number[]).reduce((a, b) => a + b, 0);

                  const allowedIds = selectedComboProduct.comboAllowedProductIds;
                  let availableDishes = products
                    .filter(p => !p.isCombo && p.isActive !== false)
                    .sort((a, b) => {
                      const orderA = typeof a.order === 'number' ? a.order : 9999;
                      const orderB = typeof b.order === 'number' ? b.order : 9999;
                      if (orderA !== orderB) return orderA - orderB;
                      return a.title.localeCompare(b.title);
                    });

                  if (allowedIds && allowedIds.length > 0) {
                    availableDishes = availableDishes.filter(p => allowedIds.includes(p.id));
                  }

                  if (comboSearchTerm.trim()) {
                    const term = comboSearchTerm.toLowerCase();
                    availableDishes = availableDishes.filter(p => {
                      const cat = categories.find(c => c.id === p.categoryId)?.title?.toLowerCase() || '';
                      return p.title.toLowerCase().includes(term) || cat.includes(term) || (p.description || '').toLowerCase().includes(term);
                    });
                  }

                  if (availableDishes.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-gray-500 font-medium bg-white/50 rounded-2xl border border-dashed border-gray-300 p-4">
                        No items available for this combo at the moment.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {availableDishes.map((dish) => {
                        const qty = comboDishSelections[dish.id] || 0;
                        const cat = categories.find(c => c.id === dish.categoryId);
                        const canAddMore = currentTotal < targetQty;

                        return (
                          <div 
                            key={dish.id}
                            className={cn(
                              "p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                              qty > 0 ? "bg-white border-amber-300 shadow-sm" : "bg-white/70 border-gray-200 hover:bg-white"
                            )}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-grow">
                              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 border border-gray-200">
                                {dish.image ? (
                                  <img src={dish.image} alt={dish.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">🍽️</div>
                                )}
                              </div>

                              <div className="min-w-0 space-y-1">
                                <h4 
                                  className="font-bold text-sm sm:text-base leading-snug break-words"
                                  style={{ color: settings.primaryColor || '#865d39' }}
                                >
                                  {dish.title}
                                </h4>

                                {/* Button to view full description */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDishForNutritionalInfo(dish)}
                                  className="text-xs font-bold underline hover:opacity-80 flex items-center cursor-pointer pt-0.5"
                                  style={{ color: settings.primaryColor || '#865d39' }}
                                >
                                  <span>View Description</span>
                                </button>
                              </div>
                            </div>

                            {/* Stepper Controls */}
                            <div className="flex items-center justify-end w-full sm:w-auto gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                              <span className="text-[11px] text-gray-500 sm:hidden font-bold">Quantity:</span>
                              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                <button
                                  type="button"
                                  disabled={qty === 0}
                                  onClick={() => {
                                    setComboDishSelections(prev => {
                                      const next = { ...prev };
                                      if (qty <= 1) {
                                        delete next[dish.id];
                                      } else {
                                        next[dish.id] = qty - 1;
                                      }
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-800 font-bold shadow-xs transition-all cursor-pointer",
                                    qty === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 active:scale-95"
                                  )}
                                >
                                  <Minus size={14} />
                                </button>

                                <span className="font-extrabold text-sm min-w-[24px] text-center text-gray-900">
                                  {qty}
                                </span>

                                <button
                                  type="button"
                                  disabled={!canAddMore}
                                  onClick={() => {
                                    if (!canAddMore) {
                                      toast.error(`You have already reached the limit of ${targetQty} items for this combo!`);
                                      return;
                                    }
                                    setComboDishSelections(prev => ({
                                      ...prev,
                                      [dish.id]: (prev[dish.id] || 0) + 1
                                    }));
                                  }}
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs transition-all cursor-pointer",
                                    !canAddMore ? "opacity-40 cursor-not-allowed bg-gray-400" : "hover:brightness-110 active:scale-95"
                                  )}
                                  style={{ backgroundColor: canAddMore ? (settings.primaryColor || '#865d39') : undefined }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Sticky Action */}
              {(() => {
                const targetQty = Number(selectedComboProduct.comboQuantity) || 5;
                const currentTotal = (Object.values(comboDishSelections) as number[]).reduce((a, b) => a + b, 0);
                const isComplete = currentTotal === targetQty;

                return (
                  <div className="p-4 sm:p-5 bg-white/70 border-t border-gray-200 flex gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedComboProduct(null)}
                      className="px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs cursor-pointer transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={!isComplete}
                      onClick={handleAddComboToCart}
                      className={cn(
                        "flex-grow py-3 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer",
                        !isComplete ? "opacity-50 cursor-not-allowed bg-gray-400 text-white" : "hover:brightness-110 active:scale-95"
                      )}
                      style={{ 
                        backgroundColor: isComplete ? (settings.primaryColor || '#865d39') : undefined,
                        color: isComplete ? getContrastText(settings.primaryColor || '#865d39') : undefined
                      }}
                    >
                      <span>
                        {isComplete 
                          ? `Add Combo (${currentTotal} Items) to Order`
                          : `Select ${targetQty - currentTotal} item(s) to complete`}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISH NUTRITIONAL & DESCRIPTION SUB-MODAL */}
      <AnimatePresence>
        {selectedDishForNutritionalInfo && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDishForNutritionalInfo(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-black font-sans force-dark-headings"
              style={{ '--text-color': '#000000' } as any}
            >
              {/* Close button top right overlay */}
              <button
                onClick={() => setSelectedDishForNutritionalInfo(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm rounded-full transition-all border-0 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Scrollable Container */}
              <div className="overflow-y-auto w-full flex-grow">
                {/* Hero Product Image */}
                {selectedDishForNutritionalInfo.image ? (
                  <div className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
                    <img 
                      src={selectedDishForNutritionalInfo.image} 
                      alt={selectedDishForNutritionalInfo.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-amber-100/50 flex items-center justify-center">
                    <Utensils size={40} className="text-amber-900/30" />
                  </div>
                )}

                <div className="p-6 md:p-8 space-y-6">
                  {/* Title & Category */}
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-black leading-tight">
                      {selectedDishForNutritionalInfo.title}
                    </h2>
                    {(() => {
                      const catTitle = selectedDishForNutritionalInfo.categoryTitle || categories.find(c => c.id === selectedDishForNutritionalInfo.categoryId)?.title;
                      return catTitle ? (
                        <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-950 rounded-lg">
                          {catTitle}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Pricing Display */}
                  {selectedDishForNutritionalInfo.price > 0 && (
                    <div className="p-4 rounded-2xl bg-white/50 border border-white/20">
                      <label className="text-[10px] font-black uppercase text-black/50 block tracking-wider mb-1">
                        PRICE DETAILS
                      </label>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif font-black text-black">
                          {currencySymbol}{selectedDishForNutritionalInfo.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Extended Description Section */}
                  {(selectedDishForNutritionalInfo.description || selectedDishForNutritionalInfo.ingredients) && (
                    <div className="space-y-2 text-black">
                      <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Product Description</h3>
                      {selectedDishForNutritionalInfo.description && (
                        <p className="text-sm leading-relaxed text-black/80 font-medium whitespace-pre-wrap">
                          {selectedDishForNutritionalInfo.description}
                        </p>
                      )}
                      {selectedDishForNutritionalInfo.ingredients && (
                        <p className="text-sm leading-relaxed text-black/80 font-medium whitespace-pre-wrap">
                          {selectedDishForNutritionalInfo.ingredients.toUpperCase().startsWith('INGREDIENTS:') || selectedDishForNutritionalInfo.ingredients.toUpperCase().startsWith('INGREDIENTES:')
                            ? selectedDishForNutritionalInfo.ingredients 
                            : `INGREDIENTS: ${selectedDishForNutritionalInfo.ingredients}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Block */}
              <div className="p-4 pb-6 md:p-6 bg-white/40 border-t border-white/20 flex flex-col gap-4">
                {(() => {
                  const targetQty = selectedComboProduct ? (Number(selectedComboProduct.comboQuantity) || 5) : 5;
                  const currentTotal = (Object.values(comboDishSelections) as number[]).reduce((a, b) => a + b, 0);
                  const currentDishQty = comboDishSelections[selectedDishForNutritionalInfo.id] || 0;
                  const canAddMore = currentTotal < targetQty;

                  return (
                    <>
                      {/* Quantity row */}
                      <div className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-white/10">
                        <span className="text-xs font-bold text-black uppercase tracking-wider">
                          Quantity in Combo
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={currentDishQty === 0}
                            onClick={() => {
                              setComboDishSelections(prev => {
                                const next = { ...prev };
                                if (currentDishQty <= 1) {
                                  delete next[selectedDishForNutritionalInfo.id];
                                } else {
                                  next[selectedDishForNutritionalInfo.id] = currentDishQty - 1;
                                }
                                return next;
                              });
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all text-sm font-bold border border-gray-200",
                              currentDishQty === 0 && "opacity-30 cursor-not-allowed"
                            )}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-black min-w-[20px] text-center text-black">
                            {currentDishQty}
                          </span>
                          <button
                            type="button"
                            disabled={!canAddMore}
                            onClick={() => {
                              if (!canAddMore) {
                                toast.error(`You have already reached the limit of ${targetQty} items for this combo!`);
                                return;
                              }
                              setComboDishSelections(prev => ({
                                ...prev,
                                [selectedDishForNutritionalInfo.id]: (prev[selectedDishForNutritionalInfo.id] || 0) + 1
                              }));
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-sm font-bold",
                              !canAddMore ? "opacity-30 cursor-not-allowed bg-gray-400" : ""
                            )}
                            style={{ backgroundColor: canAddMore ? (settings.primaryColor || '#865d39') : undefined }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 items-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDishForNutritionalInfo(null)}
                          className="px-5 py-3 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black font-serif font-bold text-xs cursor-pointer transition-all border-0 focus:outline-none whitespace-nowrap"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDishForNutritionalInfo(null)}
                          className="flex-grow py-3 px-5 rounded-xl font-serif font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all text-center border-0 focus:outline-none cursor-pointer flex justify-center items-center gap-1.5 whitespace-nowrap"
                          style={{ 
                            backgroundColor: settings.primaryColor || '#865d39', 
                            color: getContrastText(settings.primaryColor || '#865d39') 
                          }}
                        >
                          Confirm & Return to Combo
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomModalOpen && selectedProductForCustom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/30">
                <h2 className="text-2xl font-serif font-bold text-black" style={{ color: '#000000' }}>
                  {selectedProductForCustom.isCustomSandwich ? selectedProductForCustom.title : t.customCakeTitle}
                </h2>
                <button 
                  onClick={() => setIsCustomModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {selectedProductForCustom.isCustomSandwich ? (
                  <>
                    {/* Sizes Selection for Custom Sandwich */}
                    {selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                          {settings.language === 'en' ? 'Select Option' : 'Selecione a Opção de Estado'}
                        </h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          {selectedProductForCustom.sizes.map((s) => {
                            const isSelected = selectedSize?.id === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSize(s);
                                  setSelectedSandwichFillings([]);
                                }}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex justify-between items-center w-full text-left font-bold",
                                  isSelected 
                                    ? "shadow-md scale-[1.01]" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{s.name}</span>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs opacity-80 font-semibold mt-0.5">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: getContrastText(settings.primaryColor || '#865d39'), color: settings.primaryColor || '#865d39' }}>
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fillings Selection for Custom Sandwich */}
                    {selectedProductForCustom.customFillings && (() => {
                      const fillingsList = selectedProductForCustom.customFillings
                        .split(',')
                        .map(f => f.trim())
                        .filter(Boolean);
                      if (fillingsList.length === 0) return null;
                      return (
                        <div className="space-y-4 pt-4 border-t border-gray-200/30">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                            {settings.language === 'en' ? 'Select Quantities per Option' : 'Selecione as Quantidades por Opção'}
                          </h3>
                          <div className="grid grid-cols-1 gap-2.5">
                            {fillingsList.map((fillingOpt, idx) => {
                              const qty = sandwichFillingQuantities[fillingOpt] || 0;
                              return (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-2xl border transition-all flex items-center justify-between font-bold text-sm bg-white/70 border-white/25 shadow-sm"
                                >
                                  <span className="text-sm font-bold text-black">{fillingOpt}</span>
                                  
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={qty === 0}
                                      onClick={() => {
                                        setSandwichFillingQuantities(prev => ({
                                          ...prev,
                                          [fillingOpt]: Math.max(0, qty - 1)
                                        }));
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-full bg-white flex items-center justify-center text-black border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition-all text-sm font-bold",
                                        qty === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"
                                      )}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSandwichFillingQuantities(prev => ({
                                          ...prev,
                                          [fillingOpt]: qty + 1
                                        }));
                                      }}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-sm font-bold"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : selectedProductForCustom.isCustomCake ? (
                  <>
                    {/* Size Selection */}
                    {cakeSizesList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Size / Slices / Weight</h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          {cakeSizesList.map((sizeOpt, idx) => {
                            const isSelected = selectedCakeSize === sizeOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedCakeSize(sizeOpt)}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex items-center justify-center text-center w-full font-bold cursor-pointer",
                                  isSelected 
                                    ? "shadow-md scale-[1.01]" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="font-bold text-sm text-center px-4">
                                  {sizeOpt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dough Selection */}
                    {cakeDoughsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Dough Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeDoughsList.map((doughOpt, idx) => {
                            const isSelected = selectedDough === doughOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDough(doughOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-center text-center text-sm font-bold w-full cursor-pointer",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="text-center">{doughOpt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fillings Selection */}
                    {cakeFillingsList.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Filling Options</h3>
                          <span className="text-xs text-gray-500 font-bold">Choose up to {settings.cakeFillingsMax || 2}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cakeFillingsList.map((fillingOpt, idx) => {
                            const isSelected = selectedFillings.includes(fillingOpt);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                  } else {
                                    const maxFillings = settings.cakeFillingsMax || 2;
                                    if (selectedFillings.length >= maxFillings) {
                                      toast.error(`You can choose a maximum of ${maxFillings} fillings!`);
                                      return;
                                    }
                                    setSelectedFillings([...selectedFillings, fillingOpt]);
                                  }
                                }}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-center text-center font-bold text-sm cursor-pointer min-h-[52px]",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="text-center w-full px-3 leading-snug">{fillingOpt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Toppings Selection */}
                    {cakeToppingsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Topping Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeToppingsList.map((toppingOpt, idx) => {
                            const isSelected = selectedTopping === toppingOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopping(toppingOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-center text-center text-sm font-bold w-full cursor-pointer",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="text-center">{toppingOpt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Topper Selection */}
                    {cakeToppersList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Cake Topper</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {cakeToppersList.map((topperOpt, idx) => {
                            const isSelected = selectedTopper === topperOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopper(topperOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-center text-center text-sm font-bold w-full cursor-pointer",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="text-center">{topperOpt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Gallery Style Selection */}
                    {selectedProductForCustom.cakeGalleryId && (
                      (() => {
                        const associatedGallery = galleries.find(g => g.id === selectedProductForCustom.cakeGalleryId);
                        const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                        if (validImages.length === 0) return null;
                        
                        const isNoRefSelected = selectedStyleNumber === null;

                        return (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                              <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">
                                Select One of the Images as Visual Reference
                              </h3>
                              <p className="text-[11px] font-semibold text-gray-500 leading-normal">
                                Please choose one of the photos below as the visual reference for your cake:
                              </p>
                            </div>

                            {/* 1. Images Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {associatedGallery?.images?.map((img, idx) => {
                                if (!img || img.trim() === '') return null;
                                const isSelected = selectedStyleNumber === (idx + 1);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedStyleNumber(idx + 1)}
                                    className={cn(
                                      "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-white group p-0 text-left cursor-pointer shadow-sm hover:shadow",
                                      isSelected
                                        ? "scale-[1.01]"
                                        : "border-gray-200/50 hover:border-gray-300"
                                    )}
                                    style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                  >
                                    <img
                                      src={img}
                                      alt={`Style ${idx + 1}`}
                                      className="w-full h-full object-cover select-none"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Number Badge */}
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full z-10">
                                      Photo {idx + 1}
                                    </div>
                                    
                                    {/* Select Highlight Overlay */}
                                    <div className={cn(
                                      "absolute inset-0 transition-opacity flex items-center justify-center p-2 text-center",
                                      isSelected 
                                        ? "bg-black/35 opacity-100" 
                                        : "bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100"
                                    )}>
                                      {isSelected ? (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                          <Check size={18} />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full">Select</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* 2. "I didn't find the reference I'm looking for" Button (placed below the images) */}
                            <div className="w-full pt-1">
                              <button
                                type="button"
                                onClick={() => setSelectedStyleNumber(null)}
                                className={cn(
                                  "w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center text-center gap-2 border-2 cursor-pointer uppercase tracking-wider",
                                  isNoRefSelected
                                    ? "shadow-md text-white border-transparent"
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{
                                  backgroundColor: isNoRefSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isNoRefSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {isNoRefSelected ? <Check size={16} /> : <HelpCircle size={16} />}
                                <span>{isNoRefSelected ? "✓ Selected: I didn't find the reference I'm looking for" : "I didn't find the reference I'm looking for"}</span>
                              </button>
                            </div>

                            {/* 3. Special Notes & Observations field (placed below the button) */}
                            <div className="space-y-2 pt-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-black/80 flex items-center justify-between">
                                <span>Special Notes & Observations</span>
                                <span className="text-[10px] text-gray-500 font-normal">Optional</span>
                              </label>
                              <textarea
                                value={customCakeObservation}
                                onChange={(e) => setCustomCakeObservation(e.target.value)}
                                placeholder="Describe colors, theme details, names, ages, or any custom reference instructions here..."
                                rows={3}
                                className="w-full p-3 rounded-2xl border border-gray-200 focus:border-black/50 focus:ring-1 focus:ring-black/20 focus:outline-none text-xs text-black placeholder:text-gray-400 bg-white transition-all resize-none shadow-sm"
                              />
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </>
                ) : (
                  <>
                    {/* Size Selection */}
                    {selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                          Select Size / Portion
                        </h3>
                        <div className="space-y-2">
                          {selectedProductForCustom.sizes.map((s) => {
                            const cartItem = cart.find(item => item.productId === selectedProductForCustom.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            const isSizeOutOfStock = typeof s.stockQuantity === 'number' && s.stockQuantity <= 0;

                            return (
                              <div
                                key={s.id}
                                className={cn(
                                  "flex justify-between items-center p-3.5 bg-white border border-gray-200 rounded-2xl font-bold text-black text-xs shadow-sm",
                                  isSizeOutOfStock ? "opacity-60 bg-gray-50/50" : ""
                                )}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-bold text-black">{s.name}</span>
                                    {typeof s.stockQuantity === 'number' && (
                                      <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-none",
                                        s.stockQuantity > 0 
                                          ? "bg-amber-50 text-amber-900 border-amber-200" 
                                          : "bg-red-100 text-red-700 border-red-200"
                                      )}>
                                        {s.stockQuantity > 0 ? `${s.stockQuantity} units` : 'Sold Out'}
                                      </span>
                                    )}
                                  </div>
                                  {s.price && s.price > 0 && (
                                    <span className="text-xs text-gray-500 font-extrabold mt-0.5">
                                      {currencySymbol}{s.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {isSizeOutOfStock ? (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200">
                                      Sold Out
                                    </span>
                                  ) : qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>Add</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ingredient Exclusions */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.ingredients && (() => {
                      const ingredientsList = selectedProductForCustom.ingredients
                        .split(',')
                        .map(i => i.trim())
                        .filter(Boolean);
                      if (ingredientsList.length === 0) return null;
                      return (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#000000' }}>{t.excludeIngredients}</h3>
                          <div className="flex flex-wrap gap-2">
                            {ingredientsList.map((ingredient, idx) => {
                              const isSelected = mealSelections.removals.includes(ingredient);
                              return (
                                <button 
                                  key={idx}
                                  onClick={() => {
                                    if (isSelected) {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: mealSelections.removals.filter(r => r !== ingredient)
                                      });
                                    } else {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: [...mealSelections.removals, ingredient]
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-full border-2 font-bold transition-all text-sm",
                                    isSelected 
                                      ? "bg-red-500 border-red-500 text-white shadow-md" 
                                      : "bg-white/50 border-transparent text-black"
                                  )}
                                >
                                  {ingredient}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sides & Swaps Selection */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.allowedSides && selectedProductForCustom.allowedSides.length > 0 && (
                      (() => {
                        const allowedSidesList = (selectedProductForCustom.allowedSides || [])
                          .map(id => sides.find(s => s.id === id))
                          .filter(Boolean) as Side[];
                        
                        const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                        const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                        if (regularSides.length === 0 && swapSides.length === 0) return null;

                        const renderSideItem = (side: Side) => {
                          const qty = sideQuantities[side.id] || 0;
                          return (
                            <div 
                              key={side.id}
                              className={cn(
                                "p-4 rounded-xl border-2 font-bold transition-all flex flex-col gap-3",
                                qty > 0 
                                  ? "bg-white border-blue-500 shadow-md" 
                                  : "bg-white/50 border-transparent text-black"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span className={qty > 0 ? "text-blue-600" : "text-black"}>{side.name}</span>
                                <span className="text-xs opacity-60 text-black">
                                  {side.price > 0 ? `+ ${currencySymbol}${(side.price * (qty > 0 ? qty : 1)).toFixed(2)}` : 'Free'}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-4">
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-4 text-center text-black">{qty}</span>
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                  style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-6">
                            {regularSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-black">{t.chooseSides}</h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {regularSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                            {swapSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800">
                                  Swap Options
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {swapSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </>
                )}
              </div>

              <div className="p-6 pb-8 sm:pb-6 bg-white/30 border-t border-gray-200">
                {selectedProductForCustom && !selectedProductForCustom.isCustomSandwich && (!selectedProductForCustom.sizes || selectedProductForCustom.sizes.length === 0) && (
                  <div id="custom-modal-qty-container" className="flex items-center justify-between mb-4 bg-white/50 p-3.5 rounded-2xl border border-gray-200/50">
                    <span id="custom-modal-qty-label" className="text-sm font-bold text-black uppercase tracking-wider">
                      Quantity
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        id="custom-modal-qty-dec-btn"
                        type="button"
                        onClick={() => setCustomItemQuantity(prev => Math.max(1, prev - 1))}
                        className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black border border-gray-200 shadow-sm cursor-pointer active:scale-95 transition-all text-lg font-bold"
                      >
                        <Minus size={16} />
                      </button>
                      <span id="custom-modal-qty-value" className="text-base font-black min-w-[28px] text-center text-black">{customItemQuantity}</span>
                      <button
                        id="custom-modal-qty-inc-btn"
                        type="button"
                        onClick={() => setCustomItemQuantity(prev => prev + 1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all text-lg font-bold"
                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {(() => {
                  const isCakeIncomplete = selectedProductForCustom?.isCustomCake && (
                    (cakeSizesList.length > 0 && !selectedCakeSize) ||
                    (cakeDoughsList.length > 0 && !selectedDough) ||
                    (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                    (cakeToppingsList.length > 0 && !selectedTopping) ||
                    (cakeToppersList.length > 0 && !selectedTopper)
                  );
                  const isSandwichIncomplete = selectedProductForCustom?.isCustomSandwich && (
                    (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0) === 0
                  );
                  const isIncomplete = !!isCakeIncomplete || !!isSandwichIncomplete;

                  const totalQty = selectedProductForCustom?.isCustomSandwich
                    ? (Object.values(sandwichFillingQuantities) as number[]).reduce((sum, q) => sum + q, 0)
                    : customItemQuantity;

                  return (
                    <button 
                      onClick={addMealToCart}
                      disabled={isIncomplete}
                      className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${isIncomplete ? 'opacity-50 cursor-not-allowed active:scale-100' : 'active:scale-95 cursor-pointer hover:brightness-110'}`}
                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                    >
                      {isIncomplete ? (
                        <span>{isSandwichIncomplete ? 'Select an option first' : 'Select all options first'}</span>
                      ) : (
                        <>
                          <span>{t.addToCart}</span>
                          <span className="text-sm opacity-80 font-normal">
                            ({currencySymbol}{(
                              ((selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && selectedSize ? selectedSize.price : (selectedProductForCustom.price > 0 ? selectedProductForCustom.price : (selectedProductForCustom.oldPrice || 0))) + 
                              Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                                const side = sides.find(s => s.id === id);
                                return sum + (side ? side.price * (qty as number) : 0);
                              }, 0)) * totalQty
                            ).toFixed(2)})
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderCustomDietModal()}
    </div>
  );

  function renderDetoxModal() {
    return (
      <AnimatePresence>
        {isDetoxModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetoxModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-black border border-white/20"
            >
              {/* Header with requested color #4b6757 */}
              <div 
                className="p-5 sm:p-6 text-white flex items-center justify-between"
                style={{ backgroundColor: '#4b6757' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    <Leaf size={18} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider leading-tight text-white" style={{ color: '#ffffff' }}>
                      DETOX KIT INSTRUCTIONS
                    </h2>
                    <p className="text-[11px] text-white/80 font-medium">Complete guide for your detox protocol</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsDetoxModalOpen(false)} 
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Content with exact points */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-sm">
                
                {/* 1. Storage guidance */}
                <div className="bg-[#4b6757]/5 p-4 rounded-2xl border border-[#4b6757]/15 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-[#4b6757] text-xs uppercase tracking-wider">
                    <Snowflake size={15} />
                    <span>1. Storage Instructions:</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Keep all products in the freezer at <strong>0°F (-18°C) or lower</strong>.<br />
                    Only remove what you will consume on the day.
                  </p>
                </div>

                {/* 2. Daily consumption schedule */}
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-800 text-xs uppercase tracking-wider">
                    <Clock size={15} className="text-emerald-700" />
                    <span>2. Daily Consumption Routine:</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-800 font-medium pl-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4b6757]" />
                      <span><strong>Breakfast:</strong> Green detox juice</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span><strong>Morning Snack:</strong> Red detox juice</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f09249]" />
                      <span><strong>Lunch:</strong> 1 meal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span><strong>Afternoon Snack:</strong> Yellow detox juice</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      <span><strong>Dinner:</strong> 1 soup / cream</span>
                    </div>
                  </div>
                </div>

                {/* 3. Juice prep */}
                <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-amber-800 text-xs uppercase tracking-wider">
                    <Sparkles size={15} className="text-amber-600" />
                    <span>3. Detox Juice Preparation:</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Blend or dilute the concentrated pulp in a glass with <strong>up to 10 fl oz (300ml) of water or coconut water</strong>.
                  </p>
                </div>

                {/* 4. Meal heating */}
                <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-orange-800 text-xs uppercase tracking-wider">
                    <Flame size={15} className="text-orange-600" />
                    <span>4. Heating Instructions for Meals:</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Microwave for <strong>6 to 8 minutes</strong>.
                  </p>
                </div>

                {/* 5. Soup heating */}
                <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-teal-800 text-xs uppercase tracking-wider">
                    <Utensils size={15} className="text-teal-600" />
                    <span>5. Heating Instructions for Soups/Creams:</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Microwave for <strong>10 minutes</strong> OR remove from container and heat directly in a saucepan with a little water.
                  </p>
                </div>

                {/* 6. Avoid list */}
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-rose-800 text-xs uppercase tracking-wider">
                    <Ban size={15} className="text-rose-600" />
                    <span>6. What NOT to Consume During Detox:</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Alcohol, processed foods, products with gluten, lactose or sugar. Ideally avoid any animal-derived ingredients (meat, eggs, dairy, butter, etc.).
                  </p>
                </div>

                {/* 7. Extra snacks */}
                <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-green-800 text-xs uppercase tracking-wider">
                    <Apple size={15} className="text-green-600" />
                    <span>7. What Can I Consume in Addition to the DETOX KIT?</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    If you feel hungry between meals, you can add <strong>fruits, fresh vegetables, and raw nuts</strong>.
                  </p>
                </div>

              </div>

              {/* Footer CTA */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetoxModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                  style={{ backgroundColor: '#4b6757' }}
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  function renderCustomDietModal() {
    return (
      <AnimatePresence>
        {isCustomDietModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomDietModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col text-black border border-white/20 z-10"
            >
              {/* Header */}
              <div 
                className="p-5 text-white flex items-center justify-between"
                style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white border border-white/20 shrink-0">
                    <Sparkles size={20} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 
                      className="text-lg sm:text-xl font-serif font-bold !text-white leading-tight"
                      style={{ color: '#ffffff' }}
                    >
                      Your Diet, Your Way!
                    </h2>
                    <p 
                      className="text-xs !text-white/90 font-sans mt-0.5 font-medium"
                      style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                    >
                      Custom meal plan crafted for you
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsCustomDietModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 active:scale-95 flex items-center justify-center text-white cursor-pointer transition-all shrink-0 ml-2 border border-white/10"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Body */}
              <div className="p-6 space-y-6 bg-white">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#4b6757]/5 border border-[#4b6757]/15">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Check size={20} className="stroke-[3]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                    Already have a nutritional meal plan from your nutritionist? We prepare your meals exactly as specified in your menu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendCustomDietWhatsApp}
                  className="w-full py-4 px-5 rounded-2xl text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer border-0 text-center"
                  style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                >
                  <Check size={18} className="stroke-[3]" />
                  <span>Send Nutritionist Meal Plan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
  function unused_old_modal() {
    return (
      <AnimatePresence>
        {isDietsModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDietsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings text-black"
            >
              <div className="p-6 border-b border-gray-200/50 flex items-center justify-between bg-white/40 font-serif">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2" style={{ color: settings.primaryColor || '#000000' }}>
                  <Building2 size={24} />
                  {'CORPORATE & WHOLESALE'}
                </h2>
                <button 
                  onClick={() => setIsDietsModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-all text-black cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-white/50 p-4 rounded-2xl border border-white/40 space-y-2">
                  <p className="text-[11px] font-semibold leading-relaxed text-black/80">
                    💡 This is our dedicated wholesale scheduling and quote portal. Realize wholesale orders directly without retail premiums! Conditions automatically scale by volume.
                  </p>
                  
                  {isReturningB2b && (
                    <div className="flex items-center justify-between bg-[#865d39]/10 p-2.5 rounded-xl border border-[#865d39]/20 text-xs mt-1.5">
                      <span className="font-bold text-[#865d39]">✓ Returning Partner Profile Active</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          localStorage.removeItem('b2b_profile_save');
                          setB2bName('');
                          setB2bResponsibleName('');
                          setB2bPhone('');
                          setB2bAddress('');
                          setIsReturningB2b(false);
                          toast.info('Profile fields cleared.');
                        }}
                        className="text-[10px] font-extrabold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50"
                      >
                        Reset Profile
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Business Name (Nome Fantasia) with autocomplete dropdown */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Building2 size={12} /> Nom Fantasie / Business Name *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Coffee Central or Starbucks L.A."
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bName}
                      onChange={e => {
                        const val = e.target.value;
                        setB2bName(val);
                        if (val.trim().length >= 2) {
                          const matched = b2bProfiles.filter(p => 
                            (p.name || '').toLowerCase().includes(val.toLowerCase()) || 
                            (p.phone || '').toLowerCase().includes(val.toLowerCase())
                          );
                          setB2bSearchResults(matched);
                          setShowB2bSearchDropdown(matched.length > 0);
                        } else {
                          setShowB2bSearchDropdown(false);
                        }
                      }}
                    />
                    
                    {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                      <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-gray-100 p-1">
                        <div className="text-[9px] font-bold text-gray-400 uppercase p-1.5 tracking-wider bg-gray-50/50">
                          Recurrent Profiles Found (Click to autofill):
                        </div>
                        {b2bSearchResults.map((profile, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full p-2.5 text-left text-xs text-black hover:bg-gray-100 flex flex-col gap-0.5 rounded-lg active:scale-95 transition-all text-black font-medium"
                            onClick={() => {
                              setB2bName(profile.name || '');
                              setB2bResponsibleName(profile.manager || '');
                              setB2bPhone(profile.phone || '');
                              setB2bAddress(profile.address || '');
                              setIsReturningB2b(true);
                              setShowB2bSearchDropdown(false);
                              toast.success(`Autocompleted profile for ${profile.name}!`);
                            }}
                          >
                            <span className="font-bold text-black">{profile.name}</span>
                            <span className="text-[10px] text-gray-500 font-normal">Contact: {profile.manager} • Phone: {profile.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Responsible Person Manager Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <User size={12} /> Responsible Manager / Contact Name *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Smith"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bResponsibleName}
                      onChange={e => setB2bResponsibleName(e.target.value)}
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Phone size={12} /> Contact Tel / Phone *
                    </label>
                    <input 
                      type="tel" 
                      placeholder="e.g. (310) 555-0199"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bPhone}
                      onChange={e => setB2bPhone(e.target.value)}
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <MapPin size={12} /> Commercial Delivery Address *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. 520 Broadway, Santa Monica, CA 90401"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bAddress}
                      onChange={e => setB2bAddress(e.target.value)}
                    />
                  </div>

                  {/* Delivery Schedule Frequency */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black block mb-1">
                      🚚 Delivery Plan/Frequency *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('one-time')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'one-time' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span>Single Delivery</span>
                        <span className="text-[9px] opacity-75 font-normal">One-time Order / Spot</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('weekly')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'weekly' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span className={b2bFrequency === 'weekly' ? "text-yellow-300" : "text-amber-600"}>★ Weekly Plan</span>
                        <span className="text-[9px] opacity-75 font-normal">Recurring deliveries</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Calendar (Data de entrega) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#865d39]" /> 
                      Scheduled Delivery Date (Calendar) *
                    </label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-extrabold text-black active:border-black select-all"
                      style={{ color: '#000000' }}
                      value={b2bDate}
                      onChange={e => setB2bDate(e.target.value)}
                    />
                  </div>

                  {/* Quantity section */}
                  <div className="pt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#865d39] block mb-3 border-b border-[#865d39]/20 pb-1">
                      📦 FROZEN CHEESE BREAD PACKAGES VOLUME (1KG / 2.2LBS PACKAGES)
                    </label>
                    
                    <div className="space-y-3">
                      {/* Item 1 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Cocktail Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • bite-sized, ideal for cafes & catering</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqCoquetel}</span>
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Medium Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • traditional classic café snack sizing</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqMedio}</span>
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Large Premium Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • gourmet display-counter large size</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqPremium}</span>
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observation box */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black">Custom Notes / Route Details</label>
                    <textarea 
                      placeholder="Enter details on delivery access, loading dock, recurring schedulings or special B2B requests"
                      rows={2.5}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold resize-none"
                      value={b2bObservation}
                      onChange={e => setB2bObservation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submission Options (Whats Only) */}
                <div className="pt-4 border-t border-gray-200/50 space-y-3">
                  <div className="text-[10px] font-extrabold text-center text-gray-500 uppercase tracking-widest">
                    Send Wholesale / Special Quote Request:
                  </div>
                  
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => {
                        // Submit via WhatsApp
                        if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bDate) {
                           toast.error('Please complete all fields with an asterisk (*).');
                           return;
                        }
                        if (pqCoquetel === 0 && pqMedio === 0 && pqPremium === 0) {
                           toast.error('Select at least one package size quantity.');
                           return;
                        }
                        
                        // Construct state map and trigger submitting method
                        const formattedDateForDb = (() => {
                          const [year, month, day] = b2bDate.split('-');
                          return `${month}/${day}/${year}`;
                        })();

                        const orderItems = [];
                        if (pqCoquetel > 0) orderItems.push({ title: 'Cocktail Frozen Cheese Bread (1kg package)', quantity: pqCoquetel, price: 0, priceType: 'consult' as const });
                        if (pqMedio > 0) orderItems.push({ title: 'Medium Frozen Cheese Bread (1kg package)', quantity: pqMedio, price: 0, priceType: 'consult' as const });
                        if (pqPremium > 0) orderItems.push({ title: 'Large Premium Frozen Cheese Bread (1kg package)', quantity: pqPremium, price: 0, priceType: 'consult' as const });

                        const b2bOrderDataObj = {
                          customerName: b2bName,
                          phone: b2bPhone,
                          address: b2bAddress,
                          pickupDate: formattedDateForDb,
                          birthday: '',
                          observation: b2bObservation,
                          email: '',
                          items: orderItems,
                          total: 0,
                          createdAt: serverTimestamp(),
                          orderLanguage: 'en',
                          isB2B: true,
                          isPJ: true,
                          b2bManagerName: b2bResponsibleName,
                          b2bFrequency: b2bFrequency,
                          b2bCompanyName: b2bName,
                          b2bAddress: b2bAddress
                        };

                        try {
                          addDoc(collection(db, 'pedidos'), b2bOrderDataObj);
                          localStorage.setItem('b2b_profile_save', JSON.stringify({
                            name: b2bName,
                            manager: b2bResponsibleName,
                            phone: b2bPhone,
                            address: b2bAddress
                          }));
                          setIsReturningB2b(true);

                          // Build message
                          let msg = `*B2B CORPORATE ORDER & QUOTATION*\n`;
                          msg += `----------------------------------------\n`;
                          msg += `*Company:* ${b2bName}\n`;
                          msg += `*Manager:* ${b2bResponsibleName}\n`;
                          msg += `*Phone:* ${b2bPhone}\n`;
                          msg += `*Address:* ${b2bAddress}\n`;
                          msg += `*Frequency:* ${b2bFrequency === 'weekly' ? 'Weekly Recurring Plan' : 'One-Time Delivery Order'}\n`;
                          msg += `*Delivery Date:* ${formattedDateForDb}\n\n`;
                          msg += `*Wholesale items requested:*\n`;
                          if (pqCoquetel > 0) msg += `- Cocktail Frozen Cheese Bread: ${pqCoquetel} package(s) (1kg / 2.2lbs)\n`;
                          if (pqMedio > 0) msg += `- Medium Frozen Cheese Bread: ${pqMedio} package(s) (1kg / 2.2lbs)\n`;
                          if (pqPremium > 0) msg += `- Large Premium Frozen Cheese Bread: ${pqPremium} package(s) (1kg / 2.2lbs)\n`;
                          if (b2bObservation) msg += `\n*Notes/Specs:* ${b2bObservation}\n`;
                          msg += `----------------------------------------\n`;
                          msg += `Hello! We would like to request B2B wholesale pricing and delivery scheduling. Thank you!`;

                          const cleanPhone = getCleanWhatsAppPhone(settings.whatsappNumber || '', settings.whatsappCountryCode || '+1');
                          const sendUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                          
                          toast.success('B2B Quote recorded! Redirecting to WhatsApp...');
                          setIsDietsModalOpen(false);

                          try {
                            const win = window.open(sendUrl, '_blank');
                            if (!win || win.closed || typeof win.closed === 'undefined') {
                              window.location.href = sendUrl;
                            }
                          } catch (e) {
                            window.location.href = sendUrl;
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('Error recording order.');
                        }
                      }}
                      className="w-full py-4 px-4 rounded-xl font-bold text-sm tracking-wider uppercase text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border-0"
                    >
                      <MessageCircle size={18} /> Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
}
