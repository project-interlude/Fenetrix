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
  color?: 'green' | 'red' | 'blue' | 'pink';
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
  color = 'green'
}) => {
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  // Get neon color based on the color prop
  const getNeonColor = () => {
    switch (color) {
      case 'red': return '#ff0000';
      case 'blue': return '#00ffff';
      case 'pink': return '#ff00ff';
      default: return '#00ff41';
    }
  };
  
  const neonColor = getNeonColor();
  const textShadow = `0 0 5px ${neonColor}, 0 0 10px ${neonColor}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-base font-mono uppercase tracking-wider font-bold" style={{ color: neonColor, textShadow }}>
          {label}
        </label>
        <div className="flex items-center">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 bg-black text-center font-mono border-2 font-bold text-base py-1 px-2"
            style={{ color: neonColor, borderColor: neonColor, boxShadow: `0 0 5px ${neonColor}` }}
            disabled={disabled}
          />
          {unit && <span className="text-base font-mono ml-1" style={{ color: neonColor }}>{unit}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
        disabled={disabled}
        className="slider-neon w-full h-6"
      />
    </div>
  );
};

export default AudioSlider;
