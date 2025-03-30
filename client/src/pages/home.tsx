import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import TransportControls from "@/components/ui/transport-controls";
import KickTypeSelector from "@/components/ui/kick-type-selector";
import LayerControls from "@/components/ui/layer-controls";
import WaveformDisplay from "@/components/ui/waveform-display";
import AudioMeters from "@/components/ui/audio-meters";
import { NavMenu } from "@/components/ui/nav-menu";
import {
  KickGenerator,
  useKickGenerator,
} from "@/components/audio/KickGenerator";
import { PresetsProvider, UIProvider } from "@/lib/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ABComparison: React.FC = () => {
  const { activeComparison, setActiveComparison, comparisonPresets } =
    useKickGenerator();

  return (
    <div className="box-brutalist border-glow">
      <h2 className="text-3xl font-black mb-6 text-neon-blue uppercase">
        A/B COMPARISON
      </h2>

      <div className="flex gap-4">
        <Button
          variant={activeComparison === "A" ? "default" : "secondary"}
          className={`flex-1 py-4 text-xl ${activeComparison === "A" ? "bg-[#00ff41] text-black border-[#00ff41]" : "bg-black hover:bg-gray-900 text-[#00ff41] border-[#00ff41]"} font-black uppercase tracking-widest`}
          onClick={() => setActiveComparison("A")}
        >
          A (CURRENT)
        </Button>

        <Button
          variant={activeComparison === "B" ? "default" : "secondary"}
          className={`flex-1 py-4 text-xl ${activeComparison === "B" ? "bg-[#ff00ff] text-black border-[#ff00ff]" : "bg-black hover:bg-gray-900 text-[#ff00ff] border-[#ff00ff]"} font-black uppercase tracking-widest`}
          onClick={() => setActiveComparison("B")}
          disabled={!comparisonPresets.B}
        >
          B (PREVIOUS)
        </Button>
      </div>

      <div className="mt-6 text-lg font-mono text-white opacity-70">
        COMPARE KICK VARIANTS WITH A/B TESTING SYSTEM
      </div>
    </div>
  );
};

const KickGeneratorApp: React.FC = () => {
  // Visualization data state
  const [waveformData, setWaveformData] = useState<Float32Array | undefined>();
  const [fftData, setFftData] = useState<Float32Array | undefined>();
  const [rms, setRMS] = useState(0);
  const [peak, setPeak] = useState(0);

  // Handle visualization updates from audio engine
  const handleVisualizationUpdate = (
    waveform: Float32Array,
    fft: Float32Array,
    rmsDb: number,
    peakDb: number,
  ) => {
    setWaveformData(waveform);
    setFftData(fft);
    setRMS(rmsDb);
    setPeak(peakDb);
  };

  return (
    <PresetsProvider>
      <UIProvider>
        <KickGenerator onVisualizationUpdate={handleVisualizationUpdate}>
          <div className="min-h-screen bg-black text-white effect-scanlines">
            <NavMenu />
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <header className="mb-12 text-center effect-flicker">
                <h1 className="text-5xl md:text-6xl font-black mb-4 text-neon-green tracking-wider">
                  HARDSTYLE KICK GENERATOR
                </h1>
                <p className="text-2xl font-mono tracking-wide text-white opacity-80">
                  CREATE EXTREME KICKS // DESTROY SOUND SYSTEMS
                </p>
              </header>

              {/* Main Content Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-full">
                {/* Left Column - Controls */}
                <div className="space-y-8">
                  <div className="box-brutalist border-glow">
                    <h2 className="text-3xl font-black mb-6 text-neon-red uppercase">
                      KICK SETTINGS
                    </h2>
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-4 text-neon-green">
                        KICK TYPE
                      </h3>
                      <KickTypeSelector />
                    </div>
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-4 text-neon-pink">
                        PLAYBACK CONTROLS
                      </h3>
                      <TransportControls />
                    </div>
                  </div>

                  <div className="box-brutalist border-glow">
                    <h2 className="text-3xl font-black mb-6 text-neon-blue uppercase">
                      SOUND DESIGN
                    </h2>
                    <LayerControls />
                  </div>
                </div>

                {/* Right Column - Visualizations */}
                <div className="space-y-8">
                  <div className="box-brutalist border-glow">
                    <h2 className="text-3xl font-black mb-6 text-neon-green uppercase">
                      VISUALIZATION
                    </h2>
                    <Tabs defaultValue="waveform">
                      <TabsList className="w-full mb-6 bg-black border-2 border-[#00ff41] overflow-hidden">
                        <TabsTrigger
                          value="waveform"
                          className="flex-1 text-xl font-black uppercase data-[state=active]:bg-[#00ff41] data-[state=active]:text-black"
                        >
                          WAVEFORM
                        </TabsTrigger>
                        <TabsTrigger
                          value="spectrum"
                          className="flex-1 text-xl font-black uppercase data-[state=active]:bg-[#00ff41] data-[state=active]:text-black"
                        >
                          SPECTRUM
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="waveform" className="h-48">
                        <WaveformDisplay
                          waveformData={waveformData}
                          fftData={undefined}
                        />
                      </TabsContent>
                      <TabsContent value="spectrum" className="h-48">
                        <WaveformDisplay
                          waveformData={undefined}
                          fftData={fftData}
                        />
                      </TabsContent>
                    </Tabs>
                    <div className="mt-6">
                      <AudioMeters />
                    </div>
                  </div>

                  <ABComparison />
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-16 text-lg font-mono text-center effect-flicker">
                <p className="text-neon-green">
                  EXTREME HARDSTYLE KICK GENERATOR V0.2
                </p>
                <p className="text-white opacity-50 mt-2">
                  POWERED BY WUNDERKIND
                </p>
              </footer>
            </div>
          </div>
        </KickGenerator>
      </UIProvider>
    </PresetsProvider>
  );
};

export default KickGeneratorApp;
