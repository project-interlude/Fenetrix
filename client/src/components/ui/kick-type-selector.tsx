import React from 'react';
import { useKickGenerator } from '@/components/audio/KickGenerator';
import { KickType } from '@/lib/types';

interface KickTypeOption {
  type: KickType;
  label: string;
  description: string;
}

const kickTypes: KickTypeOption[] = [
  {
    type: 'gated',
    label: 'Gated Rawstyle',
    description: 'Aggressive, rhythmic distortion'
  },
  {
    type: 'euphoric',
    label: 'Euphoric',
    description: 'Warm with smooth tail'
  },
  {
    type: 'zaag',
    label: 'Zaag',
    description: 'Overdriven, saw-like tail'
  },
  {
    type: 'reverse',
    label: 'Reverse Bass',
    description: 'Fast decay, sub-heavy'
  }
];

export const KickTypeSelector: React.FC = () => {
  const { currentPreset, setKickType } = useKickGenerator();
  
  return (
    <div className="bg-background-surface1 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-display font-semibold text-white mb-4">Kick Type</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kickTypes.map((kickType) => (
          <div
            key={kickType.type}
            className={`
              ${currentPreset.type === kickType.type 
                ? 'bg-primary bg-opacity-10 border-2 border-primary' 
                : 'bg-background-surface2 border-2 border-transparent hover:border-gray-700'
              } 
              rounded-lg p-3 cursor-pointer transition-colors duration-200
            `}
            onClick={() => setKickType(kickType.type)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-medium">{kickType.label}</h3>
              {currentPreset.type === kickType.type && (
                <div className="h-3 w-3 bg-primary rounded-full"></div>
              )}
            </div>
            <p className="text-xs text-gray-400">{kickType.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KickTypeSelector;
