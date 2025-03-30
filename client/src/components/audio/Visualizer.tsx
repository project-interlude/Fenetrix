
import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  waveformData?: Float32Array;
  fftData?: Float32Array;
  type: 'waveform' | 'spectrum';
  className?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  waveformData, 
  fftData, 
  type,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    if (type === 'waveform' && waveformData) {
      ctx.beginPath();
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;

      const step = Math.ceil(waveformData.length / width);
      const amp = height / 2;

      for (let i = 0; i < width; i++) {
        const x = i;
        const y = (1 + waveformData[i * step]) * amp;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    } else if (type === 'spectrum' && fftData) {
      const barWidth = width / fftData.length;
      ctx.fillStyle = '#00ff41';

      for (let i = 0; i < fftData.length; i++) {
        const x = i * barWidth;
        const barHeight = ((fftData[i] + 140) * height) / 140;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      }
    }
  }, [waveformData, fftData, type]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default Visualizer;
