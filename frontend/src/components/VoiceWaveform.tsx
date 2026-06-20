import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  color?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  color = '#00f2fe'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;
    const barCount = 30;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      phase += 0.15;

      const barWidth = canvas.width / barCount;
      ctx.fillStyle = color;

      for (let i = 0; i < barCount; i++) {
        // Calculate height based on sine wave and active state
        let height = 4;
        if (isActive) {
          const sinFactor = Math.sin(phase + i * 0.4);
          const noiseFactor = Math.random() * 0.3;
          height = Math.max(4, Math.abs(sinFactor + noiseFactor) * (canvas.height - 8));
        } else {
          // Idle ambient wave
          height = 3 + Math.sin(phase * 0.1 + i * 0.2) * 3;
        }

        const x = i * barWidth;
        const y = (canvas.height - height) / 2;

        // Draw pill-shaped glowing bars
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, height, (barWidth - 4) / 2);
        
        // Add glow gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#9b5de5'); // Gradient blend
        ctx.fillStyle = gradient;
        
        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 12 : 3;
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, color]);

  return (
    <div className="w-full h-12 flex items-center justify-center bg-black/40 rounded-xl px-4 border border-cyber-border/20">
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={48} 
        className="w-full h-full"
      />
    </div>
  );
};
