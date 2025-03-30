import React, { useRef, useEffect, useState } from 'react';

interface VisualizerProps {
  waveformData?: Float32Array;
  fftData?: Float32Array;
  type: 'waveform' | 'spectrum';
  width?: number;
  height?: number;
  className?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  waveformData, 
  fftData, 
  type, 
  width = 600, 
  height = 160,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    setCanvasContext(ctx);
  }, [width, height]);

  useEffect(() => {
    if (!canvasContext) return;
    
    // Clear the canvas
    canvasContext.clearRect(0, 0, width, height);
    
    if (type === 'waveform' && waveformData) {
      drawWaveform(canvasContext, waveformData, width, height);
    } else if (type === 'spectrum' && fftData) {
      drawSpectrum(canvasContext, fftData, width, height);
    } else {
      // Draw placeholder if no data
      drawPlaceholder(canvasContext, type, width, height);
    }
  }, [canvasContext, waveformData, fftData, type, width, height]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D, 
    data: Float32Array, 
    width: number, 
    height: number
  ) => {
    const bufferLength = data.length;
    const sliceWidth = width / bufferLength;
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00e676'; // Hardstyle green
    ctx.beginPath();
    
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = data[i];
      const y = (v + 1) * height / 2; // Normalize to canvas height
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  };

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D, 
    data: Float32Array, 
    width: number, 
    height: number
  ) => {
    const bufferLength = data.length;
    const barWidth = width / bufferLength;
    
    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#4a148c'); // Dark purple
    gradient.addColorStop(0.5, '#7c4dff'); // Medium purple
    gradient.addColorStop(1, '#00e676'); // Green
    
    for (let i = 0; i < bufferLength; i++) {
      // Convert dB to normalized height (dB typically range from -100 to 0)
      const dbValue = data[i];
      const normalizedHeight = Math.max(0, 1 - (dbValue + 100) / 100); // -100dB to 0dB mapped to 0-1
      const barHeight = normalizedHeight * height;
      
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
  };

  const drawPlaceholder = (
    ctx: CanvasRenderingContext2D, 
    type: 'waveform' | 'spectrum', 
    width: number, 
    height: number
  ) => {
    if (type === 'waveform') {
      // Draw a simple sine wave as placeholder
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#333'; // Dimmed color
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.05) * (height / 4);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    } else {
      // Draw placeholder frequency bars
      const barCount = 64;
      const barWidth = width / barCount;
      
      ctx.fillStyle = '#333'; // Dimmed color
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * height * 0.8; // Random height
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${className}`}
      width={width}
      height={height}
    />
  );
};

export default Visualizer;
