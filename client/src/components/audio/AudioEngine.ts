import { KickParameters, KickType, KeyOption } from "@/lib/types";

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private kickBuffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private progressCallback: ((progress: number) => void) | null = null;
  private visualizationCallback: ((waveform: Float32Array, fft: Float32Array, rms: number, peak: number) => void) | null = null;
  private sampleRate = 44100;
  private currentParameters: KickParameters | null = null;
  private currentKey: KeyOption | null = null;
  private requestId: number | null = null;
  private fftSize = 2048;
  private waveformData = new Float32Array(1024);
  private fftData = new Float32Array(1024);

  initialize(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;
      
      // Set up nodes
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.fftSize;
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // Connect graph
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      return Promise.resolve(true);
    } catch (error) {
      console.error("Error initializing audio engine:", error);
      return Promise.resolve(false);
    }
  }

  setVisualizationCallback(callback: (waveform: Float32Array, fft: Float32Array, rms: number, peak: number) => void) {
    this.visualizationCallback = callback;
  }
  
  setProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      // Convert dB to linear scale (0dB = 1.0)
      const linearVolume = Math.pow(10, volume / 20);
      this.gainNode.gain.value = linearVolume;
    }
  }

  async generateKick(parameters: KickParameters, key: KeyOption): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }
    
    this.currentParameters = parameters;
    this.currentKey = key;
    
    const durationSec = Math.max(
      0.6, // Minimum duration
      (parameters.adsr.attack + parameters.adsr.decay + parameters.adsr.release) / 1000
    );
    
    this.kickBuffer = await this.createKickBuffer(parameters, key, durationSec);
    
    if (this.isPlaying) {
      this.stopPlayback();
      this.play();
    }
  }

  private async createKickBuffer(parameters: KickParameters, key: KeyOption, durationSec: number): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error("Audio context not initialized");
    
    const numSamples = Math.ceil(durationSec * this.sampleRate);
    const buffer = this.audioContext.createBuffer(2, numSamples, this.sampleRate);
    
    // Get the actual array for each channel
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    
    // Generate the kick sound
    this.generatePunchLayer(leftChannel, rightChannel, parameters, key, durationSec);
    this.generateCrunchLayer(leftChannel, rightChannel, parameters, key, durationSec);
    this.applyEffects(leftChannel, rightChannel, parameters);
    
    return buffer;
  }

  private generatePunchLayer(leftChannel: Float32Array, rightChannel: Float32Array, parameters: KickParameters, key: KeyOption, durationSec: number) {
    const { click, pitch, adsr, sub } = parameters;
    const sampleRate = this.sampleRate;
    const attackSamples = Math.floor(adsr.attack * sampleRate / 1000);
    const decaySamples = Math.floor(adsr.decay * sampleRate / 1000);
    const releaseSamples = Math.floor(adsr.release * sampleRate / 1000);
    const sustainLevel = adsr.sustain / 100;
    const numSamples = leftChannel.length;
    
    // Pitch envelope parameters
    const baseFreq = key.frequency;
    const startFreq = baseFreq * (pitch.start / 10); // Higher start value for more dramatic pitch drop
    const pitchEnvTime = pitch.time / 1000; // Convert to seconds
    const pitchEnvSamples = Math.floor(pitchEnvTime * sampleRate);
    
    // Click oscillator parameters
    const clickAmount = click.enabled ? click.amount / 100 : 0;
    const clickTone = click.tone / 100; // Controls the frequency of the click
    const clickFreq = 1000 + (clickTone * 4000); // 1kHz to 5kHz
    
    // Sub oscillator
    const subAmount = sub.enabled ? sub.amount / 100 : 0;
    
    // Phase accumulation for oscillators
    let phase = 0;
    let subPhase = 0;
    let clickPhase = 0;
    
    for (let i = 0; i < numSamples; i++) {
      // Calculate amplitude envelope
      let amplitude = 0;
      
      if (i < attackSamples) {
        // Attack phase
        amplitude = i / attackSamples;
      } else if (i < attackSamples + decaySamples) {
        // Decay phase
        const decayProgress = (i - attackSamples) / decaySamples;
        amplitude = 1.0 - (1.0 - sustainLevel) * decayProgress;
      } else if (i < numSamples - releaseSamples) {
        // Sustain phase
        amplitude = sustainLevel;
      } else {
        // Release phase
        const releaseProgress = (i - (numSamples - releaseSamples)) / releaseSamples;
        amplitude = sustainLevel * (1.0 - releaseProgress);
      }
      
      // Calculate pitch envelope (frequency at this point in time)
      let frequency = baseFreq;
      if (i < pitchEnvSamples) {
        const pitchProgress = i / pitchEnvSamples;
        frequency = startFreq - (startFreq - baseFreq) * pitchProgress;
      }
      
      // Calculate the phase increment based on frequency
      const phaseIncrement = frequency / sampleRate * 2 * Math.PI;
      phase += phaseIncrement;
      
      // Sub bass (one octave lower)
      const subPhaseIncrement = (frequency / 2) / sampleRate * 2 * Math.PI;
      subPhase += subPhaseIncrement;
      
      // Click sound (higher pitched, decays quickly)
      const clickPhaseIncrement = clickFreq / sampleRate * 2 * Math.PI;
      clickPhase += clickPhaseIncrement;
      
      // Calculate click envelope (decays quickly)
      const clickEnvelope = clickAmount * Math.exp(-i / (sampleRate * 0.01)); // 10ms decay
      
      // Main oscillator (sine wave)
      const sineValue = Math.sin(phase);
      
      // Sub oscillator (sine wave)
      const subValue = Math.sin(subPhase) * subAmount;
      
      // Click oscillator (can be sine or noise)
      const clickValue = Math.sin(clickPhase) * clickEnvelope;
      
      // Mix all components
      const sample = (sineValue * 0.7 + subValue * 0.3) * amplitude + clickValue;
      
      // Apply to both channels
      leftChannel[i] += sample;
      rightChannel[i] += sample;
    }
  }

  private generateCrunchLayer(leftChannel: Float32Array, rightChannel: Float32Array, parameters: KickParameters, key: KeyOption, durationSec: number) {
    const { distortion } = parameters;
    const distAmount = distortion.amount / 100;
    const drive = distortion.drive / 100;
    
    // Apply different distortion types based on the kick type
    switch (distortion.type) {
      case "gated":
        this.applyGatedDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case "euphoric":
        this.applyEuphoricDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case "zaag":
        this.applyZaagDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case "reverse":
        this.applyReverseDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
    }
  }

  private applyGatedDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    const gateFreq = 32; // Gate frequency in Hz
    const gateInterval = Math.floor(this.sampleRate / gateFreq);
    
    for (let i = 0; i < length; i++) {
      // Pre-drive to get more harmonics
      leftChannel[i] *= 1 + drive * 3;
      rightChannel[i] *= 1 + drive * 3;
      
      // Hard clipping
      leftChannel[i] = this.hardClip(leftChannel[i], 0.7 + drive * 0.3);
      rightChannel[i] = this.hardClip(rightChannel[i], 0.7 + drive * 0.3);
      
      // Apply gating effect
      const gatePosition = i % gateInterval;
      const gateFactor = gatePosition < gateInterval * 0.8 ? 1.0 : 0.2;
      
      leftChannel[i] *= gateFactor * amount + (1 - amount);
      rightChannel[i] *= gateFactor * amount + (1 - amount);
    }
  }

  private applyEuphoricDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    for (let i = 0; i < length; i++) {
      // Soft clipping for warm distortion
      leftChannel[i] = this.softClip(leftChannel[i] * (1 + drive * 2)) * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = this.softClip(rightChannel[i] * (1 + drive * 2)) * amount + rightChannel[i] * (1 - amount);
    }
  }

  private applyZaagDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    for (let i = 0; i < length; i++) {
      // More aggressive distortion with asymmetric clipping
      const distortedL = this.asymClip(leftChannel[i] * (1 + drive * 4));
      const distortedR = this.asymClip(rightChannel[i] * (1 + drive * 4));
      
      leftChannel[i] = distortedL * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = distortedR * amount + rightChannel[i] * (1 - amount);
    }
  }

  private applyReverseDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // First pass to get the envelope shape
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Smooth the envelope
    this.smoothArray(envelope, 100);
    
    // Apply the reversed envelope with distortion
    for (let i = 0; i < length; i++) {
      const reverseEnv = 1 - envelope[i];
      const distFactor = 1 + drive * 2 * reverseEnv;
      
      const distortedL = this.softClip(leftChannel[i] * distFactor);
      const distortedR = this.softClip(rightChannel[i] * distFactor);
      
      leftChannel[i] = distortedL * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = distortedR * amount + rightChannel[i] * (1 - amount);
    }
  }

  private applyEffects(leftChannel: Float32Array, rightChannel: Float32Array, parameters: KickParameters) {
    const { eq, effects } = parameters;
    
    // Apply EQ (simplified)
    this.applySimpleEQ(leftChannel, rightChannel, eq.low, eq.mid, eq.high);
    
    // Apply saturation
    if (effects.saturation > 0) {
      const satAmount = effects.saturation / 100;
      this.applySaturation(leftChannel, rightChannel, satAmount);
    }
    
    // Apply reverb (simplified)
    if (effects.reverb > 0) {
      const reverbAmount = effects.reverb / 100;
      this.applySimpleReverb(leftChannel, rightChannel, reverbAmount);
    }
    
    // Apply bitcrushing
    if (effects.bitcrush > 0) {
      const bitDepth = 16 - Math.floor(effects.bitcrush / 10);
      this.applyBitcrusher(leftChannel, rightChannel, bitDepth);
    }
  }

  private applySimpleEQ(leftChannel: Float32Array, rightChannel: Float32Array, low: number, mid: number, high: number) {
    // This is a simplified EQ simulation
    // In a real implementation, you'd use biquad filters
    
    const lowGain = Math.pow(10, low / 20);   // Convert dB to linear
    const midGain = Math.pow(10, mid / 20);
    const highGain = Math.pow(10, high / 20);
    
    const length = leftChannel.length;
    const lowpassCutoff = this.sampleRate / 5;   // ~8kHz
    const highpassCutoff = 100;
    
    // Create simple FIR filters (very basic approximation)
    const lowCoeff = 0.2;
    const highCoeff = 0.8;
    
    let lowpassL = 0;
    let lowpassR = 0;
    let highpassL = 0;
    let highpassR = 0;
    
    for (let i = 0; i < length; i++) {
      // Lowpass (for low frequencies)
      lowpassL = lowpassL + lowCoeff * (leftChannel[i] - lowpassL);
      lowpassR = lowpassR + lowCoeff * (rightChannel[i] - lowpassR);
      
      // Highpass (for high frequencies)
      highpassL = highCoeff * (highpassL + leftChannel[i] - lowpassL);
      highpassR = highCoeff * (highpassR + rightChannel[i] - lowpassR);
      
      // Mid is what's left
      const midL = leftChannel[i] - lowpassL - highpassL;
      const midR = rightChannel[i] - lowpassR - highpassR;
      
      // Apply gains and recombine
      leftChannel[i] = lowpassL * lowGain + midL * midGain + highpassL * highGain;
      rightChannel[i] = lowpassR * lowGain + midR * midGain + highpassR * highGain;
    }
  }

  private applySaturation(leftChannel: Float32Array, rightChannel: Float32Array, amount: number) {
    const length = leftChannel.length;
    
    for (let i = 0; i < length; i++) {
      leftChannel[i] = this.saturate(leftChannel[i], amount);
      rightChannel[i] = this.saturate(rightChannel[i], amount);
    }
  }

  private applySimpleReverb(leftChannel: Float32Array, rightChannel: Float32Array, amount: number) {
    const length = leftChannel.length;
    const delaySamples = Math.floor(this.sampleRate * 0.05); // 50ms delay
    
    // Create a delay buffer
    const delayBufferL = new Float32Array(delaySamples);
    const delayBufferR = new Float32Array(delaySamples);
    
    // Simple feedback delay for reverb simulation
    const feedback = 0.4 * amount;
    
    // Create copies of the original signals
    const originalL = new Float32Array(leftChannel);
    const originalR = new Float32Array(rightChannel);
    
    for (let i = 0; i < length; i++) {
      // Get the delayed sample
      const delayIndex = i % delaySamples;
      const delayedL = delayBufferL[delayIndex];
      const delayedR = delayBufferR[delayIndex];
      
      // Add the delayed sample to the current sample
      leftChannel[i] = originalL[i] + delayedL * amount;
      rightChannel[i] = originalR[i] + delayedR * amount;
      
      // Update the delay buffer with the current sample plus feedback
      delayBufferL[delayIndex] = originalL[i] + delayedL * feedback;
      delayBufferR[delayIndex] = originalR[i] + delayedR * feedback;
    }
  }

  private applyBitcrusher(leftChannel: Float32Array, rightChannel: Float32Array, bitDepth: number) {
    const length = leftChannel.length;
    const step = Math.pow(2, bitDepth - 1);
    
    for (let i = 0; i < length; i++) {
      // Quantize the sample values
      leftChannel[i] = Math.round(leftChannel[i] * step) / step;
      rightChannel[i] = Math.round(rightChannel[i] * step) / step;
    }
  }

  // Utility functions for distortion
  private hardClip(sample: number, threshold: number): number {
    return Math.max(Math.min(sample, threshold), -threshold);
  }

  private softClip(sample: number): number {
    // Soft clipping using tanh
    return Math.tanh(sample);
  }

  private asymClip(sample: number): number {
    // Asymmetric clipping for more complex harmonics
    if (sample > 0) {
      return 1 - Math.exp(-sample);
    } else {
      return -1 + Math.exp(sample);
    }
  }

  private saturate(sample: number, amount: number): number {
    // Warm saturation effect
    const abs = Math.abs(sample);
    const sign = sample > 0 ? 1 : -1;
    
    // More subtle at low levels, more intense at high levels
    return sign * (abs < 0.3 ? abs : 0.3 + (1 - Math.exp(-(abs - 0.3) * 5)) * 0.7) * (1 - amount + amount * 1.5);
  }

  private smoothArray(array: Float32Array, windowSize: number) {
    const length = array.length;
    const halfWindow = Math.floor(windowSize / 2);
    const smoothed = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - halfWindow); j < Math.min(length, i + halfWindow); j++) {
        sum += array[j];
        count++;
      }
      
      smoothed[i] = sum / count;
    }
    
    // Copy back to original array
    for (let i = 0; i < length; i++) {
      array[i] = smoothed[i];
    }
  }

  play(): void {
    if (!this.audioContext || !this.kickBuffer) return;
    
    // Resume audio context if it's suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Stop any currently playing source
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    
    // Create a new source node
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.kickBuffer;
    this.source.connect(this.gainNode!);
    
    // Start playback
    this.startTime = this.audioContext.currentTime;
    this.source.start();
    this.isPlaying = true;
    
    // Handle completion
    this.source.onended = () => {
      this.isPlaying = false;
      this.source = null;
      if (this.progressCallback) this.progressCallback(0);
    };
    
    // Start visualization loop
    this.startVisualization();
  }

  stopPlayback(): void {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    
    this.isPlaying = false;
    if (this.progressCallback) this.progressCallback(0);
    this.stopVisualization();
  }

  private startVisualization(): void {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
    
    const updateVisualization = () => {
      if (!this.isPlaying || !this.analyserNode || !this.audioContext || !this.kickBuffer) {
        return;
      }
      
      // Update progress
      if (this.progressCallback && this.kickBuffer) {
        const currentTime = this.audioContext.currentTime - this.startTime;
        const duration = this.kickBuffer.duration;
        const progress = Math.min(currentTime / duration, 1);
        this.progressCallback(progress * 100);
      }
      
      // Get waveform data
      this.analyserNode.getFloatTimeDomainData(this.waveformData);
      
      // Get FFT data
      this.analyserNode.getFloatFrequencyData(this.fftData);
      
      // Calculate RMS
      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < this.waveformData.length; i++) {
        sumSquares += this.waveformData[i] * this.waveformData[i];
        peak = Math.max(peak, Math.abs(this.waveformData[i]));
      }
      const rms = Math.sqrt(sumSquares / this.waveformData.length);
      
      // Convert to dB
      const rmsDb = 20 * Math.log10(rms);
      const peakDb = 20 * Math.log10(peak);
      
      // Call the visualization callback
      if (this.visualizationCallback) {
        this.visualizationCallback(this.waveformData, this.fftData, rmsDb, peakDb);
      }
      
      // Continue the loop
      this.requestId = requestAnimationFrame(updateVisualization);
    };
    
    updateVisualization();
  }

  private stopVisualization(): void {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.kickBuffer;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  isInitialized(): boolean {
    return this.audioContext !== null;
  }

  dispose(): void {
    this.stopPlayback();
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.analyserNode = null;
    this.gainNode = null;
    this.kickBuffer = null;
  }
}

export const audioEngine = new AudioEngine();
