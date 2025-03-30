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

    // Set canvas size
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'waveform' && waveformData) {
      // Draw waveform
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const sliceWidth = width / waveformData.length;

      ctx.beginPath();
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;

      for (let i = 0; i < waveformData.length; i++) {
        const x = i * sliceWidth;
        const y = (waveformData[i] * height / 2) + height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    } else if (type === 'spectrum' && fftData) {
      // Draw spectrum analyzer
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const barWidth = width / fftData.length;

      for (let i = 0; i < fftData.length; i++) {
        const barHeight = ((fftData[i] + 140) * height) / 140;

        // Create gradient from bottom to top
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#00ff41');
        gradient.addColorStop(1, '#39ff14');

        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
  }, [waveformData, fftData, type]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${className}`}
    />
  );
};

export default Visualizer;