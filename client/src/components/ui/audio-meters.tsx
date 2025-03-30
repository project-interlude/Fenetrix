import React from 'react';
import AudioSlider from './audio-slider';
import { useKickGenerator } from '../audio/KickGenerator';

export const AudioMeters: React.FC = () => {
  const { rmsLevel, peakLevel, masterVolume, setMasterVolume } = useKickGenerator();
  
  // Convert RMS and peak levels to height percentages for display (dB to percentage)
  // Typical range: -60dB to 0dB mapped to 0-100%
  const rmsHeight = Math.max(0, Math.min(100, (rmsLevel + 60) / 60 * 100));
  const peakHeight = Math.max(0, Math.min(100, (peakLevel + 60) / 60 * 100));
  
  // Format dB values for display with one decimal place
  const rmsDb = rmsLevel > -60 ? rmsLevel.toFixed(1) : "-∞";
  const peakDb = peakLevel > -60 ? peakLevel.toFixed(1) : "-∞";
  
  return (
    <div className="bg-background-surface1 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-display font-semibold text-white mb-4">Output</h2>
      
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Peak Level</span>
            <span className="text-sm font-mono">{peakDb} dB</span>
          </div>
          
          <div className="h-32 bg-background-surface2 rounded-md relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary to-secondary-light opacity-80 transition-all"
              style={{ height: `${peakHeight}%` }}
            ></div>
            
            {/* Meter markings */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">0dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-6dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-12dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-24dB</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">RMS Level</span>
            <span className="text-sm font-mono">{rmsDb} dB</span>
          </div>
          
          <div className="h-32 bg-background-surface2 rounded-md relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary-light opacity-80 transition-all"
              style={{ height: `${rmsHeight}%` }}
            ></div>
            
            {/* Meter markings */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">0dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-6dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-12dB</span>
              </div>
              <div className="border-t border-gray-600 h-0 relative">
                <span className="absolute -top-1 right-1 text-xs text-gray-500">-24dB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <AudioSlider
          label="Master Volume"
          min={-24}
          max={6}
          step={0.1}
          value={masterVolume}
          onChange={setMasterVolume}
          unit="dB"
        />
      </div>
    </div>
  );
};

export default AudioMeters;
