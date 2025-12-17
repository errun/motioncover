"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GarageEntryPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    // CRT off effect, then navigate
    setTimeout(() => {
      router.push("/visualizer/cockpit");
    }, 500);
  };

  // Play static sound on hover (optional - can add audio later)
  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center overflow-hidden ${
        isExiting ? "crt-off" : ""
      }`}
      style={{ background: "#050505" }}
    >
      {/* Background Video - Drift Footage */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
          style={{ filter: "grayscale(100%) contrast(1.2)" }}
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-27611-large.mp4"
            type="video/mp4"
          />
        </video>
        {/* Grain Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: 0.15,
            mixBlendMode: "overlay",
          }}
        />
        {/* Scanlines */}
        <div className="absolute inset-0 scanlines" />
      </div>

      {/* Center Content */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <h1
          className="phonk-heading text-5xl md:text-7xl lg:text-8xl text-white mb-8"
          style={{ textShadow: "0 0 30px rgba(57, 255, 20, 0.5)" }}
        >
          MOTION<span style={{ color: "#39FF14" }}>COVER</span>
        </h1>

        {/* Subtitle */}
        <p className="phonk-mono text-sm md:text-base text-gray-500 mb-12 tracking-widest">
          AUDIO REACTIVE VISUALIZER // PHONK EDITION
        </p>

        {/* Enter Button */}
        <button
          onClick={handleEnter}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`phonk-btn text-xl md:text-2xl px-12 py-6 ${
            isHovering ? "glow-acid glitch-effect" : ""
          }`}
        >
          [ ENTER SYSTEM ]
        </button>

        {/* System Status */}
        <div className="mt-12 phonk-mono text-xs text-gray-600">
          <p>
            STATUS:{" "}
            <span style={{ color: "#39FF14" }}>ONLINE</span>
          </p>
          <p className="mt-1">
            AUDIO ENGINE: <span style={{ color: "#B026FF" }}>READY</span>
          </p>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 phonk-mono text-xs text-gray-600">
        <span className="rec-blink" style={{ color: "#FF003C" }}>
          ●
        </span>{" "}
        SYS_INIT
      </div>
      <div className="absolute top-4 right-4 phonk-mono text-xs text-gray-600">
        V3.0.0
      </div>
      <div className="absolute bottom-4 left-4 phonk-mono text-xs text-gray-600">
        MOTIONCOVER.APP
      </div>
      <div className="absolute bottom-4 right-4 phonk-mono text-xs text-gray-600">
        2025
      </div>
    </div>
  );
}

