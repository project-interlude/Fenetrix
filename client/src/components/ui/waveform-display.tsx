import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Visualizer from '../audio/Visualizer';
import { useUI } from '@/lib/context';

interface WaveformDisplayProps {
  waveformData?: Float32Array;
  fftData?: Float32Array;
  className?: string;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
  waveformData, 
  fftData,
  className = '' 
}) => {
  const { visualizationType, setVisualizationType } = useUI();

  const handleTabChange = (value: string) => {
    setVisualizationType(value as "waveform" | "spectrum");
  };

  return (
    <div className={`bg-background-surface1 rounded-lg p-4 shadow-lg ${className}`}>
      <Tabs value={visualizationType} onValueChange={handleTabChange}>
        <TabsList className="border-b border-gray-700 w-full rounded-none mb-4">
          <TabsTrigger 
            value="waveform"
            className="px-4 py-2 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Waveform
          </TabsTrigger>
          <TabsTrigger 
            value="spectrum"
            className="px-4 py-2 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Spectrum
          </TabsTrigger>
        </TabsList>

        <div className="waveform-container mb-4">
          <TabsContent value="waveform" className="mt-0">
            <Visualizer
              waveformData={waveformData}
              type="waveform"
              className="w-full h-[160px]"
            />
          </TabsContent>

          <TabsContent value="spectrum" className="mt-0">
            <Visualizer
              fftData={fftData}
              type="spectrum"
              className="w-full h-[160px]"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default WaveformDisplay;