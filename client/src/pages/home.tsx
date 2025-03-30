import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import TransportControls from '@/components/ui/transport-controls';
import KickTypeSelector from '@/components/ui/kick-type-selector';
import LayerControls from '@/components/ui/layer-controls';
import WaveformDisplay from '@/components/ui/waveform-display';
import AudioMeters from '@/components/ui/audio-meters';
import { KickGenerator, useKickGenerator } from '@/components/audio/KickGenerator';
import { PresetsProvider, UIProvider } from '@/lib/context';

const ABComparison: React.FC = () => {
  const { activeComparison, setActiveComparison, comparisonPresets } = useKickGenerator();
  
  return (
    <div className="bg-background-surface1 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-display font-semibold text-white mb-4">A/B Comparison</h2>
      
      <div className="flex gap-4">
        <Button
          variant={activeComparison === 'A' ? 'default' : 'secondary'}
          className={`flex-1 py-3 ${activeComparison === 'A' ? 'bg-primary text-white' : 'bg-background-surface2 hover:bg-gray-700 text-gray-300'} rounded-md font-medium`}
          onClick={() => setActiveComparison('A')}
        >
          A (Current)
        </Button>
        
        <Button
          variant={activeComparison === 'B' ? 'default' : 'secondary'}
          className={`flex-1 py-3 ${activeComparison === 'B' ? 'bg-primary text-white' : 'bg-background-surface2 hover:bg-gray-700 text-gray-300'} rounded-md font-medium`}
          onClick={() => setActiveComparison('B')}
          disabled={!comparisonPresets.B}
        >
          B (Previous)
        </Button>
      </div>
      
      <div className="mt-4 text-sm text-gray-400 italic">
        Use A/B comparison to quickly compare changes to your kick sound
      </div>
    </div>
  );
};

const KickGeneratorApp: React.FC = () => {
  // Visualization data state
  const [waveformData, setWaveformData] = useState<Float32Array | undefined>();
  const [fftData, setFftData] = useState<Float32Array | undefined>();
  
  // Handle visualization updates from audio engine
  const handleVisualizationUpdate = (
    waveform: Float32Array,
    fft: Float32Array,
    rms: number,
    peak: number
  ) => {
    setWaveformData(waveform);
    setFftData(fft);
  };
  
  return (
    <PresetsProvider>
      <UIProvider>
        <KickGenerator onVisualizationUpdate={handleVisualizationUpdate}>
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Header */}
            <header className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-white flex items-center">
                    <span className="text-primary mr-2">Hardstyle</span> Kick Generator
                    <span className="ml-2 px-2 py-1 text-xs bg-background-surface2 rounded-md text-gray-400 font-mono">v1.0</span>
                  </h1>
                  <p className="text-gray-400 mt-2">Create professional hardstyle kicks with customizable parameters</p>
                </div>
              </div>
            </header>

            {/* Main Content Container */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Controls */}
              <div className="w-full lg:w-7/12 space-y-6">
                <TransportControls />
                <KickTypeSelector />
                <LayerControls />
              </div>

              {/* Right Column - Visualizations */}
              <div className="w-full lg:w-5/12 space-y-6">
                <WaveformDisplay waveformData={waveformData} fftData={fftData} />
                <AudioMeters />
                <ABComparison />
              </div>
            </div>
            
            {/* Footer */}
            <footer className="mt-12 text-sm text-gray-500 text-center">
              <p>Hardstyle Kick Generator v1.0 | Created with Web Audio API</p>
            </footer>
          </div>
        </KickGenerator>
      </UIProvider>
    </PresetsProvider>
  );
};

export default KickGeneratorApp;
