import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AudioSlider from '@/components/ui/audio-slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useKickGenerator } from '@/components/audio/KickGenerator';
import { useUI } from '@/lib/context';

export const LayerControls: React.FC = () => {
  const { currentPreset, updateParameters } = useKickGenerator();
  const { activeTab, setActiveTab } = useUI();
  const { parameters } = currentPreset;
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as "punch" | "crunch" | "eq");
  };
  
  return (
    <div className="bg-background-surface1 rounded-lg shadow-lg">
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full border-b border-gray-700 rounded-none">
          <TabsTrigger 
            value="punch" 
            className="flex-1 px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-white"
          >
            Punch Layer
          </TabsTrigger>
          <TabsTrigger 
            value="crunch" 
            className="flex-1 px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-white"
          >
            Crunch Layer
          </TabsTrigger>
          <TabsTrigger 
            value="eq" 
            className="flex-1 px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-white"
          >
            EQ & Effects
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="punch" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Click Controls */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display font-medium">Click/Transient</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="click-enable" 
                    checked={parameters.click.enabled} 
                    onCheckedChange={(checked) => updateParameters({ 
                      click: { ...parameters.click, enabled: checked } 
                    })}
                  />
                  <Label htmlFor="click-enable" className="sr-only">Enable Click</Label>
                </div>
              </div>
              
              <div className="space-y-4">
                <AudioSlider
                  label="Amount"
                  min={0}
                  max={100}
                  value={parameters.click.amount}
                  onChange={(value) => updateParameters({
                    click: { ...parameters.click, amount: value }
                  })}
                  unit="%"
                  disabled={!parameters.click.enabled}
                />
                
                <AudioSlider
                  label="Tone"
                  min={0}
                  max={100}
                  value={parameters.click.tone}
                  onChange={(value) => updateParameters({
                    click: { ...parameters.click, tone: value }
                  })}
                  unit="%"
                  disabled={!parameters.click.enabled}
                />
              </div>
            </div>
            
            {/* Pitch Envelope */}
            <div>
              <h3 className="font-display font-medium mb-2">Pitch Envelope</h3>
              <div className="space-y-4">
                <AudioSlider
                  label="Start"
                  min={0}
                  max={100}
                  value={parameters.pitch.start}
                  onChange={(value) => updateParameters({
                    pitch: { ...parameters.pitch, start: value }
                  })}
                  unit="st"
                />
                
                <AudioSlider
                  label="Time"
                  min={1}
                  max={100}
                  value={parameters.pitch.time}
                  onChange={(value) => updateParameters({
                    pitch: { ...parameters.pitch, time: value }
                  })}
                  unit="ms"
                />
              </div>
            </div>
            
            {/* ADSR Section */}
            <div className="md:col-span-2">
              <h3 className="font-display font-medium mb-2">ADSR</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AudioSlider
                  label="Attack"
                  min={0}
                  max={100}
                  value={parameters.adsr.attack}
                  onChange={(value) => updateParameters({
                    adsr: { ...parameters.adsr, attack: value }
                  })}
                  unit="ms"
                />
                
                <AudioSlider
                  label="Decay"
                  min={0}
                  max={500}
                  value={parameters.adsr.decay}
                  onChange={(value) => updateParameters({
                    adsr: { ...parameters.adsr, decay: value }
                  })}
                  unit="ms"
                />
                
                <AudioSlider
                  label="Sustain"
                  min={0}
                  max={100}
                  value={parameters.adsr.sustain}
                  onChange={(value) => updateParameters({
                    adsr: { ...parameters.adsr, sustain: value }
                  })}
                  unit="%"
                />
                
                <AudioSlider
                  label="Release"
                  min={0}
                  max={1000}
                  value={parameters.adsr.release}
                  onChange={(value) => updateParameters({
                    adsr: { ...parameters.adsr, release: value }
                  })}
                  unit="ms"
                />
              </div>
            </div>
            
            {/* Sub-bass Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display font-medium">Sub-bass</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sub-enable" 
                    checked={parameters.sub.enabled} 
                    onCheckedChange={(checked) => updateParameters({ 
                      sub: { ...parameters.sub, enabled: checked } 
                    })}
                  />
                  <Label htmlFor="sub-enable" className="sr-only">Enable Sub-bass</Label>
                </div>
              </div>
              
              <AudioSlider
                label="Amount"
                min={0}
                max={100}
                value={parameters.sub.amount}
                onChange={(value) => updateParameters({
                  sub: { ...parameters.sub, amount: value }
                })}
                unit="%"
                disabled={!parameters.sub.enabled}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="crunch" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distortion Controls */}
            <div className="md:col-span-2">
              <h3 className="font-display font-medium mb-2">Distortion</h3>
              <div className="grid grid-cols-2 gap-4">
                <AudioSlider
                  label="Amount"
                  min={0}
                  max={100}
                  value={parameters.distortion.amount}
                  onChange={(value) => updateParameters({
                    distortion: { ...parameters.distortion, amount: value }
                  })}
                  unit="%"
                />
                
                <AudioSlider
                  label="Drive"
                  min={0}
                  max={100}
                  value={parameters.distortion.drive}
                  onChange={(value) => updateParameters({
                    distortion: { ...parameters.distortion, drive: value }
                  })}
                  unit="%"
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="eq" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EQ Controls */}
            <div className="md:col-span-2">
              <h3 className="font-display font-medium mb-2">EQ</h3>
              <div className="grid grid-cols-3 gap-4">
                <AudioSlider
                  label="Low"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={parameters.eq.low}
                  onChange={(value) => updateParameters({
                    eq: { ...parameters.eq, low: value }
                  })}
                  unit="dB"
                />
                
                <AudioSlider
                  label="Mid"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={parameters.eq.mid}
                  onChange={(value) => updateParameters({
                    eq: { ...parameters.eq, mid: value }
                  })}
                  unit="dB"
                />
                
                <AudioSlider
                  label="High"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={parameters.eq.high}
                  onChange={(value) => updateParameters({
                    eq: { ...parameters.eq, high: value }
                  })}
                  unit="dB"
                />
              </div>
            </div>
            
            {/* Effects Controls */}
            <div className="md:col-span-2">
              <h3 className="font-display font-medium mb-2">Effects</h3>
              <div className="grid grid-cols-3 gap-4">
                <AudioSlider
                  label="Saturation"
                  min={0}
                  max={100}
                  value={parameters.effects.saturation}
                  onChange={(value) => updateParameters({
                    effects: { ...parameters.effects, saturation: value }
                  })}
                  unit="%"
                />
                
                <AudioSlider
                  label="Reverb"
                  min={0}
                  max={100}
                  value={parameters.effects.reverb}
                  onChange={(value) => updateParameters({
                    effects: { ...parameters.effects, reverb: value }
                  })}
                  unit="%"
                />
                
                <AudioSlider
                  label="Bitcrush"
                  min={0}
                  max={10}
                  step={0.1}
                  value={parameters.effects.bitcrush}
                  onChange={(value) => updateParameters({
                    effects: { ...parameters.effects, bitcrush: value }
                  })}
                  unit="bit"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayerControls;
