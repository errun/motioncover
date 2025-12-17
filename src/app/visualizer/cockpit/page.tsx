"use client";

import { Suspense, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import ControlDeck from "@/components/visualizer/ControlDeck";
import ViewportFrame from "@/components/visualizer/ViewportFrame";
import AudioPlayer from "@/components/visualizer/AudioPlayer";
import { DevToolPanel } from "@/features/visualizer/components";

// Dynamically import 3D canvas to avoid SSR issues
const VisualizerCanvas = dynamic(
  () => import("@/components/visualizer/VisualizerCanvas"),
  { ssr: false }
);

export default function CockpitPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col lg:flex-row overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* DevTool Panel (开发环境) */}
      <DevToolPanel />

      {/* Main Viewport Area - Smaller on mobile to leave room for controls */}
      <div className="h-[45vh] lg:h-auto lg:flex-1 flex items-center justify-center p-2 lg:p-8 flex-shrink-0">
        <ViewportFrame>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="phonk-mono text-sm text-gray-500">
                  LOADING RENDERER...
                </div>
              </div>
            }
          >
            <VisualizerCanvas onCanvasReady={handleCanvasReady} />
          </Suspense>
        </ViewportFrame>
      </div>

      {/* Control Deck - Bottom on Mobile (scrollable), Right on Desktop */}
      <div className="flex-1 lg:flex-none lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-[#333333] overflow-y-auto">
        <div className="flex flex-col">
          {/* Audio Player */}
          <AudioPlayer />

          {/* Controls */}
          <ControlDeck canvasRef={canvasRef} />
        </div>
      </div>
    </div>
  );
}

