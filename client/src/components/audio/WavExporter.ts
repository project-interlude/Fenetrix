/**
 * WavExporter.ts
 * Utility for converting AudioBuffer to WAV format and downloading
 */

export class WavExporter {
  /**
   * Convert an AudioBuffer to WAV format
   * @param audioBuffer The AudioBuffer to convert
   * @param options Options for the WAV format (bit depth, etc.)
   * @returns A Blob containing the WAV data
   */
  static audioBufferToWav(audioBuffer: AudioBuffer, options: { bitDepth?: 16 | 24 | 32 } = {}): Blob {
    const bitDepth = options.bitDepth || 24; // Default to 24-bit
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    // Calculate byte sizes
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    
    // Create the buffer for the WAV file
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 for PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write the PCM samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        // Convert float to integer based on bit depth
        if (bitDepth === 16) {
          view.setInt16(offset, sample * 32767, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const value = Math.floor(sample * 8388607);
          view.setUint8(offset, value & 0xFF);
          view.setUint8(offset + 1, (value >> 8) & 0xFF);
          view.setUint8(offset + 2, (value >> 16) & 0xFF);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  /**
   * Download a WAV file from an AudioBuffer
   * @param audioBuffer The AudioBuffer to download
   * @param fileName The name for the downloaded file
   * @param options Options for the WAV format
   */
  static downloadWav(audioBuffer: AudioBuffer, fileName: string, options: { bitDepth?: 16 | 24 | 32 } = {}): void {
    const wav = this.audioBufferToWav(audioBuffer, options);
    const url = URL.createObjectURL(wav);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
