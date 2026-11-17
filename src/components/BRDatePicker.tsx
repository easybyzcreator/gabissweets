import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface BRDatePickerProps {
  value: string; // "DD/MM/AAAA" or "AAAA-MM-DD" or empty
  onChange: (formattedDate: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  primaryColor?: string;
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  outputFormat?: 'br' | 'iso';
  compact?: boolean;
  id?: string;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const toDisplayBR = (val: string): string => {
  if (!val) return '';
  if (val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return val;
};

const toIsoYMD = (br: string): string => {
  const parts = br.split('/');
  if (parts.length !== 3) return '';
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (!d || !m || !y || m < 1 || m > 12 || d < 1 || d > 31 || parts[2].length !== 4) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export default function BRDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  className,
  inputClassName,
  primaryColor = '#000000',
  minDate,
  maxDate,
  disablePast = false,
  outputFormat = 'br',
  compact = false,
  id = 'br-datepicker'
}: BRDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effective minimum date: if disablePast is true and no minDate provided, use start of today
  const effectiveMinDate = React.useMemo(() => {
    if (minDate) {
      return new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    }
    if (disablePast) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    return undefined;
  }, [minDate, disablePast]);

  // Normalize incoming value to DD/MM/AAAA for display and input
  const normalizedValueBR = React.useMemo(() => toDisplayBR(value), [value]);
  const [inputText, setInputText] = useState<string>(normalizedValueBR);

  useEffect(() => {
    setInputText(normalizedValueBR);
  }, [normalizedValueBR]);

  const displayValue = outputFormat === 'iso' ? inputText : normalizedValueBR;

  // Current calendar viewing month and year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (normalizedValueBR && normalizedValueBR.length === 10) {
      const parts = normalizedValueBR.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900 && y < 2100) {
          return new Date(y, m, d);
        }
      }
    }
    return new Date();
  });

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const emitDate = (brFormatted: string) => {
    setInputText(brFormatted);
    if (outputFormat === 'iso') {
      if (!brFormatted) {
        onChange('');
      } else if (brFormatted.length === 10) {
        const iso = toIsoYMD(brFormatted);
        if (iso) onChange(iso);
      }
    } else {
      onChange(brFormatted);
    }
  };

  // Handle typing inside text input with auto mask DD/MM/AAAA
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length > 4) {
      formatted = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
    } else if (val.length > 2) {
      formatted = val.slice(0, 2) + '/' + val.slice(2);
    }
    emitDate(formatted);

    // If fully filled DD/MM/AAAA, update viewDate
    if (formatted.length === 10) {
      const parts = formatted.split('/');
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900 && y < 2100) {
        setViewDate(new Date(y, m, 1));
      }
    }
  };

  // Calendar matrix calculation for viewDate
  const calendarDays = React.useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const isDateDisabled = (d: Date) => {
      const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (effectiveMinDate) {
        const minTime = new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), effectiveMinDate.getDate()).getTime();
        if (targetTime < minTime) return true;
      }
      if (maxDate) {
        const maxTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
        if (targetTime > maxTime) return true;
      }
      return false;
    };

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
      dateStringBR: string;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const today = new Date();
    const todayStrBR = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const formatDateBR = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dStr = formatDateBR(d);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: dayNum,
        dateStringBR: dStr,
        isToday: dStr === todayStrBR,
        isSelected: dStr === displayValue,
        isDisabled: isDateDisabled(d)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = formatDateBR(d);
      days.push({
        date: d,
        isCurrentMonth: true,
        dayNumber: i,
        dateStringBR: dStr,
        isToday: dStr === todayStrBR,
        isSelected: dStr === displayValue,
        isDisabled: isDateDisabled(d)
      });
    }

    // Next month filler
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = formatDateBR(d);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: i,
        dateStringBR: dStr,
        isToday: dStr === todayStrBR,
        isSelected: dStr === displayValue,
        isDisabled: isDateDisabled(d)
      });
    }

    return days;
  }, [viewDate, displayValue, effectiveMinDate, maxDate]);

  const handleSelectDay = (dateStrBR: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    emitDate(dateStrBR);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    emitDate(todayStr);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", compact ? "w-auto" : "w-full")} id={id}>
      <div 
        onClick={() => setIsOpen(true)}
        className={cn(
          compact
            ? "flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white transition-all cursor-pointer focus-within:ring-2 focus-within:border-black"
            : "w-full flex items-center justify-between p-3 rounded-xl border border-gray-300 bg-white transition-all cursor-pointer focus-within:ring-2 focus-within:border-black",
          className
        )}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            "w-full bg-transparent outline-none text-black font-semibold placeholder:text-gray-400",
            compact ? "text-xs w-24" : "text-sm",
            inputClassName
          )}
        />

        <div className={cn("flex items-center gap-0.5 text-gray-500 shrink-0", compact ? "pl-1" : "pl-2")}>
          {displayValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                emitDate('');
              }}
              className="p-0.5 hover:text-red-500 rounded-full transition-colors"
              title="Limpar data"
            >
              <X size={compact ? 12 : 14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-0.5 text-gray-700 hover:text-black transition-colors"
            title="Abrir calendário"
          >
            <CalendarIcon size={compact ? 15 : 18} />
          </button>
        </div>
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <div className="font-bold text-sm text-gray-900 font-sans">
              {MONTH_NAMES_PT[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleTodayClick}
                className="px-2 py-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS_SHORT_PT.map((w, idx) => (
              <span key={idx} className="text-[10px] font-bold text-gray-400 uppercase py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDay(item.dateStringBR, item.isDisabled)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all",
                    item.isDisabled
                      ? "text-gray-300 opacity-30 cursor-not-allowed line-through hover:bg-transparent pointer-events-none"
                      : "cursor-pointer",
                    !item.isDisabled && !item.isCurrentMonth && "text-gray-300 hover:text-gray-500",
                    !item.isDisabled && item.isCurrentMonth && !item.isSelected && !item.isToday && "text-gray-700 hover:bg-gray-100",
                    !item.isDisabled && item.isToday && !item.isSelected && "text-blue-600 font-extrabold bg-blue-50 hover:bg-blue-100",
                    !item.isDisabled && item.isSelected && "bg-black text-white font-extrabold shadow-sm"
                  )}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Formato: <strong>DD/MM/AAAA</strong></span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-black hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
