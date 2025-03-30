import React from 'react';
import { Slider } from '@/components/ui/slider';

interface AudioSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export const AudioSlider: React.FC<AudioSliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  disabled = false,
  className = '',
}) => {
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-400">{label}</label>
        <div className="flex items-center">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-12 bg-background-surface2 text-center text-white text-xs rounded py-1 px-2"
            disabled={disabled}
          />
          {unit && <span className="text-xs text-gray-400 ml-1">{unit}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
        disabled={disabled}
        className="w-full h-4"
      />
    </div>
  );
};

export default AudioSlider;
