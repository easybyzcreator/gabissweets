export const parseMoneyValue = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val);
  const clean = String(val).trim().replace(/[^\d.,]/g, '');
  if (!clean) return 0;
  
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      // Ex: 1.000,50 (formato BR)
      return Math.max(0, parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0);
    } else {
      // Ex: 1,000.50 (formato US)
      return Math.max(0, parseFloat(clean.replace(/,/g, '')) || 0);
    }
  }
  
  if (clean.includes(',')) {
    // Ex: 100,00 ou 28,50
    return Math.max(0, parseFloat(clean.replace(',', '.')) || 0);
  }
  
  return Math.max(0, parseFloat(clean) || 0);
};

export const formatCurrencyInput = (value: string, locale: string = 'en-US'): string => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const numericValue = parseInt(digits, 10) / 100;
  return numericValue.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatMoneyString = (val: number | string | undefined | null, locale: string = 'en-US'): string => {
  const num = typeof val === 'number' ? val : parseMoneyValue(val);
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
