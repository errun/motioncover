"use client";

/**
 * 加载动画组件
 * @module features/canvas-downloader/components/LoadingSpinner
 */

export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
    </div>
  );
}

