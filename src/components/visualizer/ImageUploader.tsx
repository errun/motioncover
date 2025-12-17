"use client";

import { useCallback, useRef } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { generateLocalDepthMap } from "@/lib/depthMapGenerator";

export default function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    imageUrl,
    imageName,
    depthMapUrl,
    isGeneratingDepth,
    setImageUrl,
    setImageName,
    setDepthMapUrl,
    setIsGeneratingDepth,
  } = useAudioStore();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Image size must be less than 10MB");
        return;
      }

      // Create object URL for preview
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageName(file.name);

      // Generate depth map automatically
      setIsGeneratingDepth(true);
      try {
        const depthUrl = await generateLocalDepthMap(url);
        setDepthMapUrl(depthUrl);
      } catch (error) {
        console.error("Failed to generate depth map:", error);
      } finally {
        setIsGeneratingDepth(false);
      }
    },
    [setImageUrl, setImageName, setDepthMapUrl, setIsGeneratingDepth]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setImageUrl(null);
    setImageName("Default Cover");
    setDepthMapUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="phonk-heading text-sm text-[var(--phonk-acid)]">
        COVER IMAGE
      </h3>

      {/* Preview */}
      <div
        className="relative aspect-[9/16] w-full max-w-[120px] bg-[var(--phonk-surface)] 
                   border border-[var(--phonk-border)] overflow-hidden cursor-pointer
                   hover:border-[var(--phonk-acid)] transition-colors"
        onClick={handleClick}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--phonk-border)]">
            <svg
              className="w-8 h-8 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs phonk-mono">UPLOAD</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-[var(--phonk-acid)] phonk-mono">
            CHANGE
          </span>
        </div>
      </div>

      {/* File name */}
      <div className="text-xs text-gray-500 phonk-mono truncate max-w-[120px]">
        {imageName}
      </div>

      {/* Depth Map Status */}
      {imageUrl && (
        <div className="text-xs phonk-mono">
          {isGeneratingDepth ? (
            <span className="text-[var(--phonk-purple)]">⟳ GENERATING DEPTH...</span>
          ) : depthMapUrl ? (
            <span className="text-[var(--phonk-acid)]">✓ 3D READY</span>
          ) : (
            <span className="text-gray-600">NO DEPTH MAP</span>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Clear button */}
      {imageUrl && (
        <button
          onClick={handleClear}
          className="text-xs text-[var(--phonk-red)] hover:text-white transition-colors phonk-mono"
        >
          [CLEAR]
        </button>
      )}
    </div>
  );
}

