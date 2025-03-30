/**
 * AudioEngine.ts
 * Main audio processing engine for generating hardstyle kicks
 */

import { KickParameters, KickType, KeyOption } from '@/lib/types';

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

  /**
   * Initialize the audio context and nodes
   */
  initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create audio context
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.sampleRate = this.audioContext.sampleRate;
        
        // Create analyzer for visualizations
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = this.fftSize;
        this.analyserNode.smoothingTimeConstant = 0.3;
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.8; // Default volume
        
        // Connect nodes
        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
        
        resolve(true);
      } catch (err) {
        console.error('Error initializing audio context:', err);
        resolve(false);
      }
    });
  }

  /**
   * Set a callback function for visualization updates
   */
  setVisualizationCallback(callback: (waveform: Float32Array, fft: Float32Array, rms: number, peak: number) => void) {
    this.visualizationCallback = callback;
  }

  /**
   * Set a callback function for playback progress updates
   */
  setProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Set the volume for playback
   */
  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  /**
   * Generate a kick with the given parameters
   */
  async generateKick(parameters: KickParameters, key: KeyOption): Promise<void> {
    if (!this.audioContext) {
      console.error('Audio context not initialized');
      return;
    }

    // Update current parameters
    this.currentParameters = parameters;
    this.currentKey = key;

    // Stop any current playback
    this.stopPlayback();

    // Generate kick
    const durationSec = 2.0; // 2 seconds
    
    try {
      // Create the kick buffer with the specified parameters
      this.kickBuffer = await this.createKickBuffer(parameters, key, durationSec);
      
      // Automatically play the kick after generation
      if (this.kickBuffer) {
        this.play();
      }
    } catch (err) {
      console.error('Error generating kick:', err);
    }
  }

  /**
   * Create an audio buffer containing the kick
   */
  private async createKickBuffer(parameters: KickParameters, key: KeyOption, durationSec: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }
    
    // Create buffer
    const numSamples = Math.floor(durationSec * this.sampleRate);
    const buffer = this.audioContext.createBuffer(2, numSamples, this.sampleRate);
    
    // Get audio data
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    
    // Clear buffer
    for (let i = 0; i < numSamples; i++) {
      leftChannel[i] = 0;
      rightChannel[i] = 0;
    }
    
    // Generate the layers of the kick
    // 1. Punch Layer (sine wave with pitch envelope)
    this.generatePunchLayer(leftChannel, rightChannel, parameters, key, durationSec);
    
    // 2. Crunch Layer (distortion)
    this.generateCrunchLayer(leftChannel, rightChannel, parameters, key, durationSec);
    
    // 3. Apply effects
    this.applyEffects(leftChannel, rightChannel, parameters);
    
    return buffer;
  }

  /**
   * Generate the punch layer (attack and body of the kick)
   */
  private generatePunchLayer(leftChannel: Float32Array, rightChannel: Float32Array, parameters: KickParameters, key: KeyOption, durationSec: number) {
    const { click, pitch, adsr, sub } = parameters;
    const length = leftChannel.length;
    
    // Frequency calculations
    const baseFreq = key.frequency;
    const pitchStart = baseFreq * Math.pow(2, pitch.start / 12); // Convert semitone to frequency ratio
    const pitchEnd = baseFreq;
    const pitchTime = pitch.time;
    
    // ADSR envelope
    const attackSamples = Math.floor(adsr.attack * this.sampleRate);
    const decaySamples = Math.floor(adsr.decay * this.sampleRate);
    const releaseSamples = Math.floor(adsr.release * this.sampleRate);
    const sustainLevel = adsr.sustain;
    
    // Phase accumulator for the sine oscillator
    let phase = 0;
    
    // Click sample generation (optional)
    if (click.enabled) {
      const clickLength = Math.floor(0.015 * this.sampleRate); // 15ms click
      const clickAmplitude = click.amount / 100;
      const clickTone = 500 + (click.tone * 20); // 500Hz - 2500Hz
      
      for (let i = 0; i < clickLength; i++) {
        // Generate click sound (bandpass filtered noise)
        let noise = (Math.random() * 2 - 1);
        
        // Simple resonant filter for click tone
        const r = 0.98; // Resonance
        const f = 2 * Math.sin(Math.PI * clickTone / this.sampleRate);
        let filterOutput = noise * (1 - r) + r * (Math.sin(2 * Math.PI * clickTone * i / this.sampleRate));
        
        // Apply quick envelope
        const env = (1 - i / clickLength) * clickAmplitude;
        
        // Add to channels
        leftChannel[i] += filterOutput * env;
        rightChannel[i] += filterOutput * env;
      }
    }
    
    // Generate the main sine wave with pitch envelope
    for (let i = 0; i < length; i++) {
      // Calculate envelope
      let envelope = 0;
      const t = i / this.sampleRate;
      
      if (i < attackSamples) {
        // Attack phase
        envelope = i / attackSamples;
      } else if (i < attackSamples + decaySamples) {
        // Decay phase
        const decayProgress = (i - attackSamples) / decaySamples;
        envelope = 1 - (1 - sustainLevel) * decayProgress;
      } else if (i < length - releaseSamples) {
        // Sustain phase
        envelope = sustainLevel;
      } else {
        // Release phase
        const releaseProgress = (i - (length - releaseSamples)) / releaseSamples;
        envelope = sustainLevel * (1 - releaseProgress);
      }
      
      // Calculate pitch (logarithmic pitch envelope)
      let currentPitch = pitchEnd;
      if (t < pitchTime) {
        // Non-linear pitch envelope for more natural sound
        const pitchProgress = t / pitchTime;
        // Exponential pitch fall with initial rapid drop
        currentPitch = pitchStart * Math.pow(pitchEnd / pitchStart, Math.pow(pitchProgress, 0.5));
      }
      
      // Calculate phase increment based on current pitch
      const phaseInc = 2 * Math.PI * currentPitch / this.sampleRate;
      
      // Accumulate phase
      phase += phaseInc;
      if (phase > 2 * Math.PI) {
        phase -= 2 * Math.PI;
      }
      
      // Generate sine wave
      const sample = Math.sin(phase);
      
      // Add to channels with envelope
      leftChannel[i] += sample * envelope;
      rightChannel[i] += sample * envelope;
      
      // Add sub-bass layer if enabled
      if (sub.enabled) {
        const subAmount = sub.amount / 100;
        const subPhase = phase * 0.5; // One octave lower
        const subSample = Math.sin(subPhase) * subAmount;
        
        leftChannel[i] += subSample * envelope;
        rightChannel[i] += subSample * envelope;
      }
    }
  }

  /**
   * Generate the crunch layer with distortion
   */
  private generateCrunchLayer(leftChannel: Float32Array, rightChannel: Float32Array, parameters: KickParameters, key: KeyOption, durationSec: number) {
    const { distortion } = parameters;
    const distAmount = distortion.amount / 100;
    const drive = distortion.drive / 100;
    
    // Skip if no distortion
    if (distAmount === 0) return;
    
    // Apply the appropriate distortion based on type
    switch (distortion.type) {
      case 'gated':
        this.applyGatedDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case 'euphoric':
        this.applyEuphoricDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case 'zaag':
        this.applyZaagDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
      case 'reverse':
        this.applyReverseDistortion(leftChannel, rightChannel, distAmount, drive);
        break;
    }
  }

  /**
   * Apply gated rawstyle distortion
   */
  private applyGatedDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // FIXING GATED RAWSTYLE - MAKE GATING MUCH MORE EXTREME AND PRONOUNCED
    
    // Rawstyle gating frequency - lower frequency for more extreme effect
    const gateFreq = 16 + (drive * 8); // 16-24Hz = much more pronounced gating
    const gateInterval = Math.floor(this.sampleRate / gateFreq);
    
    // Make a copy of the original signal for later mixing
    const originalL = new Float32Array(leftChannel);
    const originalR = new Float32Array(rightChannel);
    
    // First apply extreme hard clipping with pre-gain for raw character
    for (let i = 0; i < length; i++) {
      // Apply super heavy pre-drive - essential for gated sound
      const driveAmount = 1 + drive * 8; // Much more extreme drive
      leftChannel[i] *= driveAmount;
      rightChannel[i] *= driveAmount;
      
      // Hard clipping with lower threshold for more obvious effect
      const threshold = 0.5;
      leftChannel[i] = this.hardClip(leftChannel[i], threshold);
      rightChannel[i] = this.hardClip(rightChannel[i], threshold);
    }
    
    // Create output arrays
    const outputL = new Float32Array(length);
    const outputR = new Float32Array(length);
    
    // Now apply the extreme gating effect - much more dramatic on/off pattern
    for (let i = 0; i < length; i++) {
      // Calculate gate position for this sample
      const gatePosition = i % gateInterval;
      
      // DRASTICALLY improved gate pattern with extreme on/off for rawstyle
      let gateFactor;
      const gateRatio = gatePosition / gateInterval;
      
      // Much sharper on/off ratio - 40% on, 60% off for extreme gating effect
      if (gateRatio < 0.4) { 
        // On portion - full volume
        gateFactor = 1.0;
      } else if (gateRatio < 0.45) {
        // Very quick transition
        gateFactor = 1.0 - (gateRatio - 0.4) * 20; 
      } else {
        // Off portion - almost silent for obvious gating effect
        gateFactor = 0.05; // Nearly silent for dramatic effect
      }
      
      // Apply gating to a heavily distorted copy
      outputL[i] = leftChannel[i] * gateFactor;
      outputR[i] = rightChannel[i] * gateFactor; 
      
      // Add extreme distortion after gating - vital for raw sound
      outputL[i] = this.asymClip(outputL[i] * (1 + drive * 2.0));
      outputR[i] = this.asymClip(outputR[i] * (1 + drive * 2.0));
    }
    
    // Add a phase-aligned sub that follows the gate pattern for extra punch
    let subPhase = 0;
    for (let i = 0; i < length; i++) {
      // Calculate gate position again
      const gatePosition = i % gateInterval;
      const gateRatio = gatePosition / gateInterval;
      
      // Use same gate pattern for sub
      let gateFactor = gateRatio < 0.4 ? 1.0 : 0.05;
      
      // Add a sub oscillator that follows the gating
      const baseFreq = 50; // 50Hz sub
      const phaseInc = 2 * Math.PI * baseFreq / this.sampleRate;
      subPhase += phaseInc;
      if (subPhase > 2 * Math.PI) subPhase -= 2 * Math.PI;
      
      const subOsc = Math.sin(subPhase) * 0.3 * gateFactor * amount;
      
      // Mix in the sub
      outputL[i] += subOsc;
      outputR[i] += subOsc;
    }
    
    // Final mix - blend original and processed
    const wetMix = amount * 0.9; // 90% wet for extreme effect
    for (let i = 0; i < length; i++) {
      leftChannel[i] = outputL[i] * wetMix + originalL[i] * (1 - wetMix);
      rightChannel[i] = outputR[i] * wetMix + originalR[i] * (1 - wetMix);
      
      // Final hard limiting for safety
      leftChannel[i] = this.hardClip(leftChannel[i], 0.95);
      rightChannel[i] = this.hardClip(rightChannel[i], 0.95);
    }
  }

  /**
   * Apply euphoric distortion
   */
  private applyEuphoricDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // Make copy of original signal for mixing
    const originalL = new Float32Array(leftChannel);
    const originalR = new Float32Array(rightChannel);
    
    // Euphoric kicks need clear definition with tonal character
    // Create envelope modulation frequencies for movement
    const modFreq1 = 8;  // 8 Hz modulation
    const modFreq2 = 16; // 16 Hz - more characteristic of euphoric
    let phase1 = 0;
    let phase2 = 0;
    
    // Process in two stages for true euphoric character
    // 1. First stage - clean punch in the attack (the "ting") 
    //    with boosted highs
    // 2. Second stage - warm sustain with tubey harmonics
    
    // First, generate special euphoric "ting" in the attack
    const attackSamples = Math.floor(0.1 * this.sampleRate); // 100ms attack
    for (let i = 0; i < Math.min(attackSamples, length); i++) {
      // Emphasized attack with slight frequency shift
      const attackEnv = 1.0 - (i / attackSamples);
      
      // Add subtle frequency shift for "ting" character
      const modPhase = 2 * Math.PI * 80 * i / this.sampleRate; // 80Hz shift
      
      // Apply frequency shift modulation 
      const tingAmount = attackEnv * 0.5 * amount * drive;
      leftChannel[i] += Math.sin(modPhase) * tingAmount;
      rightChannel[i] += Math.sin(modPhase) * tingAmount;
    }
    
    // Apply variable saturation throughout the sample
    for (let i = 0; i < length; i++) {
      // Update modulation phases
      phase1 += 2 * Math.PI * modFreq1 / this.sampleRate;
      phase2 += 2 * Math.PI * modFreq2 / this.sampleRate;
      if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
      if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;
      
      // Calculate euphoric character modulation
      // This creates the clear, sweet tone euphoric kicks are known for
      const mod = 0.5 + (0.5 * Math.sin(phase1)) * 0.3 + (0.5 * Math.sin(phase2)) * 0.2;
      
      // Calculate position-dependent saturation/distortion
      const positionFactor = Math.max(0, 1.0 - i / (length * 0.8)); // Stronger at start
      const saturationAmount = drive * (0.7 + mod * 0.3) * positionFactor;
      
      // First stage - soft tube-style saturation for warmth
      let leftSample = leftChannel[i] * (1 + saturationAmount * 3);
      let rightSample = rightChannel[i] * (1 + saturationAmount * 3);
      
      // Apply asymmetric soft clipping for tube-like harmonics
      const tubeWarmth = 0.7 + drive * 0.6; // Increase with drive
      leftSample = Math.tanh(leftSample * tubeWarmth);
      rightSample = Math.tanh(rightSample * tubeWarmth);
      
      // Add slight second-order harmonics (typical of euphoric)
      leftSample += 0.2 * saturationAmount * leftSample * leftSample;
      rightSample += 0.2 * saturationAmount * rightSample * rightSample;
      
      // Mix processed with original
      leftChannel[i] = leftSample * amount + originalL[i] * (1 - amount);
      rightChannel[i] = rightSample * amount + originalR[i] * (1 - amount);
    }
    
    // Apply enhancer for distinct euphoric character
    // Euphoric needs "air" and clarity in the highs
    for (let i = 1; i < length; i++) {
      // Simple high-frequency enhancer
      const enhanceAmount = 0.2 * drive * amount;
      const highFreq = leftChannel[i] - leftChannel[i-1];
      leftChannel[i] += highFreq * enhanceAmount;
      
      const highFreqR = rightChannel[i] - rightChannel[i-1];  
      rightChannel[i] += highFreqR * enhanceAmount;
    }
  }

  /**
   * Apply zaag (saw) distortion
   */
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

  /**
   * Apply reverse bass distortion
   */
  private applyReverseDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // THIS IS COMPLETELY NEW - Make reverse bass VERY different from euphoric
    
    // Make a copy of the original signal
    const originalL = new Float32Array(leftChannel);
    const originalR = new Float32Array(rightChannel);
    
    // Create a very precise envelope for the reverse effect
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Smooth the envelope thoroughly
    this.smoothArray(envelope, 200);
    
    // Create a more extreme reverse envelope - this is the key element
    const reverseEnvelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Create a reverse curve with more dramatic shape
      // The power function creates a more extreme curve - essential for reverse bass
      const normPosition = i / length;
      const envelopeValue = envelope[i];
      
      // Combine position-based envelope with amplitude-based for true reverse effect
      // Reverse bass should swell dramatically where the original decays
      reverseEnvelope[i] = Math.pow(1 - envelopeValue, 2.0) * Math.pow(normPosition, 0.5);
    }
    
    // Create output arrays for processing
    const outputL = new Float32Array(length);
    const outputR = new Float32Array(length);
    
    // Create modulation LFO specifically for reverse bass - much faster than euphoric!
    let lfoPhase = 0;
    const lfoFreq = 24 + (drive * 12); // 24-36Hz - much faster for obvious reverse character
    
    // Apply processing with extreme modulation
    for (let i = 0; i < length; i++) {
      // Update LFO - creates the distinctive reverse bass pumping
      lfoPhase += 2 * Math.PI * lfoFreq / this.sampleRate;
      if (lfoPhase > 2 * Math.PI) lfoPhase -= 2 * Math.PI;
      
      // Square-ish LFO shape for more aggressive modulation
      const lfoValue = Math.pow(0.5 * (1 + Math.sin(lfoPhase)), 0.7);
      
      // Apply reverse envelope with LFO
      const modulationAmount = reverseEnvelope[i] * (0.7 + lfoValue * 0.6);
      
      // Apply extreme distortion that follows the reverse pattern
      const distortionAmount = 1 + (drive * 5) * modulationAmount;
      
      // Process samples
      outputL[i] = leftChannel[i] * distortionAmount;
      outputR[i] = rightChannel[i] * distortionAmount;
      
      // Apply hard clipping which is essential for reverse bass character
      outputL[i] = this.hardClip(outputL[i], 0.7);
      outputR[i] = this.hardClip(outputR[i], 0.7);
    }
    
    // Add sub bass modulation - another key element of reverse bass
    let subPhase = 0;
    for (let i = 0; i < length; i++) {
      // Sub oscillator follows reverse envelope
      const subFreq = 40 + 30 * reverseEnvelope[i]; // 40-70Hz range
      
      // Update phase
      const phaseInc = 2 * Math.PI * subFreq / this.sampleRate;
      subPhase += phaseInc;
      if (subPhase > 2 * Math.PI) subPhase -= 2 * Math.PI;
      
      // Generate sub bass tone
      const subAmount = 0.4 * amount * reverseEnvelope[i] * drive;
      const subSample = Math.sin(subPhase) * subAmount;
      
      // Add to output
      outputL[i] += subSample;
      outputR[i] += subSample;
    }
    
    // Emphasize low mids for thickness
    let lowMidZ1L = 0, lowMidZ1R = 0;
    const lowMidFreq = 300 / this.sampleRate;
    const lowMidQ = 0.7;
    
    for (let i = 0; i < length; i++) {
      // Simple one-pole lowpass for low mids
      lowMidZ1L = lowMidZ1L * (1 - lowMidFreq) + outputL[i] * lowMidFreq;
      lowMidZ1R = lowMidZ1R * (1 - lowMidFreq) + outputR[i] * lowMidFreq;
      
      // Boost low mids - key for reverse bass body
      const lowMidBoost = 0.6 * drive * reverseEnvelope[i];
      outputL[i] += lowMidZ1L * lowMidBoost;
      outputR[i] += lowMidZ1R * lowMidBoost;
    }
    
    // Final mixing - blend original and processed with amplitude-dependent mixing
    for (let i = 0; i < length; i++) {
      // Make wet/dry mix follow reverse envelope for more character
      const dynamicAmount = amount * (0.7 + 0.3 * reverseEnvelope[i]);
      
      // Mix original and processed
      leftChannel[i] = outputL[i] * dynamicAmount + originalL[i] * (1 - dynamicAmount);
      rightChannel[i] = outputR[i] * dynamicAmount + originalR[i] * (1 - dynamicAmount);
      
      // Final limiting
      leftChannel[i] = this.hardClip(leftChannel[i], 0.95);
      rightChannel[i] = this.hardClip(rightChannel[i], 0.95);
    }
  }

  /**
   * Apply effects (EQ, saturation, reverb, bitcrushing)
   */
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

  /**
   * Apply a simple 3-band EQ
   */
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

  /**
   * Apply saturation effect
   */
  private applySaturation(leftChannel: Float32Array, rightChannel: Float32Array, amount: number) {
    const length = leftChannel.length;
    
    for (let i = 0; i < length; i++) {
      leftChannel[i] = this.saturate(leftChannel[i], amount);
      rightChannel[i] = this.saturate(rightChannel[i], amount);
    }
  }

  /**
   * Apply a simple reverb effect
   */
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

  /**
   * Apply bitcrusher effect
   */
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

  /**
   * Play the generated kick
   */
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

  /**
   * Stop playback
   */
  stopPlayback(): void {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    
    this.isPlaying = false;
    if (this.progressCallback) this.progressCallback(0);
    this.stopVisualization();
  }

  /**
   * Start the visualization loop
   */
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

  /**
   * Stop the visualization loop
   */
  private stopVisualization(): void {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  }

  /**
   * Get the current audio buffer
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.kickBuffer;
  }

  /**
   * Get the audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Check if the audio engine is initialized
   */
  isInitialized(): boolean {
    return this.audioContext !== null;
  }

  /**
   * Clean up resources
   */
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