// Types for the kick generator

export type KickType = "gated" | "euphoric" | "zaag" | "reverse";

export interface KickParameters {
  // Punch Layer
  click: {
    enabled: boolean;
    amount: number;
    tone: number;
  };
  pitch: {
    start: number;
    time: number;
  };
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  sub: {
    enabled: boolean;
    amount: number;
  };
  // Crunch Layer
  distortion: {
    type: KickType;
    amount: number;
    drive: number;
  };
  // EQ & Effects
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  effects: {
    saturation: number;
    reverb: number;
    bitcrush: number;
  };
}

export interface KickPreset {
  id?: string;
  name: string;
  type: KickType;
  key: string;
  parameters: KickParameters;
}

export interface AudioVisualizationData {
  waveform: Float32Array;
  fftData: Float32Array;
  rms: number;
  peak: number;
}

export interface ActiveLayer {
  layer: "punch" | "crunch" | "eq";
  index: number;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  progress: number;
  bpm: number;
}

export interface KeyOption {
  value: string;
  label: string;
  frequency: number;
}

// Available keys from C0 to C5
export const AVAILABLE_KEYS: KeyOption[] = [
  { value: "C0", label: "C0", frequency: 16.35 },
  { value: "C#0", label: "C#0", frequency: 17.32 },
  { value: "D0", label: "D0", frequency: 18.35 },
  { value: "D#0", label: "D#0", frequency: 19.45 },
  { value: "E0", label: "E0", frequency: 20.60 },
  { value: "F0", label: "F0", frequency: 21.83 },
  { value: "F#0", label: "F#0", frequency: 23.12 },
  { value: "G0", label: "G0", frequency: 24.50 },
  { value: "G#0", label: "G#0", frequency: 25.96 },
  { value: "A0", label: "A0", frequency: 27.50 },
  { value: "A#0", label: "A#0", frequency: 29.14 },
  { value: "B0", label: "B0", frequency: 30.87 },
  
  { value: "C1", label: "C1", frequency: 32.70 },
  { value: "C#1", label: "C#1", frequency: 34.65 },
  { value: "D1", label: "D1", frequency: 36.71 },
  { value: "D#1", label: "D#1", frequency: 38.89 },
  { value: "E1", label: "E1", frequency: 41.20 },
  { value: "F1", label: "F1", frequency: 43.65 },
  { value: "F#1", label: "F#1", frequency: 46.25 },
  { value: "G1", label: "G1", frequency: 49.00 },
  { value: "G#1", label: "G#1", frequency: 51.91 },
  { value: "A1", label: "A1", frequency: 55.00 },
  { value: "A#1", label: "A#1", frequency: 58.27 },
  { value: "B1", label: "B1", frequency: 61.74 },
  
  { value: "C2", label: "C2", frequency: 65.41 },
  { value: "C#2", label: "C#2", frequency: 69.30 },
  { value: "D2", label: "D2", frequency: 73.42 },
  { value: "D#2", label: "D#2", frequency: 77.78 },
  { value: "E2", label: "E2", frequency: 82.41 },
  { value: "F2", label: "F2", frequency: 87.31 },
  { value: "F#2", label: "F#2", frequency: 92.50 },
  { value: "G2", label: "G2", frequency: 98.00 },
  { value: "G#2", label: "G#2", frequency: 103.83 },
  { value: "A2", label: "A2", frequency: 110.00 },
  { value: "A#2", label: "A#2", frequency: 116.54 },
  { value: "B2", label: "B2", frequency: 123.47 },
  
  { value: "C3", label: "C3", frequency: 130.81 },
  { value: "C#3", label: "C#3", frequency: 138.59 },
  { value: "D3", label: "D3", frequency: 146.83 },
  { value: "D#3", label: "D#3", frequency: 155.56 },
  { value: "E3", label: "E3", frequency: 164.81 },
  { value: "F3", label: "F3", frequency: 174.61 },
  { value: "F#3", label: "F#3", frequency: 185.00 },
  { value: "G3", label: "G3", frequency: 196.00 },
  { value: "G#3", label: "G#3", frequency: 207.65 },
  { value: "A3", label: "A3", frequency: 220.00 },
  { value: "A#3", label: "A#3", frequency: 233.08 },
  { value: "B3", label: "B3", frequency: 246.94 },
  
  { value: "C4", label: "C4", frequency: 261.63 },
  { value: "C#4", label: "C#4", frequency: 277.18 },
  { value: "D4", label: "D4", frequency: 293.66 },
  { value: "D#4", label: "D#4", frequency: 311.13 },
  { value: "E4", label: "E4", frequency: 329.63 },
  { value: "F4", label: "F4", frequency: 349.23 },
  { value: "F#4", label: "F#4", frequency: 369.99 },
  { value: "G4", label: "G4", frequency: 392.00 },
  { value: "G#4", label: "G#4", frequency: 415.30 },
  { value: "A4", label: "A4", frequency: 440.00 },
  { value: "A#4", label: "A#4", frequency: 466.16 },
  { value: "B4", label: "B4", frequency: 493.88 },
  
  { value: "C5", label: "C5", frequency: 523.25 }
];

// Default kick presets
export const DEFAULT_PRESETS: KickPreset[] = [
  {
    id: "default-gated",
    name: "Gated Rawstyle",
    type: "gated",
    key: "E1",
    parameters: {
      click: { enabled: true, amount: 75, tone: 40 },
      pitch: { start: 60, time: 30 },
      adsr: { attack: 5, decay: 20, sustain: 50, release: 200 },
      sub: { enabled: true, amount: 60 },
      distortion: { type: "gated", amount: 80, drive: 70 },
      eq: { low: 0, mid: -3, high: 3 },
      effects: { saturation: 60, reverb: 10, bitcrush: 0 }
    }
  },
  {
    id: "default-euphoric",
    name: "Euphoric",
    type: "euphoric",
    key: "E1",
    parameters: {
      click: { enabled: true, amount: 60, tone: 30 },
      pitch: { start: 50, time: 40 },
      adsr: { attack: 2, decay: 40, sustain: 40, release: 300 },
      sub: { enabled: true, amount: 70 },
      distortion: { type: "euphoric", amount: 60, drive: 50 },
      eq: { low: 2, mid: -2, high: 1 },
      effects: { saturation: 40, reverb: 20, bitcrush: 0 }
    }
  },
  {
    id: "default-zaag",
    name: "Zaag",
    type: "zaag",
    key: "E1",
    parameters: {
      click: { enabled: true, amount: 65, tone: 50 },
      pitch: { start: 70, time: 25 },
      adsr: { attack: 1, decay: 15, sustain: 60, release: 250 },
      sub: { enabled: true, amount: 65 },
      distortion: { type: "zaag", amount: 85, drive: 80 },
      eq: { low: -1, mid: 0, high: 5 },
      effects: { saturation: 70, reverb: 5, bitcrush: 2 }
    }
  },
  {
    id: "default-reverse",
    name: "Reverse Bass",
    type: "reverse",
    key: "E1",
    parameters: {
      click: { enabled: true, amount: 50, tone: 35 },
      pitch: { start: 40, time: 60 },
      adsr: { attack: 10, decay: 50, sustain: 30, release: 150 },
      sub: { enabled: true, amount: 80 },
      distortion: { type: "reverse", amount: 50, drive: 40 },
      eq: { low: 4, mid: -4, high: 0 },
      effects: { saturation: 30, reverb: 15, bitcrush: 0 }
    }
  }
];
