import React from 'react';
import { useKickGenerator } from '@/components/audio/KickGenerator';
import { KickType } from '@/lib/types';

// Visual mapping for the UI so we don't break the audio engine's expected types
const KICK_TYPES: { id: KickType; label: string; desc: string }[] = [
  { id: 'gated', label: 'TYPE A', desc: 'Aggressive / Hard' },
  { id: 'euphoric', label: 'TYPE B', desc: 'Melodic / Clean' },
  { id: 'zaag', label: 'TYPE C', desc: 'Overdriven / Raw' },
  { id: 'reverse', label: 'TYPE D', desc: 'Sucking / Swell' },
];

export default function KickTypeSelector() {
  const { currentPreset, setKickType } = useKickGenerator();

  return (
    <div className="grid grid-cols-2 gap-3">
      {KICK_TYPES.map((type) => (
        <button
          key={type.id}
          onClick={() => setKickType(type.id)}
          className={`flex flex-col items-start p-4 border transition-all duration-75 ${
            currentPreset.type === type.id
              ? 'bg-[#ff3300] border-[#ff3300] text-black shadow-[0_0_15px_rgba(255,51,0,0.3)]'
              : 'bg-[#0a0a0a] border-[#222] text-[#666] hover:border-[#444] hover:text-[#aaa]'
          }`}
        >
          <span className="font-mono font-bold text-lg tracking-[0.15em]">{type.label}</span>
          <span className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${currentPreset.type === type.id ? 'text-black/70' : 'text-[#444]'}`}>
            {type.desc}
          </span>
        </button>
      ))}
    </div>
  );
}