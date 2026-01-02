"use client";

import { useRef, useEffect } from "react";
import { useAudioStore } from "@/features/audio";

interface WaveformVisualizerProps {
  width?: number;
  height?: number;
  barCount?: number;
  color?: string;
  glowColor?: string;
}

export default function WaveformVisualizer({
  width = 300,
  height = 60,
  barCount = 32,
  color = "#39FF14",
  glowColor = "#39FF14",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frequencyData, isPlaying, bassEnergy } = useAudioStore();
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      if (!frequencyData || !isPlaying) {
        // Draw idle state - flat line
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const barWidth = width / barCount;
      const gap = 2;
      const samplesPerBar = Math.floor(frequencyData.length / barCount);

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Average samples for this bar
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += frequencyData[i * samplesPerBar + j] || 0;
        }
        const avg = sum / samplesPerBar / 255;

        const barHeight = avg * height * 0.9;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Dynamic color based on intensity
        const intensity = avg;
        let barColor = color;
        if (intensity > 0.7) {
          barColor = "#FF003C"; // Red for high intensity
        } else if (intensity > 0.4) {
          barColor = "#B026FF"; // Purple for medium
        }

        // Draw glow effect for high bass
        if (bassEnergy > 0.5 && intensity > 0.5) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = glowColor;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = barColor;
        ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frequencyData, isPlaying, bassEnergy, width, height, barCount, color, glowColor]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full"
        style={{ 
          border: "1px solid #333",
          background: "#0a0a0a",
        }}
      />
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />
    </div>
  );
}
