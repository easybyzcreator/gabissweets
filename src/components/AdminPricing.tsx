import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  PricingIngredient,
  PricingPaymentMethod,
  PricingRecipe,
  PricingRecipeIngredient,
  PricingUnit,
  Settings
} from '../types';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Copy,
  ArrowLeft,
  Save,
  X,
  Check,
  Calculator,
  Package,
  BookOpen,
  CreditCard,
  Smartphone,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn, cleanFirestoreData } from '../lib/utils';
import { parseMoneyValue } from '../lib/money';
import { toast } from 'sonner';

interface AdminPricingProps {
  settings: Settings;
}

const UNIT_LABELS: Record<PricingUnit, string> = {
  g: 'gramas (g)',
  kg: 'quilos (kg)',
  ml: 'ml',
  l: 'litros (L)',
  un: 'unidades (un)'
};

const UNIT_SHORT: Record<PricingUnit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  un: 'un'
};

const RECIPE_CATEGORIES = [
  'Bolos',
  'Doces',
  'Sobremesas',
  'Massas & Recheios',
  'Salgados',
  'Outros'
];

const YIELD_LABELS = [
  'unidade(s)',
  'bolo inteiro',
  'fatia(s)',
  'pote(s)',
  'docinho(s)',
  'caixa(s)'
];

const DEFAULT_FEE_BY_METHOD: Record<PricingPaymentMethod, number> = {
  none: 0,
  debit: 1.5,
  credit: 3.5,
  paypal: 4.0
};

const PAYMENT_METHOD_INFO: Record<
  PricingPaymentMethod,
  { label: string; sublabel: string; isFree?: boolean }
> = {
  none: {
    label: 'Zelle / Venmo / Dinheiro',
    sublabel: 'Sem taxa ($0)',
    isFree: true
  },
  debit: {
    label: 'Cartão de Débito',
    sublabel: 'Com taxa da maquininha'
  },
  credit: {
    label: 'Cartão de Crédito',
    sublabel: 'Com taxa da maquininha'
  },
  paypal: {
    label: 'PayPal',
    sublabel: 'Com taxa do PayPal'
  }
};

const STARTER_INGREDIENTS: Array<{
  name: string;
  unit: PricingUnit;
  packageQuantity: number;
  packagePrice: number;
}> = [
  { name: 'Leite Condensado', unit: 'g', packageQuantity: 395, packagePrice: 0 },
  { name: 'Creme de Leite', unit: 'g', packageQuantity: 200, packagePrice: 0 },
  { name: 'Farinha de Trigo', unit: 'kg', packageQuantity: 1, packagePrice: 0 },
  { name: 'Açúcar Refinado', unit: 'kg', packageQuantity: 1, packagePrice: 0 },
  { name: 'Manteiga sem Sal', unit: 'g', packageQuantity: 200, packagePrice: 0 },
  { name: 'Ovos', unit: 'un', packageQuantity: 12, packagePrice: 0 },
  { name: 'Chocolate em Pó 50%', unit: 'g', packageQuantity: 500, packagePrice: 0 },
  { name: 'Leite Integral', unit: 'l', packageQuantity: 1, packagePrice: 0 },
  { name: 'Fermento em Pó', unit: 'g', packageQuantity: 100, packagePrice: 0 },
  { name: 'Embalagem / Caixa', unit: 'un', packageQuantity: 1, packagePrice: 0 }
];

const getContrastText = (hexColor?: string): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp > 155 ? '#000000' : '#ffffff';
};

const getCompatibleUnits = (pkgUnit: PricingUnit): PricingUnit[] => {
  if (pkgUnit === 'g' || pkgUnit === 'kg') return ['g', 'kg'];
  if (pkgUnit === 'ml' || pkgUnit === 'l') return ['ml', 'l'];
  return ['un'];
};

const getDefaultRecipeUnit = (pkgUnit: PricingUnit): PricingUnit => {
  if (pkgUnit === 'kg') return 'g';
  if (pkgUnit === 'l') return 'ml';
  return pkgUnit;
};

const toBaseAmount = (qty: number, unit: PricingUnit): number => {
  if (unit === 'kg' || unit === 'l') return qty * 1000;
  return qty;
};

const calculateIngredientRowCost = (
  ingredient: PricingIngredient | undefined,
  quantityUsed: number,
  unitUsed: PricingUnit
): number => {
  if (!ingredient || ingredient.packageQuantity <= 0 || ingredient.packagePrice <= 0 || quantityUsed <= 0) {
    return 0;
  }
  const compat = getCompatibleUnits(ingredient.unit);
  if (!compat.includes(unitUsed)) {
    return 0;
  }
  const pkgBase = toBaseAmount(ingredient.packageQuantity, ingredient.unit);
  const usedBase = toBaseAmount(quantityUsed, unitUsed);
  if (pkgBase <= 0) return 0;
  return (usedBase / pkgBase) * ingredient.packagePrice;
};

const computeRecipePricing = (
  recipe: {
    ingredients: PricingRecipeIngredient[];
    kitchenOverheadPercent: number;
    laborCost: number;
    yieldQuantity: number;
    profitPercent: number;
    paymentMethod: PricingPaymentMethod;
    paymentFeePercent: number;
  },
  ingredientsMap: Map<string, PricingIngredient>
) => {
  const ingredientsCost = (recipe.ingredients || []).reduce((sum, item) => {
    const ing = ingredientsMap.get(item.ingredientId);
    return sum + calculateIngredientRowCost(ing, Number(item.quantityUsed) || 0, item.unitUsed);
  }, 0);

  const overheadPercent = Math.max(0, Number(recipe.kitchenOverheadPercent) || 0);
  const overheadCost = ingredientsCost * (overheadPercent / 100);
  const labor = Math.max(0, Number(recipe.laborCost) || 0);
  const totalRecipeCost = ingredientsCost + overheadCost + labor;

  const yieldQty = Math.max(1, Number(recipe.yieldQuantity) || 1);
  const unitCost = totalRecipeCost / yieldQty;

  const profitPct = Math.max(0, Number(recipe.profitPercent) || 0);
  const expectedProfitRecipe = totalRecipeCost * (profitPct / 100);
  const expectedProfitUnit = expectedProfitRecipe / yieldQty;

  const baseRecipePrice = totalRecipeCost + expectedProfitRecipe;
  const baseUnitPrice = baseRecipePrice / yieldQty;

  const rawFee =
    recipe.paymentMethod === 'none'
      ? 0
      : Math.max(0, Math.min(50, Number(recipe.paymentFeePercent) || 0));

  const feeDivisor = 1 - rawFee / 100;
  const suggestedRecipePrice = feeDivisor > 0 ? baseRecipePrice / feeDivisor : baseRecipePrice;
  const suggestedUnitPrice = suggestedRecipePrice / yieldQty;
  const paymentFeeRecipeAmount = suggestedRecipePrice - baseRecipePrice;
  const paymentFeeUnitAmount = paymentFeeRecipeAmount / yieldQty;

  return {
    ingredientsCost,
    overheadCost,
    laborCost: labor,
    totalRecipeCost,
    unitCost,
    expectedProfitRecipe,
    expectedProfitUnit,
    baseRecipePrice,
    baseUnitPrice,
    paymentFeePercent: rawFee,
    paymentFeeRecipeAmount,
    paymentFeeUnitAmount,
    suggestedRecipePrice,
    suggestedUnitPrice,
    yieldQty
  };
};

const formatUSD = (val: number): string => {
  const safe = Number.isFinite(val) ? val : 0;
  return `$ ${safe.toFixed(2)}`;
};

export default function AdminPricing({ settings }: AdminPricingProps) {
  const primaryColor = settings?.primaryColor || '#865d39';
  const contrastText = getContrastText(primaryColor);

  const [subView, setSubView] = useState<'recipes' | 'ingredients'>('recipes');
  const [ingredients, setIngredients] = useState<PricingIngredient[]>([]);
  const [recipes, setRecipes] = useState<PricingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  // Searches & Filters
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<string>('Todas');
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Ingredient Form State
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<PricingUnit>('g');
  const [ingPkgQty, setIngPkgQty] = useState('');
  const [ingPkgPrice, setIngPkgPrice] = useState('');
  const [isSavingIngredient, setIsSavingIngredient] = useState(false);
  const [isSeedingStarters, setIsSeedingStarters] = useState(false);

  // Inline quick-create ingredient modal inside Recipe Builder
  const [showQuickIngredientModal, setShowQuickIngredientModal] = useState(false);
  const [quickIngName, setQuickIngName] = useState('');
  const [quickIngUnit, setQuickIngUnit] = useState<PricingUnit>('g');
  const [quickIngQty, setQuickIngQty] = useState('');
  const [quickIngPrice, setQuickIngPrice] = useState('');

  // Recipe Builder State
  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Bolos');
  const [recipeYieldQty, setRecipeYieldQty] = useState('1');
  const [recipeYieldLabel, setRecipeYieldLabel] = useState('unidade(s)');
  const [recipeIngredients, setRecipeIngredients] = useState<PricingRecipeIngredient[]>([]);
  const [recipeOverheadPct, setRecipeOverheadPct] = useState<number>(15);
  const [recipeLaborInput, setRecipeLaborInput] = useState('');
  const [recipeProfitPct, setRecipeProfitPct] = useState('100');
  const [recipePaymentMethod, setRecipePaymentMethod] = useState<PricingPaymentMethod>('none');
  const [recipePaymentFeeInput, setRecipePaymentFeeInput] = useState('0');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'ingredient' | 'recipe';
    id: string;
    name: string;
  } | null>(null);

  // Real-time Firestore listeners
  useEffect(() => {
    let loadedIng = false;
    let loadedRec = false;
    const markDone = () => {
      if (loadedIng && loadedRec) setLoading(false);
    };

    const unsubIng = onSnapshot(
      collection(db, 'ingredientes_precificacao'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as PricingIngredient))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
        setIngredients(list);
        setPermissionError(false);
        loadedIng = true;
        markDone();
      },
      (err) => {
        console.error('Erro ao carregar ingredientes_precificacao:', err);
        if (err?.code === 'permission-denied') setPermissionError(true);
        loadedIng = true;
        markDone();
      }
    );

    const unsubRec = onSnapshot(
      collection(db, 'receitas_precificacao'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as PricingRecipe))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
        setRecipes(list);
        setPermissionError(false);
        loadedRec = true;
        markDone();
      },
      (err) => {
        console.error('Erro ao carregar receitas_precificacao:', err);
        if (err?.code === 'permission-denied') setPermissionError(true);
        loadedRec = true;
        markDone();
      }
    );

    return () => {
      unsubIng();
      unsubRec();
    };
  }, []);

  const ingredientsMap = useMemo(() => {
    const map = new Map<string, PricingIngredient>();
    ingredients.forEach((ing) => map.set(ing.id, ing));
    return map;
  }, [ingredients]);

  // Usage frequency across saved recipes so repeating ingredients appear first
  const ingredientUsageCount = useMemo(() => {
    const counts = new Map<string, number>();
    recipes.forEach((rec) => {
      (rec.ingredients || []).forEach((item) => {
        counts.set(item.ingredientId, (counts.get(item.ingredientId) || 0) + 1);
      });
    });
    return counts;
  }, [recipes]);

  // Sorted ingredients for quick-pick in Recipe Editor (most used first, then alphabetical)
  const pickerIngredients = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    const filtered = q
      ? ingredients.filter((i) => i.name.toLowerCase().includes(q))
      : ingredients;
    return [...filtered].sort((a, b) => {
      const ca = ingredientUsageCount.get(a.id) || 0;
      const cb = ingredientUsageCount.get(b.id) || 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name, 'pt');
    });
  }, [ingredients, pickerSearch, ingredientUsageCount]);

  // Filtered saved ingredients
  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.toLowerCase().trim();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, ingredientSearch]);

  // Filtered saved recipes
  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.toLowerCase().trim();
    return recipes.filter((rec) => {
      const matchesCat =
        recipeCategoryFilter === 'Todas' || (rec.category || 'Outros') === recipeCategoryFilter;
      if (!matchesCat) return false;
      if (!q) return true;
      const matchesName = (rec.name || '').toLowerCase().includes(q);
      const matchesIng = (rec.ingredients || []).some((it) => {
        const liveName = ingredientsMap.get(it.ingredientId)?.name || it.ingredientName || '';
        return liveName.toLowerCase().includes(q);
      });
      return matchesName || matchesIng;
    });
  }, [recipes, recipeSearch, recipeCategoryFilter, ingredientsMap]);

  // Live calculation for the recipe currently in the editor
  const editorPricing = useMemo(() => {
    return computeRecipePricing(
      {
        ingredients: recipeIngredients,
        kitchenOverheadPercent: recipeOverheadPct,
        laborCost: parseMoneyValue(recipeLaborInput),
        yieldQuantity: Math.max(1, parseFloat(recipeYieldQty.replace(',', '.')) || 1),
        profitPercent: Math.max(0, parseFloat(recipeProfitPct.replace(',', '.')) || 0),
        paymentMethod: recipePaymentMethod,
        paymentFeePercent:
          recipePaymentMethod === 'none'
            ? 0
            : Math.max(0, parseFloat(recipePaymentFeeInput.replace(',', '.')) || 0)
      },
      ingredientsMap
    );
  }, [
    recipeIngredients,
    recipeOverheadPct,
    recipeLaborInput,
    recipeYieldQty,
    recipeProfitPct,
    recipePaymentMethod,
    recipePaymentFeeInput,
    ingredientsMap
  ]);

  // Sync updated ingredient costs to all affected saved recipes in Firestore
  const syncRecipesForUpdatedIngredient = async (updatedIng: PricingIngredient) => {
    const tempMap = new Map(ingredientsMap);
    tempMap.set(updatedIng.id, updatedIng);

    const affectedRecipes = recipes.filter((rec) =>
      (rec.ingredients || []).some((it) => it.ingredientId === updatedIng.id)
    );

    if (affectedRecipes.length === 0) return 0;

    const batch = writeBatch(db);
    affectedRecipes.forEach((rec) => {
      const calc = computeRecipePricing(
        {
          ingredients: rec.ingredients || [],
          kitchenOverheadPercent: rec.kitchenOverheadPercent ?? 15,
          laborCost: rec.laborCost ?? 0,
          yieldQuantity: rec.yieldQuantity || 1,
          profitPercent: rec.profitPercent ?? 100,
          paymentMethod: rec.paymentMethod || 'none',
          paymentFeePercent: rec.paymentFeePercent ?? 0
        },
        tempMap
      );
      batch.update(doc(db, 'receitas_precificacao', rec.id), {
        ingredients: (rec.ingredients || []).map((it) =>
          it.ingredientId === updatedIng.id
            ? { ...it, ingredientName: updatedIng.name }
            : it
        ),
        ingredientsCost: Number(calc.ingredientsCost.toFixed(2)),
        totalRecipeCost: Number(calc.totalRecipeCost.toFixed(2)),
        unitCost: Number(calc.unitCost.toFixed(2)),
        suggestedUnitPrice: Number(calc.suggestedUnitPrice.toFixed(2)),
        suggestedRecipePrice: Number(calc.suggestedRecipePrice.toFixed(2)),
        expectedProfitUnit: Number(calc.expectedProfitUnit.toFixed(2)),
        expectedProfitRecipe: Number(calc.expectedProfitRecipe.toFixed(2)),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    return affectedRecipes.length;
  };

  // Save or update an ingredient
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = ingName.trim();
    const qty = parseFloat(ingPkgQty.replace(',', '.'));
    const price = parseMoneyValue(ingPkgPrice);

    if (!cleanName) {
      toast.error('Digite o nome do ingrediente ou embalagem!');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Informe a quantidade que vem na embalagem (maior que 0)!');
      return;
    }
    if (price < 0) {
      toast.error('Informe um preço válido!');
      return;
    }

    setIsSavingIngredient(true);
    try {
      if (editingIngredientId) {
        const updatedObj: PricingIngredient = {
          id: editingIngredientId,
          name: cleanName,
          unit: ingUnit,
          packageQuantity: qty,
          packagePrice: price
        };
        await updateDoc(doc(db, 'ingredientes_precificacao', editingIngredientId), {
          name: cleanName,
          unit: ingUnit,
          packageQuantity: qty,
          packagePrice: price,
          updatedAt: serverTimestamp()
        });
        const syncedCount = await syncRecipesForUpdatedIngredient(updatedObj);
        if (syncedCount > 0) {
          toast.success(
            `Ingrediente salvo! ${syncedCount} ${
              syncedCount === 1 ? 'receita foi atualizada' : 'receitas foram atualizadas'
            } automaticamente.`
          );
        } else {
          toast.success('Ingrediente atualizado!');
        }
      } else {
        await addDoc(collection(db, 'ingredientes_precificacao'), {
          name: cleanName,
          unit: ingUnit,
          packageQuantity: qty,
          packagePrice: price,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Ingrediente cadastrado!');
      }
      resetIngredientForm();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar ingrediente. Verifique as regras do Firebase.');
    } finally {
      setIsSavingIngredient(false);
    }
  };

  const resetIngredientForm = () => {
    setEditingIngredientId(null);
    setIngName('');
    setIngUnit('g');
    setIngPkgQty('');
    setIngPkgPrice('');
  };

  const handleEditIngredient = (ing: PricingIngredient) => {
    setEditingIngredientId(ing.id);
    setIngName(ing.name);
    setIngUnit(ing.unit);
    setIngPkgQty(String(ing.packageQuantity));
    setIngPkgPrice(ing.packagePrice ? ing.packagePrice.toFixed(2) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Seed common baking staples
  const handleSeedStarterIngredients = async () => {
    setIsSeedingStarters(true);
    try {
      const existingNames = new Set(ingredients.map((i) => i.name.trim().toLowerCase()));
      const toAdd = STARTER_INGREDIENTS.filter(
        (item) => !existingNames.has(item.name.toLowerCase())
      );
      if (toAdd.length === 0) {
        toast.info('Todos os ingredientes básicos já estão cadastrados!');
        return;
      }
      const batch = writeBatch(db);
      toAdd.forEach((item) => {
        const ref = doc(collection(db, 'ingredientes_precificacao'));
        batch.set(ref, {
          name: item.name,
          unit: item.unit,
          packageQuantity: item.packageQuantity,
          packagePrice: item.packagePrice,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success(
        `${toAdd.length} itens básicos adicionados! Agora clique no lápis para colocar quanto pagou em cada um.`
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar itens básicos.');
    } finally {
      setIsSeedingStarters(false);
    }
  };

  // Inline quick-create ingredient directly from Recipe Editor
  const handleQuickCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = quickIngName.trim();
    const qty = parseFloat(quickIngQty.replace(',', '.'));
    const price = parseMoneyValue(quickIngPrice);

    if (!cleanName || !qty || qty <= 0) {
      toast.error('Preencha o nome e a quantidade da embalagem!');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'ingredientes_precificacao'), {
        name: cleanName,
        unit: quickIngUnit,
        packageQuantity: qty,
        packagePrice: price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Automatically add into the open recipe
      setRecipeIngredients((prev) => [
        ...prev,
        {
          ingredientId: docRef.id,
          ingredientName: cleanName,
          quantityUsed: 0,
          unitUsed: getDefaultRecipeUnit(quickIngUnit)
        }
      ]);

      setShowQuickIngredientModal(false);
      setQuickIngName('');
      setQuickIngUnit('g');
      setQuickIngQty('');
      setQuickIngPrice('');
      toast.success(`"${cleanName}" cadastrado e adicionado à receita!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cadastrar ingrediente.');
    }
  };

  // Open new or existing recipe
  const openNewRecipe = () => {
    setEditingRecipeId(null);
    setRecipeName('');
    setRecipeCategory('Bolos');
    setRecipeYieldQty('1');
    setRecipeYieldLabel('unidade(s)');
    setRecipeIngredients([]);
    setRecipeOverheadPct(15);
    setRecipeLaborInput('');
    setRecipeProfitPct('100');
    setRecipePaymentMethod('none');
    setRecipePaymentFeeInput('0');
    setPickerSearch('');
    setIsRecipeEditorOpen(true);
    setSubView('recipes');
  };

  const openEditRecipe = (rec: PricingRecipe) => {
    setEditingRecipeId(rec.id);
    setRecipeName(rec.name || '');
    setRecipeCategory(rec.category || 'Bolos');
    setRecipeYieldQty(String(rec.yieldQuantity || 1));
    setRecipeYieldLabel(rec.yieldLabel || 'unidade(s)');
    setRecipeIngredients(rec.ingredients ? rec.ingredients.map((i) => ({ ...i })) : []);
    setRecipeOverheadPct(rec.kitchenOverheadPercent ?? 15);
    setRecipeLaborInput(rec.laborCost && rec.laborCost > 0 ? rec.laborCost.toFixed(2) : '');
    setRecipeProfitPct(String(rec.profitPercent ?? 100));
    const pm = rec.paymentMethod || 'none';
    setRecipePaymentMethod(pm);
    setRecipePaymentFeeInput(
      pm === 'none' ? '0' : String(rec.paymentFeePercent ?? DEFAULT_FEE_BY_METHOD[pm])
    );
    setPickerSearch('');
    setIsRecipeEditorOpen(true);
    setSubView('recipes');
  };

  const handleDuplicateRecipe = async (rec: PricingRecipe) => {
    try {
      const calc = computeRecipePricing(
        {
          ingredients: rec.ingredients || [],
          kitchenOverheadPercent: rec.kitchenOverheadPercent ?? 15,
          laborCost: rec.laborCost ?? 0,
          yieldQuantity: rec.yieldQuantity || 1,
          profitPercent: rec.profitPercent ?? 100,
          paymentMethod: rec.paymentMethod || 'none',
          paymentFeePercent: rec.paymentFeePercent ?? 0
        },
        ingredientsMap
      );
      const copyPayload = cleanFirestoreData({
        name: `${rec.name} (Cópia)`,
        category: rec.category || 'Bolos',
        yieldQuantity: rec.yieldQuantity || 1,
        yieldLabel: rec.yieldLabel || 'unidade(s)',
        ingredients: rec.ingredients || [],
        kitchenOverheadPercent: rec.kitchenOverheadPercent ?? 15,
        laborCost: rec.laborCost ?? 0,
        profitPercent: rec.profitPercent ?? 100,
        paymentMethod: rec.paymentMethod || 'none',
        paymentFeePercent: calc.paymentFeePercent,
        ingredientsCost: Number(calc.ingredientsCost.toFixed(2)),
        totalRecipeCost: Number(calc.totalRecipeCost.toFixed(2)),
        unitCost: Number(calc.unitCost.toFixed(2)),
        suggestedUnitPrice: Number(calc.suggestedUnitPrice.toFixed(2)),
        suggestedRecipePrice: Number(calc.suggestedRecipePrice.toFixed(2)),
        expectedProfitUnit: Number(calc.expectedProfitUnit.toFixed(2)),
        expectedProfitRecipe: Number(calc.expectedProfitRecipe.toFixed(2)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'receitas_precificacao'), copyPayload);
      toast.success('Receita duplicada!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao duplicar receita.');
    }
  };

  const handleAddIngredientToRecipe = (ing: PricingIngredient) => {
    const alreadyAdded = recipeIngredients.some((item) => item.ingredientId === ing.id);
    if (alreadyAdded) {
      toast.info(`"${ing.name}" já está na receita. Ajuste a quantidade abaixo.`);
      return;
    }
    setRecipeIngredients((prev) => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        quantityUsed: ing.unit === 'un' ? 1 : 0,
        unitUsed: getDefaultRecipeUnit(ing.unit)
      }
    ]);
  };

  const handleSelectPaymentMethod = (method: PricingPaymentMethod) => {
    setRecipePaymentMethod(method);
    setRecipePaymentFeeInput(String(DEFAULT_FEE_BY_METHOD[method]));
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = recipeName.trim();
    if (!cleanName) {
      toast.error('Dê um nome para esta receita ou produto!');
      return;
    }
    if (recipeIngredients.length === 0) {
      toast.error('Adicione pelo menos 1 ingrediente na receita!');
      return;
    }

    setIsSavingRecipe(true);
    try {
      const payload = cleanFirestoreData({
        name: cleanName,
        category: recipeCategory,
        yieldQuantity: editorPricing.yieldQty,
        yieldLabel: recipeYieldLabel,
        ingredients: recipeIngredients.map((it) => ({
          ingredientId: it.ingredientId,
          ingredientName: ingredientsMap.get(it.ingredientId)?.name || it.ingredientName,
          quantityUsed: Number(it.quantityUsed) || 0,
          unitUsed: it.unitUsed
        })),
        kitchenOverheadPercent: recipeOverheadPct,
        laborCost: Number(editorPricing.laborCost.toFixed(2)),
        profitPercent: Math.max(0, parseFloat(recipeProfitPct.replace(',', '.')) || 0),
        paymentMethod: recipePaymentMethod,
        paymentFeePercent: editorPricing.paymentFeePercent,
        ingredientsCost: Number(editorPricing.ingredientsCost.toFixed(2)),
        totalRecipeCost: Number(editorPricing.totalRecipeCost.toFixed(2)),
        unitCost: Number(editorPricing.unitCost.toFixed(2)),
        suggestedUnitPrice: Number(editorPricing.suggestedUnitPrice.toFixed(2)),
        suggestedRecipePrice: Number(editorPricing.suggestedRecipePrice.toFixed(2)),
        expectedProfitUnit: Number(editorPricing.expectedProfitUnit.toFixed(2)),
        expectedProfitRecipe: Number(editorPricing.expectedProfitRecipe.toFixed(2)),
        updatedAt: serverTimestamp()
      });

      if (editingRecipeId) {
        await updateDoc(doc(db, 'receitas_precificacao', editingRecipeId), payload);
        toast.success('Receita e preço salvos com sucesso!');
      } else {
        await addDoc(collection(db, 'receitas_precificacao'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Receita salva na aba Precificação!');
      }
      setIsRecipeEditorOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar receita. Verifique as regras do Firebase.');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'ingredient') {
        await deleteDoc(doc(db, 'ingredientes_precificacao', confirmDelete.id));
        if (editingIngredientId === confirmDelete.id) resetIngredientForm();
        toast.success('Ingrediente excluído!');
      } else {
        await deleteDoc(doc(db, 'receitas_precificacao', confirmDelete.id));
        toast.success('Receita excluída!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir item.');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-6 pb-16">
      {/* Header Principal */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-gray-200/90 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl shadow-sm"
              style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
            >
              <Calculator size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                Precificação de Confeitaria
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">
                Cadastre o preço dos ingredientes, monte suas receitas e saiba exatamente quanto cobrar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSubView('recipes');
                setIsRecipeEditorOpen(false);
              }}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                subView === 'recipes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <BookOpen size={15} />
              <span>Receitas Salvas ({recipes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubView('ingredients');
                setIsRecipeEditorOpen(false);
              }}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                subView === 'ingredients'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Package size={15} />
              <span>Meus Ingredientes ({ingredients.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openNewRecipe}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
            style={{ backgroundColor: primaryColor, color: contrastText }}
          >
            <Plus size={17} />
            <span>Nova Receita</span>
          </button>
        </div>
      </div>

      {/* Aviso amigável caso as regras do Firebase ainda não tenham sido atualizadas */}
      {permissionError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Atualize as regras do Firebase para salvar sua Precificação</p>
            <p className="text-amber-900">
              As novas coleções <span className="font-mono font-bold">ingredientes_precificacao</span> e{' '}
              <span className="font-mono font-bold">receitas_precificacao</span> precisam ser liberadas nas regras do Firestore.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white/95 rounded-3xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-sm font-semibold">Carregando precificação...</span>
        </div>
      ) : subView === 'recipes' && isRecipeEditorOpen ? (
        /* ==================== EDITOR DE RECEITA ==================== */
        <form onSubmit={handleSaveRecipe} className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRecipeEditorOpen(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Voltar para Receitas Salvas</span>
            </button>
            <span className="text-xs font-bold text-gray-500">
              {editingRecipeId ? 'Editando receita salva' : 'Nova receita'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: Dados da receita + Ingredientes */}
            <div className="lg:col-span-7 space-y-6">
              {/* Passo 1: Nome e Rendimento */}
              <div className="bg-white/95 p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-serif font-bold text-gray-900">
                    1. Qual é a receita ou produto?
                  </h2>
                  <p className="text-xs text-gray-500">
                    Dê um nome fácil e diga quantas unidades essa receita inteira rende.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      Nome da Receita / Produto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Bolo de Cenoura com Brigad., Brigadeiro Tradicional..."
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Categoria</label>
                    <select
                      value={recipeCategory}
                      onChange={(e) => setRecipeCategory(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/15"
                    >
                      {RECIPE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      Rende quantas unidades?
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={recipeYieldQty}
                      onChange={(e) => setRecipeYieldQty(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                    />
                    <p className="text-[11px] text-gray-500">
                      Deixe <strong>1</strong> para bolo inteiro, ou digite ex: <strong>25</strong> docinhos / <strong>8</strong> potes.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Tipo de unidade</label>
                    <select
                      value={recipeYieldLabel}
                      onChange={(e) => setRecipeYieldLabel(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/15"
                    >
                      {YIELD_LABELS.map((lbl) => (
                        <option key={lbl} value={lbl}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Passo 2: Ingredientes e Embalagens */}
              <div className="bg-white/95 p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-gray-900">
                      2. O que vai nessa receita?
                    </h2>
                    <p className="text-xs text-gray-500">
                      Escolha ingredientes já cadastrados abaixo e coloque só quanto você usa na receita.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickIngredientModal(true)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start"
                  >
                    <Plus size={14} />
                    <span>Cadastrar Novo Ingrediente</span>
                  </button>
                </div>

                {/* Buscador e seleção rápida de ingredientes que se repetem */}
                <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Buscar ingrediente já cadastrado para adicionar..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black/15"
                    />
                    {pickerSearch && (
                      <button
                        type="button"
                        onClick={() => setPickerSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {ingredients.length === 0 ? (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-gray-600 font-medium">
                        Você ainda não cadastrou nenhum ingrediente ou embalagem.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleSeedStarterIngredients}
                          disabled={isSeedingStarters}
                          className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-800 hover:bg-gray-100 cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles size={14} />
                          <span>Carregar Ingredientes Básicos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowQuickIngredientModal(true)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                          style={{ backgroundColor: primaryColor, color: contrastText }}
                        >
                          <Plus size={14} />
                          <span>Cadastrar Primeiro Ingrediente</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-gray-500 block">
                        Toque para adicionar na receita (mais usados primeiro):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {pickerIngredients.map((ing) => {
                          const isAdded = recipeIngredients.some((r) => r.ingredientId === ing.id);
                          return (
                            <button
                              key={ing.id}
                              type="button"
                              onClick={() => handleAddIngredientToRecipe(ing)}
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
                                isAdded
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-white border-gray-200 text-gray-800 hover:border-gray-400 hover:bg-gray-100'
                              )}
                            >
                              {isAdded ? <Check size={12} /> : <Plus size={12} />}
                              <span>{ing.name}</span>
                              <span className="text-[11px] text-gray-500 tabular-nums">
                                ({formatUSD(ing.packagePrice)} / {ing.packageQuantity}
                                {UNIT_SHORT[ing.unit]})
                              </span>
                            </button>
                          );
                        })}
                        {pickerIngredients.length === 0 && (
                          <span className="text-xs text-gray-500 py-2">
                            Nenhum ingrediente encontrado com &ldquo;{pickerSearch}&rdquo;.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de ingredientes adicionados na receita */}
                {recipeIngredients.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-2xl text-xs sm:text-sm text-gray-500">
                    Clique nos ingredientes acima para montar sua receita.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                    {recipeIngredients.map((row, idx) => {
                      const ing = ingredientsMap.get(row.ingredientId);
                      const compatUnits = ing ? getCompatibleUnits(ing.unit) : [row.unitUsed];
                      const rowCost = calculateIngredientRowCost(
                        ing,
                        Number(row.quantityUsed) || 0,
                        row.unitUsed
                      );

                      return (
                        <div
                          key={row.ingredientId + '-' + idx}
                          className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-gray-900 truncate">
                              {ing?.name || row.ingredientName}
                            </p>
                            <p className="text-[11px] text-gray-500 tabular-nums">
                              {ing
                                ? ing.packagePrice > 0
                                  ? `Pacote: ${ing.packageQuantity} ${UNIT_SHORT[ing.unit]} por ${formatUSD(ing.packagePrice)}`
                                  : 'Atenção: preço do pacote está $0.00 (edite em Meus Ingredientes)'
                                : 'Ingrediente removido da lista'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Qtd"
                              value={row.quantityUsed || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setRecipeIngredients((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, quantityUsed: val } : item
                                  )
                                );
                              }}
                              className="w-24 p-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-900 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                            />
                            <select
                              value={row.unitUsed}
                              disabled={compatUnits.length === 1}
                              onChange={(e) => {
                                const newUnit = e.target.value as PricingUnit;
                                setRecipeIngredients((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, unitUsed: newUnit } : item
                                  )
                                );
                              }}
                              className="p-2 rounded-xl border border-gray-300 bg-gray-50 text-xs font-bold text-gray-800 focus:outline-none disabled:opacity-75"
                            >
                              {compatUnits.map((u) => (
                                <option key={u} value={u}>
                                  {UNIT_SHORT[u]}
                                </option>
                              ))}
                            </select>
                            <div className="w-20 text-right font-extrabold text-sm text-gray-900 tabular-nums">
                              {formatUSD(rowCost)}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Remover da receita"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Custos invisíveis da cozinha + mão de obra opcional */}
                <div className="pt-2 border-t border-gray-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">
                      Gás, Luz, Água e Detergente (Custos da Cozinha)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { pct: 0, label: 'Sem extra (0%)' },
                        { pct: 10, label: 'Baixo (+10%)' },
                        { pct: 15, label: 'Padrão (+15%)' },
                        { pct: 20, label: 'Forno longo (+20%)' }
                      ].map((opt) => (
                        <button
                          key={opt.pct}
                          type="button"
                          onClick={() => setRecipeOverheadPct(opt.pct)}
                          className={cn(
                            'py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                            recipeOverheadPct === opt.pct
                              ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">
                      Meu trabalho / tempo neste item ($ opcional)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00 (opcional)"
                        value={recipeLaborInput}
                        onChange={(e) => setRecipeLaborInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Se quiser somar um valor fixo pelo seu tempo de produção/decoração, coloque aqui.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: Quanto quero ganhar + Taxas + Preço Final */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              <div className="bg-white/95 p-6 rounded-3xl border border-gray-200 shadow-md space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-serif font-bold text-gray-900">
                    3. Lucro, Taxas e Preço Final
                  </h2>
                </div>

                {/* Quanto quero ganhar nesse item */}
                <div className="space-y-2.5">
                  <label className="text-sm font-bold text-gray-900 block">
                    Quanto quero ganhar nesse item (%)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { pct: '50', label: '+50%' },
                      { pct: '100', label: '+100% (Dobro)' },
                      { pct: '150', label: '+150%' },
                      { pct: '200', label: '+200% (3x)' }
                    ].map((preset) => (
                      <button
                        key={preset.pct}
                        type="button"
                        onClick={() => setRecipeProfitPct(preset.pct)}
                        className={cn(
                          'py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                          recipeProfitPct === preset.pct
                            ? 'text-white border-transparent shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        )}
                        style={
                          recipeProfitPct === preset.pct
                            ? { backgroundColor: primaryColor, color: contrastText }
                            : {}
                        }
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Ou digite a %:</span>
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={recipeProfitPct}
                        onChange={(e) => setRecipeProfitPct(e.target.value)}
                        className="w-full p-2 pr-7 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Forma de pagamento e taxas */}
                <div className="space-y-2.5 pt-2 border-t border-gray-100">
                  <label className="text-sm font-bold text-gray-900 block">
                    Incluir taxa de pagamento?
                  </label>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <strong>Zelle e Venmo não têm taxa.</strong> Se o cliente pagar com cartão ou PayPal, clique abaixo para somar a taxa sem tirar do seu lucro:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['none', 'debit', 'credit', 'paypal'] as PricingPaymentMethod[]).map(
                      (method) => {
                        const info = PAYMENT_METHOD_INFO[method];
                        const isSelected = recipePaymentMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => handleSelectPaymentMethod(method)}
                            className={cn(
                              'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5',
                              isSelected
                                ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                                : 'border-gray-200 bg-gray-50/70 text-gray-800 hover:bg-gray-100'
                            )}
                          >
                            <div className="mt-0.5 shrink-0">
                              {method === 'none' ? (
                                <Smartphone size={16} />
                              ) : (
                                <CreditCard size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight">{info.label}</p>
                              <p
                                className={cn(
                                  'text-[11px] mt-0.5',
                                  isSelected ? 'text-gray-300' : 'text-gray-500'
                                )}
                              >
                                {info.sublabel}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {recipePaymentMethod !== 'none' && (
                    <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl p-3 mt-1">
                      <span className="text-xs font-bold text-blue-950">
                        Taxa do {PAYMENT_METHOD_INFO[recipePaymentMethod].label} (%):
                      </span>
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                          value={recipePaymentFeeInput}
                          onChange={(e) => setRecipePaymentFeeInput(e.target.value)}
                          className="w-full p-1.5 pr-6 rounded-lg border border-blue-300 bg-white text-gray-900 text-xs font-bold text-right tabular-nums focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo Transparente de Contas */}
                <div className="space-y-2 pt-3 border-t border-gray-200 text-xs sm:text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Ingredientes e embalagens:</span>
                    <span className="font-bold tabular-nums text-gray-900">
                      {formatUSD(editorPricing.ingredientsCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Gás / Luz / Água (+{recipeOverheadPct}%):</span>
                    <span className="font-bold tabular-nums text-gray-900">
                      {formatUSD(editorPricing.overheadCost)}
                    </span>
                  </div>
                  {editorPricing.laborCost > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Seu trabalho / mão de obra:</span>
                      <span className="font-bold tabular-nums text-gray-900">
                        {formatUSD(editorPricing.laborCost)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-gray-900">
                    <span>Custo total da receita:</span>
                    <span className="tabular-nums">{formatUSD(editorPricing.totalRecipeCost)}</span>
                  </div>
                  {editorPricing.yieldQty > 1 && (
                    <div className="flex justify-between text-gray-700 font-semibold">
                      <span>
                        Custo por {recipeYieldLabel.replace('(s)', '')} ({editorPricing.yieldQty}x):
                      </span>
                      <span className="tabular-nums">{formatUSD(editorPricing.unitCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>
                      Seu lucro limpo ({editorPricing.yieldQty > 1 ? 'por unidade' : 'na receita'}):
                    </span>
                    <span className="tabular-nums">
                      +{' '}
                      {formatUSD(
                        editorPricing.yieldQty > 1
                          ? editorPricing.expectedProfitUnit
                          : editorPricing.expectedProfitRecipe
                      )}
                    </span>
                  </div>
                  {editorPricing.paymentFeePercent > 0 && (
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>Taxa {PAYMENT_METHOD_INFO[recipePaymentMethod].label} (+{editorPricing.paymentFeePercent}%):</span>
                      <span className="tabular-nums">
                        +{' '}
                        {formatUSD(
                          editorPricing.yieldQty > 1
                            ? editorPricing.paymentFeeUnitAmount
                            : editorPricing.paymentFeeRecipeAmount
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Resultado Gigante */}
                <div
                  className="p-5 rounded-2xl text-center space-y-1 shadow-inner"
                  style={{ backgroundColor: `${primaryColor}14`, border: `1px solid ${primaryColor}40` }}
                >
                  <p className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                    {editorPricing.yieldQty > 1
                      ? `Preço sugerido por ${recipeYieldLabel.replace('(s)', '')}`
                      : 'Preço ideal para vender'}
                  </p>
                  <p
                    className="text-4xl font-black tabular-nums tracking-tight"
                    style={{ color: primaryColor }}
                  >
                    {formatUSD(
                      editorPricing.yieldQty > 1
                        ? editorPricing.suggestedUnitPrice
                        : editorPricing.suggestedRecipePrice
                    )}
                  </p>

                  {editorPricing.yieldQty > 1 && (
                    <p className="text-xs font-bold text-gray-700 pt-1 tabular-nums">
                      Receita completa ({editorPricing.yieldQty} {recipeYieldLabel}):{' '}
                      {formatUSD(editorPricing.suggestedRecipePrice)}
                    </p>
                  )}

                  {editorPricing.paymentFeePercent > 0 && (
                    <p className="text-xs font-semibold text-emerald-800 pt-1 tabular-nums">
                      No Zelle / Venmo / Dinheiro (sem taxa):{' '}
                      <strong>
                        {formatUSD(
                          editorPricing.yieldQty > 1
                            ? editorPricing.baseUnitPrice
                            : editorPricing.baseRecipePrice
                        )}
                      </strong>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingRecipe}
                  className="w-full py-4 rounded-2xl font-bold text-base shadow-lg hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  {isSavingRecipe ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>{editingRecipeId ? 'Atualizar Receita e Preço' : 'Salvar Receita e Preço'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : subView === 'recipes' ? (
        /* ==================== LISTA DE RECEITAS SALVAS ==================== */
        <div className="space-y-5">
          {/* Busca e Filtro por Categoria */}
          <div className="bg-white/95 p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar receita pelo nome ou ingrediente..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/15"
              />
              {recipeSearch && (
                <button
                  type="button"
                  onClick={() => setRecipeSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['Todas', ...RECIPE_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setRecipeCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    recipeCategoryFilter === cat
                      ? 'text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                  style={
                    recipeCategoryFilter === cat
                      ? { backgroundColor: primaryColor, color: contrastText }
                      : {}
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="bg-white/95 rounded-3xl border border-gray-200 p-10 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
                <Calculator size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-serif font-bold text-gray-900">
                  {recipes.length === 0
                    ? 'Nenhuma receita precificada ainda'
                    : 'Nenhuma receita encontrada na busca'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {recipes.length === 0
                    ? 'Cadastre seus ingredientes uma única vez e crie sua primeira receita para salvar o preço de venda ideal.'
                    : 'Tente buscar outro nome ou limpar os filtros acima.'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                {recipes.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setSubView('ingredients')}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold text-xs sm:text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    1º Passo: Cadastrar Ingredientes
                  </button>
                )}
                <button
                  type="button"
                  onClick={openNewRecipe}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:opacity-95 cursor-pointer flex items-center gap-2"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  <Plus size={16} />
                  <span>Criar Nova Receita</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecipes.map((rec) => {
                const live = computeRecipePricing(
                  {
                    ingredients: rec.ingredients || [],
                    kitchenOverheadPercent: rec.kitchenOverheadPercent ?? 15,
                    laborCost: rec.laborCost ?? 0,
                    yieldQuantity: rec.yieldQuantity || 1,
                    profitPercent: rec.profitPercent ?? 100,
                    paymentMethod: rec.paymentMethod || 'none',
                    paymentFeePercent: rec.paymentFeePercent ?? 0
                  },
                  ingredientsMap
                );
                const isUnit = live.yieldQty > 1;
                const displayCost = isUnit ? live.unitCost : live.totalRecipeCost;
                const displayProfit = isUnit ? live.expectedProfitUnit : live.expectedProfitRecipe;
                const displayPrice = isUnit ? live.suggestedUnitPrice : live.suggestedRecipePrice;
                const displayBaseZelle = isUnit ? live.baseUnitPrice : live.baseRecipePrice;
                const paymentInfo = PAYMENT_METHOD_INFO[rec.paymentMethod || 'none'];

                return (
                  <div
                    key={rec.id}
                    className="bg-white/95 rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                          <span>{rec.category || 'Outros'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{(rec.ingredients || []).length} ingredientes</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Rende {live.yieldQty} {rec.yieldLabel || 'unidade(s)'}
                          </span>
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 mt-1 truncate">
                          {rec.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditRecipe(rec)}
                          className="p-2 text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          title="Editar receita"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateRecipe(rec)}
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          title="Duplicar receita"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({ type: 'recipe', id: rec.id, name: rec.name })
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Excluir receita"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Resumo Financeiro da Receita */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
                      <div className="py-2 px-2 rounded-xl bg-gray-50">
                        <span className="text-[11px] font-bold text-gray-500 block">
                          {isUnit ? 'Custo / un' : 'Custo Total'}
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-gray-900 tabular-nums">
                          {formatUSD(displayCost)}
                        </span>
                      </div>
                      <div className="py-2 px-2 rounded-xl bg-emerald-50/70">
                        <span className="text-[11px] font-bold text-emerald-700 block">
                          Lucro ({rec.profitPercent ?? 100}%)
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums">
                          {formatUSD(displayProfit)}
                        </span>
                      </div>
                      <div
                        className="py-2 px-2 rounded-xl"
                        style={{ backgroundColor: `${primaryColor}16` }}
                      >
                        <span className="text-[11px] font-bold text-gray-700 block">
                          {isUnit ? 'Vender / un' : 'Vender por'}
                        </span>
                        <span
                          className="text-base sm:text-lg font-black tabular-nums"
                          style={{ color: primaryColor }}
                        >
                          {formatUSD(displayPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 pt-1">
                      <span>
                        Pagamento: <strong>{paymentInfo.label}</strong>
                        {live.paymentFeePercent > 0 ? ` (+${live.paymentFeePercent}%)` : ' (sem taxa)'}
                      </span>
                      {live.paymentFeePercent > 0 && (
                        <span className="font-semibold text-emerald-800 tabular-nums">
                          Zelle/Venmo: {formatUSD(displayBaseZelle)}
                        </span>
                      )}
                      {isUnit && (
                        <span className="font-semibold text-gray-700 tabular-nums">
                          Receita total: {formatUSD(live.suggestedRecipePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== MEUS INGREDIENTES E EMBALAGENS ==================== */
        <div className="space-y-6">
          {/* Formulário Simples de Cadastro / Edição */}
          <form
            onSubmit={handleSaveIngredient}
            className="bg-white/95 p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-gray-900">
                  {editingIngredientId
                    ? 'Editar Ingrediente ou Embalagem'
                    : 'Cadastrar Ingrediente ou Embalagem'}
                </h2>
                <p className="text-xs text-gray-500">
                  Coloque exatamente como você compra no mercado. Se o preço mudar aqui, todas as receitas atualizam sozinhas!
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedStarterIngredients}
                disabled={isSeedingStarters}
                className="px-3.5 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 self-start whitespace-nowrap"
              >
                <Sparkles size={14} />
                <span>Carregar Itens Básicos</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Nome do Produto / Embalagem *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leite Condensado, Farinha, Caixa de Bolo..."
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/15"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Tamanho do Pacote *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="Ex: 395"
                  value={ingPkgQty}
                  onChange={(e) => setIngPkgQty(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Medida *</label>
                <select
                  value={ingUnit}
                  onChange={(e) => setIngUnit(e.target.value as PricingUnit)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/15"
                >
                  {(Object.keys(UNIT_LABELS) as PricingUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Quanto pagou ($) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={ingPkgPrice}
                    onChange={(e) => setIngPkgPrice(e.target.value)}
                    className="w-full p-3 pl-7 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-black/15"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-gray-500 font-medium">
                {(() => {
                  const q = parseFloat(ingPkgQty.replace(',', '.'));
                  const p = parseMoneyValue(ingPkgPrice);
                  if (q > 0 && p > 0) {
                    const base = toBaseAmount(q, ingUnit);
                    const baseUnit = ingUnit === 'kg' ? 'g' : ingUnit === 'l' ? 'ml' : ingUnit;
                    const unitCost = p / base;
                    return (
                      <span className="tabular-nums">
                        Custo unitário calculado:{' '}
                        <strong className="text-gray-800">
                          $ {unitCost < 0.01 ? unitCost.toFixed(4) : unitCost.toFixed(2)} por{' '}
                          {baseUnit}
                        </strong>
                      </span>
                    );
                  }
                  return 'Exemplo: Leite Condensado · 395 · gramas (g) · $ 2.50';
                })()}
              </div>

              <div className="flex items-center gap-2">
                {editingIngredientId && (
                  <button
                    type="button"
                    onClick={resetIngredientForm}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingIngredient}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:opacity-95 cursor-pointer flex items-center gap-2"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  {isSavingIngredient ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : editingIngredientId ? (
                    <Save size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>
                    {editingIngredientId ? 'Salvar e Atualizar Receitas' : 'Salvar Ingrediente'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Busca + Lista de Ingredientes */}
          <div className="bg-white/95 rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={17}
                />
                <input
                  type="text"
                  placeholder="Buscar ingrediente ou embalagem cadastrada..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/15"
                />
                {ingredientSearch && (
                  <button
                    type="button"
                    onClick={() => setIngredientSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {filteredIngredients.length}{' '}
                {filteredIngredients.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
              </span>
            </div>

            {filteredIngredients.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">
                {ingredients.length === 0
                  ? 'Nenhum ingrediente cadastrado ainda. Preencha os campos acima ou clique em "Carregar Itens Básicos".'
                  : 'Nenhum ingrediente encontrado para essa busca.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIngredients.map((ing) => {
                  const usedInCount = ingredientUsageCount.get(ing.id) || 0;
                  return (
                    <div
                      key={ing.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{ing.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="tabular-nums">
                            Embalagem: {ing.packageQuantity} {UNIT_SHORT[ing.unit]}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {usedInCount === 0
                              ? 'Ainda não usado em receitas'
                              : usedInCount === 1
                              ? 'Usado em 1 receita'
                              : `Usado em ${usedInCount} receitas`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          {ing.packagePrice > 0 ? (
                            <span className="text-base font-extrabold text-gray-900 tabular-nums">
                              {formatUSD(ing.packagePrice)}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              Colocar preço
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditIngredient(ing)}
                            className="p-2 text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Editar ingrediente"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: 'ingredient',
                                id: ing.id,
                                name: ing.name
                              })
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Excluir ingrediente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Rápido: Cadastrar Ingrediente sem sair da Receita */}
      {showQuickIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-serif font-bold text-gray-900">
                Novo Ingrediente / Embalagem
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickIngredientModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateIngredient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Morango Fresco, Cream Cheese..."
                  value={quickIngName}
                  onChange={(e) => setQuickIngName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-black/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Qtd da Embalagem *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="Ex: 500"
                    value={quickIngQty}
                    onChange={(e) => setQuickIngQty(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 text-sm font-bold text-gray-900 tabular-nums outline-none focus:ring-2 focus:ring-black/15"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Medida *</label>
                  <select
                    value={quickIngUnit}
                    onChange={(e) => setQuickIngUnit(e.target.value as PricingUnit)}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-black/15"
                  >
                    {(Object.keys(UNIT_LABELS) as PricingUnit[]).map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Quanto pagou ($) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={quickIngPrice}
                    onChange={(e) => setQuickIngPrice(e.target.value)}
                    className="w-full p-3 pl-7 rounded-xl border border-gray-300 text-sm font-bold text-gray-900 tabular-nums outline-none focus:ring-2 focus:ring-black/15"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickIngredientModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer"
                  style={{ backgroundColor: primaryColor, color: contrastText }}
                >
                  Cadastrar e Usar na Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-lg font-serif font-bold text-gray-900">
              {confirmDelete.type === 'ingredient' ? 'Excluir Ingrediente?' : 'Excluir Receita?'}
            </h3>
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
