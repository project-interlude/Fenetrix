import React, { useState } from "react";
import TransportControls from "@/components/ui/transport-controls";
import KickTypeSelector from "@/components/ui/kick-type-selector";
import LayerControls from "@/components/ui/layer-controls";
import WaveformDisplay from "@/components/ui/waveform-display";
import AudioMeters from "@/components/ui/audio-meters";
import { NavMenu } from "@/components/ui/nav-menu";
import { KickGenerator, useKickGenerator } from "@/components/audio/KickGenerator";
import { PresetsProvider, UIProvider } from "@/lib/context";

const ABComparison: React.FC = () => {
  const { activeComparison, setActiveComparison, comparisonPresets } = useKickGenerator();

  return (
    <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 border border-[#222]">
      <button
        className={`px-4 py-1 font-mono text-xs font-bold tracking-widest transition-colors ${
          activeComparison === "A" ? "bg-[#ff3300] text-black" : "text-[#555] hover:text-white"
        }`}
        onClick={() => setActiveComparison("A")}
      >
        [A]
      </button>
      <button
        className={`px-4 py-1 font-mono text-xs font-bold tracking-widest transition-colors ${
          activeComparison === "B" ? "bg-[#ff3300] text-black" : "text-[#555] hover:text-white"
        } ${!comparisonPresets.B ? "opacity-20 cursor-not-allowed" : ""}`}
        onClick={() => setActiveComparison("B")}
        disabled={!comparisonPresets.B}
      >
        [B]
      </button>
    </div>
  );
};

const KickGeneratorApp: React.FC = () => {
  const [waveformData, setWaveformData] = useState<Float32Array | undefined>();
  const [fftData, setFftData] = useState<Float32Array | undefined>();

  const handleVisualizationUpdate = (
    waveform: Float32Array,
    fft: Float32Array,
    rmsDb: number,
    peakDb: number,
  ) => {
    setWaveformData(waveform);
    setFftData(fft);
  };

  return (
    <PresetsProvider>
      <UIProvider>
        <KickGenerator onVisualizationUpdate={handleVisualizationUpdate}>
          <div className="min-h-screen bg-[#050505] flex flex-col items-center p-4 sm:p-8 font-sans">
            
            <div className="w-full max-w-[1400px] mb-6 flex justify-between items-center px-2">
               <NavMenu />
            </div>

            {/* Hardware Chassis */}
            <div className="w-full max-w-[1400px] hardware-panel flex flex-col">
              
              {/* Chassis Header */}
              <div className="bg-[#0a0a0a] border-b border-[#222] p-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6 relative">
                {/* Faux Screws */}
                <div className="absolute top-2 left-2 text-[#222] text-[10px] font-mono">+</div>
                <div className="absolute top-2 right-2 text-[#222] text-[10px] font-mono">+</div>
                
                <div className="flex items-center gap-6">
                  <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
                    Fenetrix
                  </h1>
                  <div className="h-8 w-px bg-[#222] hidden md:block"></div>
                  <span className="font-mono text-xs tracking-[0.3em] text-[#ff3300]">
                    KICK SYNTHESIZER
                  </span>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[9px] font-mono text-[#555] uppercase tracking-[0.2em]">Compare</span>
                    <ABComparison />
                  </div>
                  <TransportControls />
                </div>
              </div>

              {/* Chassis Body */}
              <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 bg-[#0f0f0f]">
                
                {/* Left Column (Controls) */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                  {/* Algorithm Module */}
                  <div className="hardware-module">
                    <span className="module-title">I. Algorithm Selection</span>
                    <KickTypeSelector />
                  </div>

                  {/* Sound Design Module */}
                  <div className="hardware-module flex-1">
                    <span className="module-title">II. Core Parameters</span>
                    <LayerControls />
                  </div>
                </div>

                {/* Right Column (Visuals & Output) */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                  {/* Oscilloscope */}
                  <div className="hardware-module">
                    <span className="module-title">III. Oscilloscope</span>
                    <div className="bg-[#050505] border border-[#222] p-2 h-48 relative">
                      <WaveformDisplay waveformData={waveformData} fftData={undefined} />
                      <div className="absolute top-2 right-2 font-mono text-[9px] text-[#ff3300] tracking-widest">WAV</div>
                    </div>
                  </div>

                  {/* Spectrum Analyzer */}
                  <div className="hardware-module">
                    <span className="module-title">IV. Spectrum</span>
                    <div className="bg-[#050505] border border-[#222] p-2 h-48 relative">
                      <WaveformDisplay waveformData={undefined} fftData={fftData} />
                      <div className="absolute top-2 right-2 font-mono text-[9px] text-[#ff3300] tracking-widest">FFT</div>
                    </div>
                  </div>

                  {/* Output Stage */}
                  <div className="hardware-module flex-1">
                    <span className="module-title">V. Output Stage</span>
                    <div className="h-full min-h-[150px] flex items-center justify-center pt-4">
                      <AudioMeters />
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Footer / Branding */}
              <div className="bg-[#050505] border-t border-[#222] px-6 py-3 flex justify-between items-center font-mono text-[10px] text-[#444] uppercase tracking-[0.3em]">
                <span>SEQ. 001 // SYSTEM ACTIVE</span>
                <span className="text-white/40">PROJECT INTERLUDE</span>
              </div>
            </div>

          </div>
        </KickGenerator>
      </UIProvider>
    </PresetsProvider>
  );
};

export default KickGeneratorApp;