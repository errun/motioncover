"use client";

/**
 * Canvas 视频预览组件
 * @module features/canvas-downloader/components/CanvasPreview
 */

interface CanvasPreviewProps {
  canvasUrl?: string;
  canvasNote?: string | null;
}

export function CanvasPreview({ canvasUrl, canvasNote }: CanvasPreviewProps) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Canvas Preview</h2>
      <div className="aspect-[9/16] max-w-xs md:max-w-xs lg:max-w-sm mx-auto bg-[#282828] rounded-lg overflow-hidden relative">
        {canvasUrl ? (
          <video
            src={canvasUrl}
            loop
            controls
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
            <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p>Canvas not available for this track</p>
            <p className="text-sm mt-2">{canvasNote || "Not all tracks have a Canvas video"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

