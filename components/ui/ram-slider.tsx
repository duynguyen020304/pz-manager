'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface RamSliderProps {
  min?: number;
  max?: number;
  xms: number;
  xmx: number;
  systemRam?: number;
  onChange: (xms: number, xmx: number) => void;
  disabled?: boolean;
}

const RAM_PRESETS = [
  { label: 'Small', xms: 4, xmx: 6, description: '2-8 players' },
  { label: 'Medium', xms: 8, xmx: 12, description: '8-20 players' },
  { label: 'Large', xms: 16, xmx: 24, description: '20-50 players' },
  { label: 'Max', xms: 24, xmx: 32, description: '50+ players' },
] as const;

export function RamSlider({
  min = 2,
  max = 32,
  xms,
  xmx,
  systemRam = 64,
  onChange,
  disabled = false,
}: RamSliderProps) {
  const [isDragging, setIsDragging] = useState<'xms' | 'xmx' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = (value: number) => ((value - min) / (max - min)) * 100;

  const handlePresetClick = (xmsValue: number, xmxValue: number) => {
    if (disabled) return;
    onChange(xmsValue, xmxValue);
  };

  const handleMouseDown = (handle: 'xms' | 'xmx') => (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleTouchStart = (handle: 'xms' | 'xmx') => (_e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(handle);
  };

  const updateValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !isDragging) return;

      const rect = trackRef.current.getBoundingClientRect();
      const position = (clientX - rect.left) / rect.width;
      const newValue = Math.round(min + position * (max - min));
      const clampedValue = Math.max(min, Math.min(max, newValue));

      if (isDragging === 'xms') {
        const newXms = Math.min(clampedValue, xmx - 1);
        onChange(newXms, xmx);
      } else {
        const newXmx = Math.max(clampedValue, xms + 1);
        onChange(xms, newXmx);
      }
    },
    [isDragging, min, max, xms, xmx, onChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValueFromPosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        updateValueFromPosition(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updateValueFromPosition]);

  const isWarning = xmx > systemRam * 0.8;
  const isDanger = xmx > systemRam * 0.95;

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Preset buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RAM_PRESETS.map((preset) => {
          const isActive = xms === preset.xms && xmx === preset.xmx;
          return (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset.xms, preset.xmx)}
              className={`p-3 rounded-lg border text-left transition-all active:scale-95 ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30 bg-card'
              }`}
            >
              <div className="font-medium text-sm text-foreground">
                {preset.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {preset.description}
              </div>
              <div className="text-xs text-primary mt-1">
                {preset.xms}-{preset.xmx}GB
              </div>
            </button>
          );
        })}
      </div>

      {/* Visual slider */}
      <div className="relative pt-6 pb-2">
        {/* Track background */}
        <div
          ref={trackRef}
          className="h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (disabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            const newValue = Math.round(min + position * (max - min));
            const clampedValue = Math.max(min, Math.min(max, newValue));
            const midPoint = (xms + xmx) / 2;
            if (clampedValue < midPoint) {
              onChange(Math.min(clampedValue, xmx - 1), xmx);
            } else {
              onChange(xms, Math.max(clampedValue, xms + 1));
            }
          }}
        >
          {/* Filled range */}
          <div
            className={`h-full transition-all ${
              isDanger
                ? 'bg-red-500/50'
                : isWarning
                  ? 'bg-yellow-500/50'
                  : 'bg-primary/30'
            }`}
            style={{
              marginLeft: `${percentage(xms)}%`,
              width: `${percentage(xmx) - percentage(xms)}%`,
            }}
          />
        </div>

        {/* Xms handle (minimum memory) */}
        <div
          className="absolute top-4 w-5 h-5 bg-primary rounded-full border-2 border-card shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none"
          style={{ left: `calc(${percentage(xms)}% - 10px)` }}
          onMouseDown={handleMouseDown('xms')}
          onTouchStart={handleTouchStart('xms')}
          role="slider"
          aria-label="Initial heap size (Xms)"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={xms}
          title={`Initial: ${xms}GB`}
        />

        {/* Xmx handle (maximum memory) */}
        <div
          className={`absolute top-4 w-5 h-5 rounded-full border-2 border-card shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ left: `calc(${percentage(xmx)}% - 10px)` }}
          onMouseDown={handleMouseDown('xmx')}
          onTouchStart={handleTouchStart('xmx')}
          role="slider"
          aria-label="Maximum heap size (Xmx)"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={xmx}
          title={`Maximum: ${xmx}GB`}
        />

        {/* Labels */}
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>{min}GB</span>
          <span
            className={`font-medium ${
              isDanger ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-primary'
            }`}
          >
            Xms: {xms}GB
          </span>
          <span
            className={`font-medium ${
              isDanger ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-primary'
            }`}
          >
            Xmx: {xmx}GB
          </span>
          <span>{max}GB</span>
        </div>
      </div>

      {/* Warning message */}
      {isWarning && (
        <div
          className={`flex items-start gap-2 p-3 border rounded-lg ${
            isDanger
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isDanger ? 'text-red-500' : 'text-yellow-500'
            }`}
          />
          <p
            className={`text-xs ${
              isDanger ? 'text-red-400' : 'text-yellow-600'
            }`}
          >
            Allocating {xmx}GB may cause system instability. System has{' '}
            {systemRam}GB total.
            {isDanger && ' Consider reducing allocation.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default RamSlider;
