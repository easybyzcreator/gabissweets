export interface Category {
  id: string;
  title: string;
  order: number;
  catalog?: 'catalog1' | 'catalog2' | 'catalog3' | 'catalog4' | 'both' | 'all' | 'catalog_b2b' | 'b2b';
}

export type PriceType = 'fixed' | 'starting' | 'consult';

export interface Side {
  id: string;
  name?: string;
  price?: number;
  type?: 'side' | 'swap';
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  stockQuantity?: number;
}

export interface NutritionalInfo {
  servingSize?: string; // Porção (ex: 100g, 350g, 1 prato raso)
  servingsPerContainer?: string; // Porções por embalagem (ex: 1, 4)
  calories?: string; // Valor Energético (kcal)
  caloriesVd?: string; // % VD*
  carbs?: string; // Carboidratos (g)
  carbsVd?: string; // % VD*
  totalSugars?: string; // Açúcares totais (g)
  totalSugarsVd?: string; // % VD*
  addedSugars?: string; // Açúcares adicionados (g)
  addedSugarsVd?: string; // % VD*
  proteins?: string; // Proteínas (g)
  proteinsVd?: string; // % VD*
  totalFat?: string; // Gorduras Totais (g)
  totalFatVd?: string; // % VD*
  saturatedFat?: string; // Gorduras Saturadas (g)
  saturatedFatVd?: string; // % VD*
  transFat?: string; // Gorduras Trans (g)
  transFatVd?: string; // % VD*
  fiber?: string; // Fibra Alimentar (g)
  fiberVd?: string; // % VD*
  sodium?: string; // Sódio (mg)
  sodiumVd?: string; // % VD*
  carbohydrates?: string; // Compatibilidade anterior
}

export interface BoxFlavorItem {
  id: string;
  name: string;
  price: number; // Unit price for this flavor
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceType?: PriceType;
  image: string; // Base64
  categoryId?: string;
  order?: number; // Sorting order within its category
  isMeal?: boolean;
  isCustomCake?: boolean;
  ingredients?: string; // Comma separated
  allowedSides?: string[]; // IDs of sides
  isActive?: boolean;
  hasSizes?: boolean;
  sizes?: ProductSize[];
  cakeGalleryId?: string; // Associated image gallery
  isCustomCupcake?: boolean; // Cupcakes & customizable treats with dough and frosting selection
  cupcakeDoughs?: string[]; // Dough / batter flavors available for this cupcake
  cupcakeFillings?: string[]; // Filling options available for this cupcake (Recheios)
  cupcakeFrostings?: string[]; // Frosting / topping flavors available for this cupcake
  cupcakeFlavors?: string[]; // Sabores disponíveis (opção adicional de sabor / variedade)
  isCustomBox?: boolean; // Produto tipo Caixa / Kit com seleção de unidades (Monte sua Caixa)
  boxCapacity?: number; // Total de unidades que cabem na caixa (ex: 6, 12, 24, 50, 100)
  boxMaxFlavors?: number; // Limite de sabores diferentes permitidos na caixa (ex: 2 para caixa de 15, 3 para caixa de 36)
  boxFlavors?: BoxFlavorItem[]; // Sabores disponíveis para compor a caixa com seus respectivos preços unitários
  boxCategoryId?: string; // ID ou nome da categoria vinculada de onde a caixa busca os sabores
  boxSourceCategoryTitle?: string; // Título da categoria vinculada
  isCustomSandwich?: boolean; // Custom sandwich or tapioca with multiple fillings
  customFillings?: string; // Comma separated list of fillings
  isCombo?: boolean; // Combo item where customer selects up to comboQuantity flavors
  comboQuantity?: number; // Total number of individual items/meals in the combo (e.g. 5, 10, 20, 30, 40, 50, etc.)
  comboAllowedProductIds?: string[]; // IDs of products eligible for this combo
  onlyInCombos?: boolean; // Available only inside combo assembly (hidden from standalone a la carte menu)
  nutritionalInfo?: NutritionalInfo;
  trackStock?: boolean;
  stockQuantity?: number;
  catalog?: string;
  categoryTitle?: string;
}

export interface DeliveryNeighborhood {
  id: string;
  name: string;
  fee: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  customPrice?: number;
  mealOptions?: {
    removals: string[];
    sides: Side[];
  };
  selectedSize?: ProductSize;
  cakeOptions?: {
    size?: string;
    dough?: string;
    fillings?: string[];
    topping?: string;
    topper?: string;
    styleNumber?: number; // Selected image style number from gallery
    customStyleDescription?: string; // Custom cake reference/style described by customer
    cakeObservation?: string; // Additional observations/notes for the cake
  };
  cupcakeOptions?: {
    dough?: string;
    filling?: string;
    frosting?: string;
    flavor?: string;
  };
  sandwichOptions?: {
    fillings: string[];
  };
  comboOptions?: {
    items: { productId: string; productTitle: string; quantity: number }[];
  };
  boxOptions?: {
    capacity: number;
    flavors: {
      id?: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
  };
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  street?: string;
  number?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  pickupDate?: string;
  deliveryOption?: 'delivery' | 'pickup';
  neighborhood?: string;
  deliveryNeighborhood?: string;
  deliveryFee?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  deliveryStatus?: 'pending' | 'delivered';
  birthday: string;
  observation: string;
  email: string;
  isB2B?: boolean;
  isPJ?: boolean;
  b2bCompanyName?: string;
  b2bAddress?: string;
  b2bManagerName?: string;
  b2bZipCode?: string;
  b2bCity?: string;
  b2bStreet?: string;
  b2bNumber?: string;
  b2bFrequency?: 'one-time' | 'weekly' | string;
  catalog?: string;
  items: {
    title: string;
    quantity: number;
    price: number;
    priceType?: PriceType;
    productId?: string;
    notes?: string;
    selectedSides?: Side[];
    mealOptions?: {
      removals: string[];
      sides: Side[];
    };
    selectedSize?: ProductSize;
    cakeOptions?: {
      size?: string;
      dough?: string;
      fillings?: string[];
      topping?: string;
      topper?: string;
      styleNumber?: number; // Selected style image number from gallery
      customStyleDescription?: string; // Custom cake reference/style described by customer
      cakeObservation?: string; // Additional observations/notes for the cake
    };
    cupcakeOptions?: {
      dough?: string;
      filling?: string;
      frosting?: string;
      flavor?: string;
    };
    sandwichOptions?: {
      fillings: string[];
    };
    comboOptions?: {
      items: { productId: string; productTitle: string; quantity: number }[];
    };
    boxOptions?: {
      capacity: number;
      flavors: {
        id?: string;
        name: string;
        quantity: number;
        unitPrice: number;
      }[];
    };
  }[];
  total: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  createdAt: any;
  orderLanguage?: string;
  paymentStatus?: 'pending' | 'half' | 'full';
  productionValidated?: boolean;
  productionNotes?: string;
}

export interface ImageGallery {
  id: string;
  title: string;
  name?: string;
  images: string[]; // maximum 9 base64 images
}

export interface Settings {
  logo: string;
  pwaIcon?: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  slug: string;
  brandName: string;
  adminPassword?: string;
  slogan?: string;
  whatsappClosingMessage?: string;
  birthdayMessageTemplate?: string; // Custom birthday message body for WhatsApp
  backgroundImage?: string;
  glassColor?: string;
  textColor?: string;
  categoryTextColor?: string;
  brandNameColor?: string;
  detailsPriceColor?: string;
  language?: 'pt' | 'en';
  currency?: 'BRL' | 'USD';
  tagTitle?: string;
  tagLogo?: string;
  tagUrl?: string;
  checkoutTitle?: string;
  infoBlock1Title?: string;
  infoBlock1Text?: string;
  infoBlock2Title?: string;
  infoBlock2Text?: string;
  // Instruction buttons on customer menu
  showDetoxInstructionsButton?: boolean;
  showStorageInstructionsButton?: boolean;
  storageInstructionsImage?: string;
  showCustomDietButton?: boolean;
  // Intro screen settings
  introEnabled?: boolean;
  introTitle?: string;
  introSubtitle?: string;
  introDescription?: string;
  introButtonText?: string;
  introBottomText?: string;
  // Catalog selector settings
  selectorEnabled?: boolean;
  selectorTitle?: string;
  selectorSubtitle?: string;
  catalog1Title?: string;
  catalog1Image?: string;
  catalog1Desc?: string;
  catalog1Slogan?: string;
  catalog1Active?: boolean;
  catalog2Title?: string;
  catalog2Image?: string;
  catalog2Desc?: string;
  catalog2Slogan?: string;
  catalog2Active?: boolean;
  catalog3Title?: string;
  catalog3Image?: string;
  catalog3Desc?: string;
  catalog3Slogan?: string;
  catalog3Active?: boolean;
  catalog4Title?: string;
  catalog4Image?: string;
  catalog4Desc?: string;
  catalog4Slogan?: string;
  catalog4Active?: boolean;
  // Custom Cake settings
  cakeSizes?: string[];
  cakeDoughs?: string[];
  cakeFillings?: string[];
  cakeFillingsMax?: number;
  cakeToppings?: string[];
  cakeToppers?: string[];
  // Fixed costs configurations
  fixedRent?: number;
  fixedInternet?: number;
  fixedElectricity?: number;
  fixedWater?: number;
  fixedGas?: number;
  fixedSistemas?: number;
  fixedMarketing?: number;
  fixedContabilidade?: number;
  fixedSalarios?: number;
  fixedMei?: number;
  customFixedCosts?: { label: string; amount: number }[];
  minOrderValue?: number;
  deliveryNeighborhoods?: DeliveryNeighborhood[];
}

export interface VariableCost {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface SupplyItem {
  id: string;
  title: string;
  category: 'Embalagens' | 'Ingredientes' | 'Utensílios' | 'Equipamentos' | 'Outros' | string;
  description?: string;
  imageUrl?: string;
  purchaseUrl: string;
  createdAt?: string;
}

