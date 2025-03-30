import React, { useEffect, useState, useCallback } from 'react';
import { 
  KickParameters, 
  KickPreset, 
  KickType, 
  KeyOption, 
  AVAILABLE_KEYS, 
  DEFAULT_PRESETS, 
  AudioPlaybackState 
} from '@/lib/types';
import { audioEngine } from './AudioEngine';
import { WavExporter } from './WavExporter';
import { useToast } from '@/hooks/use-toast';

interface KickGeneratorProps {
  onVisualizationUpdate?: (
    waveform: Float32Array, 
    fft: Float32Array, 
    rms: number, 
    peak: number
  ) => void;
  onPresetSave?: (preset: KickPreset) => void;
  onPresetLoad?: (preset: KickPreset) => void;
  children: React.ReactNode;
}

export const KickGeneratorContext = React.createContext<{
  currentPreset: KickPreset;
  updateParameters: (params: Partial<KickParameters>) => void;
  setKickType: (type: KickType) => void;
  setKey: (key: KeyOption) => void;
  savePreset: (name: string) => void;
  loadPreset: (preset: KickPreset) => void;
  createNewPreset: () => void;
  randomizeParameters: () => void;
  availableKeys: KeyOption[];
  availablePresets: KickPreset[];
  playbackState: AudioPlaybackState;
  togglePlayback: () => void;
  stopPlayback: () => void;
  downloadWav: () => void;
  masterVolume: number;
  setMasterVolume: (value: number) => void;
  rmsLevel: number;
  peakLevel: number;
  activeComparison: 'A' | 'B';
  setActiveComparison: (comparison: 'A' | 'B') => void;
  comparisonPresets: {
    A: KickPreset;
    B: KickPreset | null;
  };
}>({
  currentPreset: DEFAULT_PRESETS[0],
  updateParameters: () => {},
  setKickType: () => {},
  setKey: () => {},
  savePreset: () => {},
  loadPreset: () => {},
  createNewPreset: () => {},
  randomizeParameters: () => {},
  availableKeys: AVAILABLE_KEYS,
  availablePresets: DEFAULT_PRESETS,
  playbackState: { isPlaying: false, progress: 0, bpm: 150 },
  togglePlayback: () => {},
  stopPlayback: () => {},
  downloadWav: () => {},
  masterVolume: 0,
  setMasterVolume: () => {},
  rmsLevel: -60,
  peakLevel: -60,
  activeComparison: 'A',
  setActiveComparison: () => {},
  comparisonPresets: {
    A: DEFAULT_PRESETS[0],
    B: null
  }
});

export const KickGenerator: React.FC<KickGeneratorProps> = ({ 
  onVisualizationUpdate,
  onPresetSave,
  onPresetLoad, 
  children 
}) => {
  const { toast } = useToast();
  
  // State for the current kick preset
  const [currentPreset, setCurrentPreset] = useState<KickPreset>(DEFAULT_PRESETS[0]);
  
  // State for audio playback
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    progress: 0,
    bpm: 150
  });
  
  // Audio levels
  const [rmsLevel, setRmsLevel] = useState<number>(-60);
  const [peakLevel, setPeakLevel] = useState<number>(-60);
  
  // Master volume
  const [masterVolume, setMasterVolume] = useState<number>(0); // 0dB
  
  // A/B comparison
  const [activeComparison, setActiveComparison] = useState<'A' | 'B'>('A');
  const [comparisonPresets, setComparisonPresets] = useState<{
    A: KickPreset;
    B: KickPreset | null;
  }>({
    A: DEFAULT_PRESETS[0],
    B: null
  });
  
  // Initialize audio engine
  useEffect(() => {
    const init = async () => {
      const success = await audioEngine.initialize();
      if (!success) {
        toast({
          title: "Audio Engine Error",
          description: "Failed to initialize the audio engine. Please check your browser settings.",
          variant: "destructive"
        });
      }
      
      // Set up visualization callback
      audioEngine.setVisualizationCallback((waveform, fft, rms, peak) => {
        if (onVisualizationUpdate) {
          onVisualizationUpdate(waveform, fft, rms, peak);
        }
        setRmsLevel(rms);
        setPeakLevel(peak);
      });
      
      // Set up progress callback
      audioEngine.setProgressCallback((progress) => {
        setPlaybackState(prev => ({ ...prev, progress }));
        if (progress === 0) {
          setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        }
      });
      
      // Generate initial kick
      updateKick(currentPreset);
    };
    
    init();
    
    // Cleanup on unmount
    return () => {
      audioEngine.dispose();
    };
  }, []);
  
  // Update kick when preset changes
  useEffect(() => {
    updateKick(currentPreset);
  }, [currentPreset]);
  
  // Update master volume
  useEffect(() => {
    audioEngine.setVolume(masterVolume);
  }, [masterVolume]);
  
  // Update kick generation based on parameters
  const updateKick = useCallback(async (preset: KickPreset) => {
    // Find the key frequency
    const key = AVAILABLE_KEYS.find(k => k.value === preset.key) || AVAILABLE_KEYS[24]; // Default to C1
    
    // Generate kick
    await audioEngine.generateKick(preset.parameters, key);
  }, []);
  
  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (!audioEngine.isInitialized()) {
      toast({
        title: "Audio Engine Not Ready",
        description: "Please wait while the audio engine initializes.",
        variant: "destructive"
      });
      return;
    }
    
    if (playbackState.isPlaying) {
      audioEngine.stopPlayback();
      setPlaybackState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
    } else {
      audioEngine.play();
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [playbackState.isPlaying]);
  
  // Stop playback
  const stopPlayback = useCallback(() => {
    if (playbackState.isPlaying) {
      audioEngine.stopPlayback();
      setPlaybackState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
    }
  }, [playbackState.isPlaying]);
  
  // Update parameters
  const updateParameters = useCallback((params: Partial<KickParameters>) => {
    setCurrentPreset(prev => {
      const updated = {
        ...prev,
        parameters: {
          ...prev.parameters,
          ...params
        }
      };
      
      // Update comparison preset if active
      setComparisonPresets(prevComparison => ({
        ...prevComparison,
        [activeComparison]: updated
      }));
      
      return updated;
    });
  }, [activeComparison]);
  
  // Set kick type
  const setKickType = useCallback((type: KickType) => {
    setCurrentPreset(prev => {
      const updated = {
        ...prev,
        type,
        parameters: {
          ...prev.parameters,
          distortion: {
            ...prev.parameters.distortion,
            type
          }
        }
      };
      
      // Update comparison preset if active
      setComparisonPresets(prevComparison => ({
        ...prevComparison,
        [activeComparison]: updated
      }));
      
      return updated;
    });
  }, [activeComparison]);
  
  // Set key
  const setKey = useCallback((key: KeyOption) => {
    setCurrentPreset(prev => {
      const updated = {
        ...prev,
        key: key.value
      };
      
      // Update comparison preset if active
      setComparisonPresets(prevComparison => ({
        ...prevComparison,
        [activeComparison]: updated
      }));
      
      return updated;
    });
  }, [activeComparison]);
  
  // Save preset
  const savePreset = useCallback((name: string) => {
    const presetToSave: KickPreset = {
      ...currentPreset,
      name,
      id: `user-${Date.now()}`
    };
    
    if (onPresetSave) {
      onPresetSave(presetToSave);
    }
    
    toast({
      title: "Preset Saved",
      description: `"${name}" has been saved.`
    });
  }, [currentPreset, onPresetSave]);
  
  // Load preset
  const loadPreset = useCallback((preset: KickPreset) => {
    // Store current preset as B for comparison
    setComparisonPresets(prev => ({
      A: preset,
      B: currentPreset
    }));
    
    setCurrentPreset(preset);
    setActiveComparison('A');
    
    if (onPresetLoad) {
      onPresetLoad(preset);
    }
    
    toast({
      title: "Preset Loaded",
      description: `"${preset.name}" has been loaded.`
    });
  }, [currentPreset, onPresetLoad]);
  
  // Create new preset
  const createNewPreset = useCallback(() => {
    const newPreset: KickPreset = {
      ...DEFAULT_PRESETS.find(p => p.type === currentPreset.type) || DEFAULT_PRESETS[0],
      id: `user-${Date.now()}`
    };
    
    // Store current preset as B for comparison
    setComparisonPresets(prev => ({
      A: newPreset,
      B: currentPreset
    }));
    
    setCurrentPreset(newPreset);
    setActiveComparison('A');
    
    toast({
      title: "New Preset Created",
      description: "Starting with default settings."
    });
  }, [currentPreset]);
  
  // Function to randomize all parameters
  const randomizeParameters = useCallback(() => {
    const kickTypes: KickType[] = ['gated', 'euphoric', 'zaag', 'reverse'];
    const randomType = kickTypes[Math.floor(Math.random() * kickTypes.length)];
    const randomKey = AVAILABLE_KEYS[Math.floor(Math.random() * AVAILABLE_KEYS.length)];
    
    // Create random parameters
    const randomParams: KickParameters = {
      click: {
        enabled: Math.random() > 0.3, // 70% chance of being enabled
        amount: Math.random() * 100,
        tone: Math.random() * 100
      },
      pitch: {
        start: Math.random() * 100,
        time: Math.random() * 100
      },
      adsr: {
        attack: Math.random() * 50,
        decay: 20 + Math.random() * 80,
        sustain: Math.random() * 80,
        release: 20 + Math.random() * 80
      },
      sub: {
        enabled: Math.random() > 0.3, // 70% chance of being enabled
        amount: Math.random() * 100
      },
      distortion: {
        type: randomType,
        amount: 30 + Math.random() * 70, // More likely to have good amount of distortion
        drive: 30 + Math.random() * 70
      },
      eq: {
        low: Math.random() * 12 - 6, // -6 to +6 dB
        mid: Math.random() * 12 - 6,
        high: Math.random() * 12 - 6
      },
      effects: {
        saturation: Math.random() * 100,
        reverb: Math.random() * 100,
        bitcrush: Math.random() * 100
      }
    };
    
    // Set random preset
    const randomPreset: KickPreset = {
      id: undefined,
      name: "Random Kick",
      type: randomType,
      key: randomKey.value,
      parameters: randomParams
    };
    
    // Store current preset as B for comparison
    setComparisonPresets(prev => ({
      A: randomPreset,
      B: currentPreset
    }));
    
    setCurrentPreset(randomPreset);
    setActiveComparison('A');
    
    toast({
      title: "Random Kick Generated",
      description: "Created a random kick preset. If you like it, save it!"
    });
    
    // Optional: Play the random kick
    if (!playbackState.isPlaying) {
      setTimeout(() => {
        audioEngine.play();
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
      }, 200); // Short delay to allow the kick to be generated
    }
    
  }, [currentPreset, playbackState.isPlaying]);
  
  // Download WAV
  const downloadWav = useCallback(() => {
    const audioBuffer = audioEngine.getAudioBuffer();
    if (!audioBuffer) {
      toast({
        title: "Error",
        description: "No audio data available to download.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      WavExporter.downloadWav(
        audioBuffer, 
        `hardstyle-kick-${currentPreset.type}-${currentPreset.key}.wav`,
        { bitDepth: 24 }
      );
      
      toast({
        title: "Download Started",
        description: "Your kick has been downloaded as a WAV file."
      });
    } catch (error) {
      console.error('Error downloading WAV:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the WAV file. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentPreset]);
  
  // Handle A/B comparison
  const handleSetActiveComparison = useCallback((comparison: 'A' | 'B') => {
    if (comparison === 'B' && !comparisonPresets.B) {
      toast({
        title: "No Comparison Available",
        description: "There is no previous preset to compare with.",
        variant: "destructive"
      });
      return;
    }
    
    setActiveComparison(comparison);
    if (comparison === 'A') {
      setCurrentPreset(comparisonPresets.A);
    } else if (comparison === 'B' && comparisonPresets.B) {
      setCurrentPreset(comparisonPresets.B);
    }
  }, [comparisonPresets]);
  
  // Provider value
  const contextValue = {
    currentPreset,
    updateParameters,
    setKickType,
    setKey,
    savePreset,
    loadPreset,
    createNewPreset,
    randomizeParameters,
    availableKeys: AVAILABLE_KEYS,
    availablePresets: DEFAULT_PRESETS,
    playbackState,
    togglePlayback,
    stopPlayback,
    downloadWav,
    masterVolume,
    setMasterVolume,
    rmsLevel,
    peakLevel,
    activeComparison,
    setActiveComparison: handleSetActiveComparison,
    comparisonPresets
  };
  
  return (
    <KickGeneratorContext.Provider value={contextValue}>
      {children}
    </KickGeneratorContext.Provider>
  );
};

// Hook for accessing the KickGenerator context
export const useKickGenerator = () => {
  const context = React.useContext(KickGeneratorContext);
  if (context === undefined) {
    throw new Error('useKickGenerator must be used within a KickGenerator');
  }
  return context;
};
