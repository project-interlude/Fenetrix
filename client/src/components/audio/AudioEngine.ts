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
    
    // Create extreme distortion for that raw, aggressive tone
    for (let i = 0; i < length; i++) {
      // Extreme overdrive - way more aggressive than other types
      const driveAmount = 1 + drive * 10; // Super aggressive
      leftChannel[i] *= driveAmount;
      rightChannel[i] *= driveAmount;
      
      // Ultra-hard clipping for that signature raw sound
      const threshold = 0.4; // Much lower threshold for extreme squaring of waveform
      leftChannel[i] = this.hardClip(leftChannel[i], threshold);
      rightChannel[i] = this.hardClip(rightChannel[i], threshold);
    }
    
    // Apply very pronounced gating - extreme on/off pattern unlike any other kick type
    const gateFreq = 40; // Faster gating frequency for more obvious effect
    const gateInterval = Math.floor(this.sampleRate / gateFreq);
    
    for (let i = 0; i < length; i++) {
      // Calculate gate position
      const gatePosition = i % gateInterval;
      const gateRatio = gatePosition / gateInterval;
      
      // Create radical gating pattern - very obvious on/off
      let gateFactor;
      if (gateRatio < 0.65) { // Less on-time than other implementations
        gateFactor = 1.0; // Full on
      } else {
        gateFactor = 0.05; // Almost completely off - much more extreme
      }
      
      // Create hard transitions between on and off for that machine-gun effect
      leftChannel[i] *= gateFactor;
      rightChannel[i] *= gateFactor;
    }
    
    // Add harsh, gritty noise during the on periods
    for (let i = 0; i < length; i++) {
      // Only add noise during "on" portions of the gate
      const gatePosition = i % gateInterval;
      const gateRatio = gatePosition / gateInterval;
      
      if (gateRatio < 0.65) {
        // Add noise modulation - completely unique to the raw style
        const noise = (Math.random() * 2 - 1) * 0.2 * drive;
        leftChannel[i] += noise;
        rightChannel[i] += noise;
      }
    }
    
    // Add aggressive mid-range boost - characteristic of raw kicks
    for (let i = 0; i < length; i++) {
      // Apply mid-range boost with slight distortion - signature of raw kicks
      if (i > 0) {
        const midBoost = (leftChannel[i] - leftChannel[i-1]) * 0.5 * drive;
        leftChannel[i] += midBoost;
        rightChannel[i] += midBoost;
      }
    }
    
    // Apply extremely hard limiting at the end for that compressed, in-your-face sound
    for (let i = 0; i < length; i++) {
      leftChannel[i] = this.hardClip(leftChannel[i], 0.95);
      rightChannel[i] = this.hardClip(rightChannel[i], 0.95);
    }
  }

  private applyEuphoricDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // Create the silky-smooth melodic euphoric character - very different from raw/zaag
    for (let i = 0; i < length; i++) {
      // Extremely gentle drive - much less aggressive than others
      const driveAmount = 1 + drive * 1.2; // Much gentler than other types
      leftChannel[i] *= driveAmount;
      rightChannel[i] *= driveAmount;
    }
    
    // Apply very delicate, musical tube saturation - no harsh clipping
    for (let i = 0; i < length; i++) {
      // Use subtle, musical saturation - very different from hard clipping in raw/zaag
      leftChannel[i] = Math.tanh(leftChannel[i] * 0.7); // Much gentler tanh curve
      rightChannel[i] = Math.tanh(rightChannel[i] * 0.7);
    }
    
    // Add characteristic chorus effect - completely unique to euphoric
    let chorusPhase = 0;
    const chorusRate = 0.5; // Very slow modulation
    const chorusDepth = 0.3 * drive;
    
    // Create chorus delay buffer (completely different from other types)
    const chorusDelayLen = Math.floor(this.sampleRate * 0.015); // 15ms delay
    const chorusBuffer = new Float32Array(chorusDelayLen);
    
    // Fill buffer with initial content
    for (let i = 0; i < chorusDelayLen && i < length; i++) {
      chorusBuffer[i] = leftChannel[i];
    }
    
    // Apply chorus effect (completely unique to euphoric type)
    for (let i = chorusDelayLen; i < length; i++) {
      chorusPhase += 2 * Math.PI * chorusRate / this.sampleRate;
      if (chorusPhase > 2 * Math.PI) chorusPhase -= 2 * Math.PI;
      
      const modulation = Math.sin(chorusPhase) * chorusDepth;
      
      // Calculate chorus delay (variable)
      const delayOffset = Math.floor(modulation * chorusDelayLen * 0.5);
      const delayPos = (i - chorusDelayLen + delayOffset) % length;
      
      // Add chorus - creates that wide, euphoric stereo image
      leftChannel[i] += chorusBuffer[i % chorusDelayLen] * 0.5;
      rightChannel[i] += chorusBuffer[(i + delayOffset) % chorusDelayLen] * 0.5;
      
      // Update chorus buffer
      chorusBuffer[i % chorusDelayLen] = leftChannel[i];
    }
    
    // Euphoric kicks have characteristic bright high end - very different from others
    for (let i = 2; i < length; i++) {
      // Add bright "air" frequencies - distinctive euphoric character
      const brightener = (leftChannel[i] - leftChannel[i-1]) * 0.4 * drive; 
      leftChannel[i] += brightener;
      rightChannel[i] += brightener;
    }
    
    // Add a melodic tone - unique to euphoric style
    let tonePhase = 0;
    const toneFreq = 880; // Higher pitched distinctive tone
    
    for (let i = 0; i < Math.min(length, this.sampleRate * 0.15); i++) { // Only in first 150ms
      // Generate high tone that fades out
      tonePhase += 2 * Math.PI * toneFreq / this.sampleRate;
      if (tonePhase > 2 * Math.PI) tonePhase -= 2 * Math.PI;
      
      // Create fade out envelope
      const fadeOut = 1 - (i / (this.sampleRate * 0.15));
      
      // Add the tone - unique euphoric character
      const toneSample = Math.sin(tonePhase) * 0.1 * fadeOut * drive;
      leftChannel[i] += toneSample;
      rightChannel[i] += toneSample;
    }
    
    // Apply compression with soft limiting - very different from the hard limited raw style
    for (let i = 0; i < length; i++) {
      // Gentle limiting to maintain clean, musical character
      leftChannel[i] = Math.tanh(leftChannel[i] * 0.8);
      rightChannel[i] = Math.tanh(rightChannel[i] * 0.8);
    }
  }

  private applyZaagDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // ZAAG has a COMPLETELY different character than other kick types
    // It uses EXTREME saw-wave style distortion with a very distinctive character
    
    // First, apply extreme drive - WAY stronger than the euphoric style
    for (let i = 0; i < length; i++) {
      leftChannel[i] *= 1 + drive * 15; // Extremely aggressive - nothing like the others
      rightChannel[i] *= 1 + drive * 15;
    }
    
    // Apply distinctive saw-tooth wave folding - ZAAG signature sound
    for (let i = 0; i < length; i++) {
      // Heavy foldback distortion - absolutely unique to ZAAG distortion
      const threshold = 0.3; // Very aggressive folding
      
      // Apply radical waveshaping
      while (Math.abs(leftChannel[i]) > threshold) {
        if (leftChannel[i] > threshold) {
          leftChannel[i] = 2 * threshold - leftChannel[i];
        } else if (leftChannel[i] < -threshold) {
          leftChannel[i] = -2 * threshold - leftChannel[i];
        }
      }
      
      while (Math.abs(rightChannel[i]) > threshold) {
        if (rightChannel[i] > threshold) {
          rightChannel[i] = 2 * threshold - rightChannel[i];
        } else if (rightChannel[i] < -threshold) {
          rightChannel[i] = -2 * threshold - rightChannel[i];
        }
      }
    }
    
    // Add multiple square wave overtones for that distinctive ZAAG sound
    let phase1 = 0, phase2 = 0;
    const squareFreq1 = 250; // Higher than other distortion types
    const squareFreq2 = 420; // Second harmonic - unique to zaag
    
    for (let i = 0; i < length; i++) {
      // First saw component
      phase1 += 2 * Math.PI * squareFreq1 / this.sampleRate;
      if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
      
      // Second saw component - unique layering approach for zaag
      phase2 += 2 * Math.PI * squareFreq2 / this.sampleRate;
      if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;
      
      // Create saw waves instead of square for ZAAG character
      const saw1 = 2 * (phase1 / (2 * Math.PI)) - 1;
      const saw2 = 2 * (phase2 / (2 * Math.PI)) - 1;
      
      // Mix in these extremely distinctive overtones - zaag signature
      const sawMix = 0.4 * drive; // MUCH stronger than other types
      leftChannel[i] += (saw1 * 0.6 + saw2 * 0.4) * sawMix;
      rightChannel[i] += (saw1 * 0.6 + saw2 * 0.4) * sawMix;
    }
    
    // Add bitcrushing effect - absolutely distinctive ZAAG character
    if (drive > 0.4) {
      // Reduce bit-depth for that digital zaagy sound
      const bitReduction = Math.pow(2, 6); // ~6-bit sound!
      
      for (let i = 0; i < length; i++) {
        // Aggressive bitcrushing unique to zaag
        leftChannel[i] = Math.round(leftChannel[i] * bitReduction) / bitReduction;
        rightChannel[i] = Math.round(rightChannel[i] * bitReduction) / bitReduction;
      }
    }
    
    // Add comb filtering for that classic zaag resonant sound
    const combDelay = Math.floor(this.sampleRate / 1000); // 1ms delay
    const combBuffer = new Float32Array(combDelay);
    
    for (let i = combDelay; i < length; i++) {
      // Unique resonant comb filtering - nothing like the other types
      const combFeedback = 0.7 * drive;
      const idx = i % combDelay;
      const delayed = combBuffer[idx];
      
      // Add comb filtering
      leftChannel[i] = leftChannel[i] + delayed * combFeedback;
      combBuffer[idx] = leftChannel[i];
    }
    
    // Final extreme distortion and clipping
    for (let i = 0; i < length; i++) {
      // Ultra-hard digital clipping - very different from other types
      leftChannel[i] = this.hardClip(leftChannel[i], 0.8);
      rightChannel[i] = this.hardClip(rightChannel[i], 0.8);
    }
  }

  private applyReverseDistortion(leftChannel: Float32Array, rightChannel: Float32Array, amount: number, drive: number) {
    const length = leftChannel.length;
    
    // CRITICAL: REVERSE BASS IS 100% DIFFERENT FROM OTHER KICK TYPES
    // It's defined by an inverted envelope shape where the tail gets LOUDER instead of quieter
    
    // Create amplitude envelope from the original signal
    const envelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      envelope[i] = Math.abs(leftChannel[i]);
    }
    
    // Smooth the envelope for a musical curve
    this.smoothArray(envelope, 80);
    
    // Create completely inverted envelope - THE defining feature of reverse bass
    const reverseEnvelope = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Create more dramatic reverse envelope curve for more obvious effect
      const normalizedPos = i / length;
      
      // DRAMATIC reverse curve (power curve for extreme effect)
      reverseEnvelope[i] = Math.pow(normalizedPos, 1.2) * (1 - envelope[i]) + 0.2; 
    }
    
    // Apply heavy pre-amplification - different from all other types
    for (let i = 0; i < length; i++) {
      // Start with tamer amplification than raw/zaag
      leftChannel[i] *= 1 + drive * 1.5;
      rightChannel[i] *= 1 + drive * 1.5;
    }
    
    // Create slow LFO for dramatic reverse bass wobble - EXTREMELY distinctive
    let lfoPhase = 0;
    const lfoFreq = 2.5 + (drive * 6); // Very slow, obvious wobble (2.5-8.5 Hz)
    
    // Apply the dramatic reverse modulation
    for (let i = 0; i < length; i++) {
      // Update LFO
      lfoPhase += 2 * Math.PI * lfoFreq / this.sampleRate;
      if (lfoPhase > 2 * Math.PI) lfoPhase -= 2 * Math.PI;
      
      // Calculate dramatic LFO value with shaped curve for more obvious effect
      const rawLFO = Math.sin(lfoPhase);
      // Reshape LFO curve for more sudden transitions - critical for reverse bass character
      const shapedLFO = Math.pow(Math.abs(rawLFO), 0.7) * Math.sign(rawLFO);
      const lfoValue = 0.5 * (1 + shapedLFO);
      
      // Apply EXTREME reverse envelope modulation - way more dramatic than other kick types
      const modulationFactor = 5 + drive * 15; // Much stronger modulation 
      const modulatedGain = 1 + (reverseEnvelope[i] * modulationFactor * lfoValue);
      
      // Apply dramatic gain wobble
      leftChannel[i] *= modulatedGain;
      rightChannel[i] *= modulatedGain;
    }
    
    // Add MASSIVE throbbing sub bass - much heavier than other kick types
    let subPhase1 = 0, subPhase2 = 0;
    const subFreq1 = 40; // Very low fundamental
    const subFreq2 = 80; // First harmonic for texture
    
    for (let i = 0; i < length; i++) {
      // First sub oscillator
      subPhase1 += 2 * Math.PI * subFreq1 / this.sampleRate;
      if (subPhase1 > 2 * Math.PI) subPhase1 -= 2 * Math.PI;
      
      // Second sub oscillator for complex texture
      subPhase2 += 2 * Math.PI * subFreq2 / this.sampleRate;
      if (subPhase2 > 2 * Math.PI) subPhase2 -= 2 * Math.PI;
      
      // Calculate sub shape with slight saturation for richness
      const subValue1 = Math.tanh(Math.sin(subPhase1) * 1.2);
      const subValue2 = Math.sin(subPhase2) * 0.3;
      
      // Create composite sub signal modulated by reverse envelope
      // MUCH stronger sub than in other kick types
      const subMix = (subValue1 + subValue2) * 0.5 * drive * reverseEnvelope[i];
      
      // Add massive sub bass to signal
      leftChannel[i] += subMix;
      rightChannel[i] += subMix;
    }
    
    // Add resonant filter sweep - UNIQUE to reverse bass
    let filterPhase = 0;
    const filterFreq = lfoFreq * 2; // Sync with LFO but faster
    const resonanceAmount = 0.85 * drive; // Heavy resonance
    
    // Create filter buffer for resonance
    const filterBufferLength = Math.floor(this.sampleRate * 0.025); // 25ms
    const filterBuffer = new Float32Array(filterBufferLength);
    
    // Apply resonant filter sweep
    for (let i = filterBufferLength; i < length; i++) {
      // Update filter modulation
      filterPhase += 2 * Math.PI * filterFreq / this.sampleRate;
      if (filterPhase > 2 * Math.PI) filterPhase -= 2 * Math.PI;
      
      // Filter frequency follows reverse envelope
      const filterFactor = 0.2 + 0.7 * reverseEnvelope[i] * (0.6 + 0.4 * Math.sin(filterPhase));
      
      // Apply resonant filter - classic reverse bass sound
      const bufferIdx = i % filterBufferLength;
      const resonance = filterBuffer[bufferIdx] * resonanceAmount * reverseEnvelope[i];
      
      // Add resonance to signal
      leftChannel[i] += resonance;
      
      // Update filter buffer
      filterBuffer[bufferIdx] = leftChannel[i];
    }
    
    // Apply final limiting but with asymmetric saturation
    for (let i = 0; i < length; i++) {
      // Asymmetric saturation for distinctive sound
      if (leftChannel[i] > 0) {
        leftChannel[i] = 1 - Math.exp(-leftChannel[i]);
      } else {
        leftChannel[i] = -Math.tanh(Math.abs(leftChannel[i]));
      }
      
      if (rightChannel[i] > 0) {
        rightChannel[i] = 1 - Math.exp(-rightChannel[i]);
      } else {
        rightChannel[i] = -Math.tanh(Math.abs(rightChannel[i]));
      }
    }
    
    // Final limiting for safety
    for (let i = 0; i < length; i++) {
      leftChannel[i] = this.softClip(leftChannel[i]);
      rightChannel[i] = this.softClip(rightChannel[i]);
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
      if (!this.analyserNode || !this.audioContext) {
        return;
      }
      
      // Update progress
      if (this.progressCallback && this.kickBuffer && this.isPlaying) {
        const currentTime = this.audioContext.currentTime - this.startTime;
        const duration = this.kickBuffer.duration;
        const progress = Math.min(currentTime / duration, 1);
        this.progressCallback(progress * 100);
      }
      
      // Get waveform data
      const waveformData = new Float32Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getFloatTimeDomainData(waveformData);
      
      // Get FFT data
      const fftData = new Float32Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getFloatFrequencyData(fftData);
      
      // Calculate RMS and peak
      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < waveformData.length; i++) {
        sumSquares += waveformData[i] * waveformData[i];
        peak = Math.max(peak, Math.abs(waveformData[i]));
      }
      const rms = Math.sqrt(sumSquares / waveformData.length);
      
      // Convert to dB
      const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10));
      const peakDb = 20 * Math.log10(Math.max(peak, 1e-10));
      
      // Call the visualization callback
      if (this.visualizationCallback) {
        this.visualizationCallback(waveformData, fftData, rmsDb, peakDb);
      }
      
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
