import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Download,
  Plus,
  ChevronDown, 
  Save
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKickGenerator } from '@/components/audio/KickGenerator';
import { KeyOption } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUI } from '@/lib/context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const TransportControls: React.FC = () => {
  const { 
    togglePlayback, 
    stopPlayback, 
    downloadWav, 
    playbackState, 
    setKey, 
    availableKeys, 
    currentPreset,
    loadPreset,
    createNewPreset,
    availablePresets,
    savePreset
  } = useKickGenerator();
  
  const { 
    isPresetMenuOpen, 
    setPresetMenuOpen,
    isSaveModalOpen,
    setSaveModalOpen,
    newPresetName,
    setNewPresetName
  } = useUI();

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName);
      setSaveModalOpen(false);
      setNewPresetName("");
    }
  };
  
  const handleKeyChange = (value: string) => {
    const key = availableKeys.find(k => k.value === value);
    if (key) {
      setKey(key);
    }
  };
  
  return (
    <div className="bg-background-surface1 rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-display font-semibold text-white">Playback</h2>
        <div className="flex items-center">
          <div className="mr-4 flex items-center">
            <span className="text-sm text-gray-400 mr-2">Key</span>
            <Select value={currentPreset.key} onValueChange={handleKeyChange}>
              <SelectTrigger className="bg-background-surface2 border border-gray-700 text-white rounded-md px-2 py-1 text-sm w-20">
                <SelectValue placeholder="Select key" />
              </SelectTrigger>
              <SelectContent>
                {availableKeys.map((key) => (
                  <SelectItem key={key.value} value={key.value}>
                    {key.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">BPM</span>
            <Input 
              type="number" 
              value={playbackState.bpm} 
              min={60} 
              max={200} 
              className="bg-background-surface2 border border-gray-700 text-white w-16 rounded-md px-2 py-1 text-sm" 
              onChange={(e) => {
                // In a real implementation, this would update the BPM
                // and potentially sync playback to the tempo
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={`flex-shrink-0 w-16 h-16 ${playbackState.isPlaying ? 'bg-primary-light' : 'bg-primary'} hover:bg-primary-light text-white rounded-full`}
          onClick={togglePlayback}
        >
          <Play size={32} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-12 h-12 bg-background-surface2 hover:bg-background-surface1 text-white rounded-full"
          onClick={stopPlayback}
        >
          <Square size={24} />
        </Button>
        
        <div className="flex-grow flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">00:00</span>
            <span className="text-xs text-gray-400">00:01</span>
          </div>
          <div className="w-full h-2 bg-background-surface2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary rounded-full" 
              style={{ width: `${playbackState.progress}%` }}
            ></div>
          </div>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          className="flex-shrink-0 px-4 py-2 bg-secondary hover:bg-secondary-light text-black rounded-md flex items-center text-sm font-medium"
          onClick={downloadWav}
        >
          <Download className="h-4 w-4 mr-1" />
          Download WAV
        </Button>
      </div>
      
      <div className="flex space-x-3 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="px-4 py-2 bg-background-surface2 hover:bg-background-surface1 rounded-md flex items-center text-sm"
          onClick={createNewPreset}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
        
        <DropdownMenu open={isPresetMenuOpen} onOpenChange={setPresetMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="px-4 py-2 bg-background-surface2 hover:bg-background-surface1 rounded-md flex items-center text-sm"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Presets
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availablePresets.map((preset) => (
              <DropdownMenuItem 
                key={preset.id} 
                onClick={() => {
                  loadPreset(preset);
                  setPresetMenuOpen(false);
                }}
              >
                {preset.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Dialog open={isSaveModalOpen} onOpenChange={setSaveModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="px-4 py-2 bg-primary hover:bg-primary-light rounded-md flex items-center text-sm"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Preset</DialogTitle>
              <DialogDescription>
                Give your preset a name to save it for later use.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={`${currentPreset.type.charAt(0).toUpperCase() + currentPreset.type.slice(1)} Kick`}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TransportControls;
