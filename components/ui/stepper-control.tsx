'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperControlProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function StepperControl({
  value,
  min = 1,
  max = 100,
  step = 1,
  onChange,
  label,
  description,
  disabled = false,
}: StepperControlProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  const handleDecrement = () => {
    if (disabled || !canDecrement) return;
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    if (disabled || !canIncrement) return;
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const inputValue = parseInt(e.target.value, 10);
    if (isNaN(inputValue)) return;
    const clampedValue = Math.max(min, Math.min(max, inputValue));
    onChange(clampedValue);
  };

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
      {(label || description) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-foreground">{label}</label>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${
            canDecrement && !disabled
              ? 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
              : 'border-border/50 bg-muted/50 cursor-not-allowed'
          }`}
          aria-label="Decrease value"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Value input */}
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          className="w-20 h-11 px-3 text-center bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground font-medium disabled:cursor-not-allowed"
        />

        {/* Increment button */}
        <button
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${
            canIncrement && !disabled
              ? 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
              : 'border-border/50 bg-muted/50 cursor-not-allowed'
          }`}
          aria-label="Increase value"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default StepperControl;
