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
    
    // Pitch envelope parameters - more extreme for hardstyle kicks
    const baseFreq = key.frequency;
    // Start much higher for a more dramatic pitch drop
    const startFreq = baseFreq * Math.max(3, pitch.start / 5); 
    const pitchEnvTime = pitch.time / 1000; // Convert to seconds
    const pitchEnvSamples = Math.floor(pitchEnvTime * sampleRate);
    
    // Improved non-linear pitch curve for more professional sound
    // Precompute pitch curve for efficiency and better control
    const pitchCurve = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      if (i < pitchEnvSamples) {
        // Non-linear curve that starts fast and slows down - sounds more natural
        const pitchProgress = Math.pow(i / pitchEnvSamples, 0.5); // Power curve for more aggressive initial drop
        pitchCurve[i] = startFreq - (startFreq - baseFreq) * pitchProgress;
      } else {
        pitchCurve[i] = baseFreq;
      }
    }
    
    // Click oscillator parameters - critically important for hardstyle kick punch
    const clickAmount = click.enabled ? click.amount / 100 : 0;
    const clickTone = click.tone / 100; // Controls the frequency of the click
    
    // Use a mix of sine and noise for more realistic click
    const clickFreq = 1500 + (clickTone * 5000); // 1.5kHz to 6.5kHz - more range for transient
    
    // Sub oscillator - key for that deep sub feeling
    const subAmount = sub.enabled ? sub.amount / 100 : 0;
    
    // Phase accumulation for oscillators
    let phase = 0;
    let subPhase = 0;
    let clickPhase = 0;
    
    // White noise buffer for click component
    const noiseBuffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      noiseBuffer[i] = Math.random() * 2 - 1;
    }
    
    // Improved amplitude envelope with better attack curve for punch
    for (let i = 0; i < numSamples; i++) {
      // Calculate amplitude envelope with better curves for punch sound
      let amplitude = 0;
      
      if (i < attackSamples) {
        // Attack phase - slightly curved for better punch
        amplitude = Math.pow(i / attackSamples, 0.8); // Slightly curved attack
      } else if (i < attackSamples + decaySamples) {
        // Decay phase with improved curve
        const decayProgress = (i - attackSamples) / decaySamples;
        amplitude = 1.0 - Math.pow(decayProgress, 0.7) * (1.0 - sustainLevel);
      } else if (i < numSamples - releaseSamples) {
        // Sustain phase
        amplitude = sustainLevel;
      } else {
        // Release phase with improved curve
        const releaseProgress = (i - (numSamples - releaseSamples)) / releaseSamples;
        amplitude = sustainLevel * (1.0 - Math.pow(releaseProgress, 1.2));
      }
      
      // Use the precomputed pitch curve
      const frequency = pitchCurve[i];
      
      // Calculate the phase increment based on frequency
      const phaseIncrement = frequency / sampleRate * 2 * Math.PI;
      phase += phaseIncrement;
      
      // Sub bass (one octave lower) - more pronounced in hardstyle
      const subPhaseIncrement = (frequency / 2) / sampleRate * 2 * Math.PI;
      subPhase += subPhaseIncrement;
      
      // Click sound (higher pitched, decays quickly)
      const clickPhaseIncrement = clickFreq / sampleRate * 2 * Math.PI;
      clickPhase += clickPhaseIncrement;
      
      // Calculate click envelope (faster decay for sharper transient)
      // Two-stage click for more realistic attack
      let clickEnvelope;
      if (i < sampleRate * 0.005) { // First 5ms - very sharp attack
        clickEnvelope = clickAmount * Math.exp(-i / (sampleRate * 0.002)); 
      } else {
        clickEnvelope = clickAmount * 0.7 * Math.exp(-(i - sampleRate * 0.005) / (sampleRate * 0.01));
      }
      
      // Main oscillator (sine wave with soft clipping for warmth)
      const sineValue = Math.tanh(1.2 * Math.sin(phase)); // Slight saturation for warmth
      
      // Sub oscillator (sine wave with enhancement)
      const subValue = Math.sin(subPhase) * subAmount * (1 + 0.05 * Math.sin(subPhase * 1.5));
      
      // Click oscillator (mix of sine and noise for realism)
      const noisePart = noiseBuffer[i] * 0.3; // 30% noise
      const sinePart = Math.sin(clickPhase) * 0.7; // 70% sine wave
      const clickValue = (noisePart + sinePart) * clickEnvelope;
      
      // Apply slight distortion to the sine component for more character
      const distortedSine = Math.tanh(sineValue * 1.5) * 0.8;
      
      // Mix all components with improved balancing
      const sample = (distortedSine * 0.6 + subValue * 0.4) * amplitude + clickValue;
      
      // Add slight compression/limiting for a more polished sound
      const compressedSample = Math.tanh(sample * 1.2) * 0.9;
      
      // Apply to both channels
      leftChannel[i] += compressedSample;
      rightChannel[i] += compressedSample;
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
    
    // Professional Rawstyle kicks use complex gating patterns
    // More aggressive and tighter gating for that raw sound
    const gateFreq = 32 + (drive * 16); // Dynamic gate frequency (32-48Hz)
    const gateInterval = Math.floor(this.sampleRate / gateFreq);
    
    // First apply hard clipping with pre-gain to generate rich harmonics
    for (let i = 0; i < length; i++) {
      // Apply heavy pre-drive - essential for raw kicks
      const driveAmount = 1 + drive * 5; // More extreme drive for rawstyle
      leftChannel[i] *= driveAmount;
      rightChannel[i] *= driveAmount;
      
      // Hard clipping with variable threshold for more character
      const threshold = 0.6 + drive * 0.3;
      leftChannel[i] = this.hardClip(leftChannel[i], threshold);
      rightChannel[i] = this.hardClip(rightChannel[i], threshold);
    }
    
    // Apply an envelope to the distortion for dynamic character
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Create simple amplitude envelope based on the audio
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Smooth the envelope
    this.smoothArray(envelope, 50);
    
    // Now apply the gating effect with enhanced character
    for (let i = 0; i < length; i++) {
      // Calculate gate position for this sample
      const gatePosition = i % gateInterval;
      
      // Professional gating pattern with smoother transition
      let gateFactor;
      const gateRatio = gatePosition / gateInterval;
      
      if (gateRatio < 0.8) {
        // On portion - full volume
        gateFactor = 1.0;
      } else if (gateRatio < 0.85) {
        // Smooth transition down
        gateFactor = 1.0 - (gateRatio - 0.8) * 20; // Ramp down over 5% of cycle
      } else {
        // Off portion - lower but not silent
        gateFactor = 0.1 + (drive * 0.1); // More drive keeps more sound during off period
      }
      
      // Apply the gating with dynamic character based on envelope
      const effectiveAmount = amount * (0.8 + envelope[i] * 0.2); // More effect on louder parts
      
      // Apply gating with a slight emphasis on attack transients
      leftChannel[i] *= gateFactor * effectiveAmount + (1 - effectiveAmount);
      rightChannel[i] *= gateFactor * effectiveAmount + (1 - effectiveAmount);
      
      // Add slight distortion after gating for more bite
      leftChannel[i] = this.asymClip(leftChannel[i] * (1 + drive * 0.5));
      rightChannel[i] = this.asymClip(rightChannel[i] * (1 + drive * 0.5));
    }
  }

  private applyEuphoricDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // Euphoric hardstyle kicks use warm tube-like saturation with a clean tail
    // Create an envelope to make distortion musical and dynamic
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Smooth the envelope for natural sound
    this.smoothArray(envelope, 200); // Smoother envelope for euphoric
    
    // Apply tube-like saturation that's stronger on transients
    for (let i = 0; i < length; i++) {
      // Calculate drive amount that diminishes over time for clean tail
      const dynamicDrive = drive * (0.8 + envelope[i] * 3.0);
      
      // First stage - soft saturation (tube emulation)
      let leftSample = leftChannel[i] * (1 + dynamicDrive);
      let rightSample = rightChannel[i] * (1 + dynamicDrive);
      
      // Tube-like soft clipping with asymmetry for richer harmonics
      leftSample = Math.tanh(leftSample) * 0.6 + Math.tanh(leftSample * 1.5) * 0.4;
      rightSample = Math.tanh(rightSample) * 0.6 + Math.tanh(rightSample * 1.5) * 0.4;
      
      // Add subtle second harmonic for warmth (characteristic of tube amps)
      leftSample += 0.1 * dynamicDrive * leftSample * leftSample;
      rightSample += 0.1 * dynamicDrive * rightSample * rightSample;
      
      // Apply slight high-frequency enhancement for air
      if (i > 0) {
        // Simple high-frequency enhancement
        const highFreq = leftChannel[i] - leftChannel[i-1];
        leftSample += highFreq * 0.2 * drive;
        
        const highFreqR = rightChannel[i] - rightChannel[i-1];
        rightSample += highFreqR * 0.2 * drive;
      }
      
      // Mix between dry and processed signal based on amount
      leftChannel[i] = leftSample * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = rightSample * amount + rightChannel[i] * (1 - amount);
      
      // Add slight compression for punch and loudness
      leftChannel[i] = Math.tanh(leftChannel[i] * 1.2) * 0.9;
      rightChannel[i] = Math.tanh(rightChannel[i] * 1.2) * 0.9;
    }
  }

  private applyZaagDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // Zaag (saw) distortion is characterized by aggressive, saw-like harmonics
    // First, apply heavy pre-gain to create rich harmonic content
    for (let i = 0; i < length; i++) {
      leftChannel[i] *= 1 + drive * 6; // Very aggressive drive
      rightChannel[i] *= 1 + drive * 6;
    }
    
    // Apply foldback distortion to create saw-like harmonics
    for (let i = 0; i < length; i++) {
      // Fold back when signal exceeds threshold
      const threshold = 0.6;
      
      // Apply foldback distortion
      if (Math.abs(leftChannel[i]) > threshold) {
        leftChannel[i] = threshold * (leftChannel[i] < 0 ? -1 : 1) - 
          (leftChannel[i] - threshold * (leftChannel[i] < 0 ? -1 : 1));
      }
      
      if (Math.abs(rightChannel[i]) > threshold) {
        rightChannel[i] = threshold * (rightChannel[i] < 0 ? -1 : 1) - 
          (rightChannel[i] - threshold * (rightChannel[i] < 0 ? -1 : 1));
      }
    }
    
    // Apply asymmetric distortion for more aggressive character
    for (let i = 0; i < length; i++) {
      // This creates more odd harmonics which sound more "saw-like"
      const distortedL = this.asymClip(leftChannel[i] * (1 + drive * 2));
      const distortedR = this.asymClip(rightChannel[i] * (1 + drive * 2));
      
      // Add bit of square-wave harmonics for that zaag character
      const squareFactorL = Math.sign(leftChannel[i]) * 0.2 * drive;
      const squareFactorR = Math.sign(rightChannel[i]) * 0.2 * drive;
      
      // Mix the distorted signal with the original based on amount
      leftChannel[i] = (distortedL + squareFactorL) * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = (distortedR + squareFactorR) * amount + rightChannel[i] * (1 - amount);
      
      // Final hard limiting for safety
      leftChannel[i] = Math.tanh(leftChannel[i] * 1.2);
      rightChannel[i] = Math.tanh(rightChannel[i] * 1.2);
    }
    
    // Add frequency shifting effect (very subtle) for that "zaag" texture
    if (drive > 0.5) {
      let phase = 0;
      const shiftFreq = 30 + drive * 20; // Higher drive = more shift (50-100 Hz)
      const modDepth = 0.1 * drive; // Modulation depth proportional to drive
      
      for (let i = 0; i < length; i++) {
        // Simple frequency shifter
        phase += 2 * Math.PI * shiftFreq / this.sampleRate;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
        
        // Apply subtle ring modulation
        const modFactor = 1 + modDepth * Math.sin(phase);
        leftChannel[i] *= modFactor;
        rightChannel[i] *= modFactor;
      }
    }
  }

  private applyReverseDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // Reverse Bass distortion is characterized by a distinctive reverse envelope
    // First create an accurate envelope of the signal
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Apply more thorough smoothing for a natural envelope curve
    this.smoothArray(envelope, 150);
    
    // Prepare a reverse envelope that rises where the original signal decays
    // This is the key characteristic of reverse bass
    const reverseEnvelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Create a reverse curve with more character (not just 1-envelope)
      // The power function creates a more musical curve
      reverseEnvelope[i] = Math.pow(1 - envelope[i], 1.5);
    }
    
    // Prepare LFO for pumping effect common in reverse bass
    let lfoPhase = 0;
    const lfoFreq = 8 + (drive * 8); // 8-16 Hz range based on drive
    const lfoDepth = 0.3 + (drive * 0.3); // 30-60% depth based on drive
    
    // Apply the reversed envelope with specialized distortion
    for (let i = 0; i < length; i++) {
      // Update LFO - creates pumping effect
      lfoPhase += 2 * Math.PI * lfoFreq / this.sampleRate;
      if (lfoPhase > 2 * Math.PI) lfoPhase -= 2 * Math.PI;
      
      // Calculate LFO modulation - slight asymmetry for more character
      const lfoValue = 0.5 * (1 + Math.sin(lfoPhase)) * lfoDepth; 
      
      // Apply reverse envelope with LFO modulation
      const modulatedEnv = reverseEnvelope[i] * (1 + lfoValue);
      
      // Calculate distortion factor - stronger where original signal is quiet
      const distFactor = 1 + drive * 3 * modulatedEnv;
      
      // Apply distortion
      let distortedL = leftChannel[i] * distFactor;
      let distortedR = rightChannel[i] * distFactor;
      
      // Apply soft clipping, which is characteristic of reverse bass
      distortedL = this.softClip(distortedL);
      distortedR = this.softClip(distortedR);
      
      // Add sub-harmonic enhancement to emphasize the "bass" in reverse bass
      // This simulates the heavy sub content in this style
      const subEnhancement = 0.4 * drive * modulatedEnv * Math.sin(0.5 * lfoPhase);
      
      // Mix with sub enhancement
      distortedL += subEnhancement;
      distortedR += subEnhancement;
      
      // Final mix between dry and wet signals
      leftChannel[i] = distortedL * amount + leftChannel[i] * (1 - amount);
      rightChannel[i] = distortedR * amount + rightChannel[i] * (1 - amount);
      
      // Apply final limiting for safety
      leftChannel[i] = Math.tanh(leftChannel[i] * 0.95);
      rightChannel[i] = Math.tanh(rightChannel[i] * 0.95);
    }
    
    // Add subtle sidechain compression effect for that pumping character
    if (drive > 0.3) {
      // Create sidechain envelope - stronger at beginning, weaker at end
      const sidechain = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        sidechain[i] = Math.exp(-i / (this.sampleRate * 0.2)); // 200ms decay
      }
      
      // Apply sidechain envelope
      for (let i = 0; i < length; i++) {
        const sidechainAmount = 0.2 + drive * 0.3; // 20-50% based on drive
        const gain = 1 - sidechain[i] * sidechainAmount;
        leftChannel[i] *= gain;
        rightChannel[i] *= gain;
      }
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
