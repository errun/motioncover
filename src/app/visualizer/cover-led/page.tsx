"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CoverLedVisualizer } from "@/features/cover-led/CoverLedVisualizer";
import { VideoExporter } from "@/features/revert-to-video/VideoExporter";
import { createDefaultEffects } from "@/features/revert-to-video/recipeTypes";
import type { AudioMappingConfig, EffectConfig } from "@/features/revert-to-video/recipeTypes";

type ExportStatus = "idle" | "running" | "done" | "error";

const DEFAULT_EFFECTS = createDefaultEffects();
const DEFAULT_MAPPING: AudioMappingConfig = DEFAULT_EFFECTS.audioMapping || {
  globalGain: 0.75,
  lowBaseGain: 0.65,
  lowDynGain: 8.0,
  midBaseGain: 0.65,
  midDynGain: 7.0,
  highBaseGain: 0.65,
  highDynGain: 6.0,
};

export default function CoverLedPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visualizerRef = useRef<CoverLedVisualizer | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const barLowRef = useRef<HTMLDivElement | null>(null);
  const barMidRef = useRef<HTMLDivElement | null>(null);
  const barHighRef = useRef<HTMLDivElement | null>(null);
  const lowValueRef = useRef<HTMLSpanElement | null>(null);
  const midValueRef = useRef<HTMLSpanElement | null>(null);
  const highValueRef = useRef<HTMLSpanElement | null>(null);

  const exporterRef = useRef<VideoExporter | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [mapping, setMapping] = useState<AudioMappingConfig>(DEFAULT_MAPPING);
  const mappingRef = useRef<AudioMappingConfig>(DEFAULT_MAPPING);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [audioDragOver, setAudioDragOver] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState<string>("");
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportEta, setExportEta] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResolution, setExportResolution] = useState<number>(1080);
  const [exportFps, setExportFps] = useState<number>(30);

  const exportEnabled = Boolean(audioFile && imageDataUrl && exportStatus !== "running");

  const updateMapping = useCallback((key: keyof AudioMappingConfig, value: number) => {
    setMapping((prev) => {
      const next = { ...prev, [key]: value };
      mappingRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    visualizerRef.current = new CoverLedVisualizer(containerRef.current, "/placeholder-cover.svg");
    return () => {
      visualizerRef.current?.dispose();
      visualizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let smoothLow = 0;
    let smoothMid = 0;
    let smoothHigh = 0;
    let smoothLowDelta = 0;
    let smoothMidDelta = 0;
    let smoothHighDelta = 0;
    let prevRawLow = 0;
    let prevRawMid = 0;
    let prevRawHigh = 0;
    let baselineLow = 0;
    let baselineMid = 0;
    let baselineHigh = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const updateBars = (low: number, mid: number, high: number) => {
      if (barLowRef.current) barLowRef.current.style.width = `${low * 100}%`;
      if (barMidRef.current) barMidRef.current.style.width = `${mid * 100}%`;
      if (barHighRef.current) barHighRef.current.style.width = `${high * 100}%`;
      if (lowValueRef.current) lowValueRef.current.textContent = low.toFixed(2);
      if (midValueRef.current) midValueRef.current.textContent = mid.toFixed(2);
      if (highValueRef.current) highValueRef.current.textContent = high.toFixed(2);
    };

    const analyzeAudio = () => {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);
      const binCount = dataArray.length;
      const lowEnd = Math.max(2, Math.floor(binCount * 0.058));
      const midEnd = Math.max(lowEnd + 1, Math.floor(binCount * 0.25));
      const highEnd = Math.floor(binCount * 0.6);

      let lowSum = 0;
      let midSum = 0;
      let highSum = 0;

      for (let i = 1; i < lowEnd; i += 1) lowSum += dataArray[i];
      for (let i = lowEnd; i < midEnd; i += 1) midSum += dataArray[i];
      for (let i = midEnd; i < highEnd; i += 1) highSum += dataArray[i];

      const rawLow = lowSum / (lowEnd - 1) / 255;
      const rawMid = midSum / (midEnd - lowEnd) / 255;
      const rawHigh = highSum / (highEnd - midEnd) / 255;

      baselineLow = lerp(baselineLow, rawLow, 0.01);
      baselineMid = lerp(baselineMid, rawMid, 0.01);
      baselineHigh = lerp(baselineHigh, rawHigh, 0.01);

      const relLow = Math.max(0, (rawLow - baselineLow * 0.5) / (1 - baselineLow * 0.5));
      const relMid = Math.max(0, (rawMid - baselineMid * 0.3) / (1 - baselineMid * 0.3));
      const relHigh = Math.max(0, (rawHigh - baselineHigh * 0.3) / (1 - baselineHigh * 0.3));

      smoothLow = lerp(smoothLow, relLow, 0.25);
      smoothMid = lerp(smoothMid, relMid, 0.2);
      smoothHigh = lerp(smoothHigh, relHigh, 0.2);

      const rawLowDelta = Math.max(0, rawLow - prevRawLow);
      const rawMidDelta = Math.max(0, rawMid - prevRawMid);
      const rawHighDelta = Math.max(0, rawHigh - prevRawHigh);

      prevRawLow = rawLow;
      prevRawMid = rawMid;
      prevRawHigh = rawHigh;

      smoothLowDelta = rawLowDelta > smoothLowDelta
        ? lerp(smoothLowDelta, rawLowDelta, 0.6)
        : lerp(smoothLowDelta, rawLowDelta, 0.15);
      smoothMidDelta = rawMidDelta > smoothMidDelta
        ? lerp(smoothMidDelta, rawMidDelta, 0.5)
        : lerp(smoothMidDelta, rawMidDelta, 0.12);
      smoothHighDelta = rawHighDelta > smoothHighDelta
        ? lerp(smoothHighDelta, rawHighDelta, 0.5)
        : lerp(smoothHighDelta, rawHighDelta, 0.12);

      updateBars(smoothLow, smoothMid, smoothHigh);

      const { globalGain, lowBaseGain, lowDynGain, midBaseGain, midDynGain, highBaseGain, highDynGain } =
        mappingRef.current;

      let lowEffect = smoothLow * lowBaseGain + smoothLowDelta * lowDynGain;
      lowEffect *= globalGain;
      visualizerRef.current?.setLow(Math.min(lowEffect, 3.0));

      let midEffect = smoothMid * midBaseGain + smoothMidDelta * midDynGain;
      midEffect *= globalGain;
      visualizerRef.current?.setMid(Math.min(midEffect, 2.5));

      let highEffect = smoothHigh * highBaseGain + smoothHighDelta * highDynGain;
      highEffect *= globalGain;
      visualizerRef.current?.setHigh(Math.min(highEffect, 3.0));
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const audioPlayer = audioPlayerRef.current;
      if (!audioPlayer || audioPlayer.paused) return;
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyzeAudio();
    };

    loop();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const initAudioAnalyser = useCallback(() => {
    if (audioContextRef.current || !audioPlayerRef.current) return;
    const AudioContextCtor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const audioSource = audioContext.createMediaElementSource(audioPlayerRef.current);
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    audioSourceRef.current = audioSource;
  }, []);

  const handleAudioChange = useCallback(
    (file: File) => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.style.display = "block";
      }
      setAudioFile(file);
      initAudioAnalyser();
    },
    [initAudioAnalyser]
  );

  const handleImageChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImageDataUrl(result);
        visualizerRef.current?.updateImage(result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExport = useCallback(async () => {
    if (!audioFile || !imageDataUrl) {
      setExportError("Upload audio and cover first.");
      return;
    }

    setExportStatus("running");
    setExportError(null);
    setExportProgress(0);
    setExportMessage("Starting...");
    setExportEta(null);
    setDownloadUrl(null);

    const effects: EffectConfig = {
      ...DEFAULT_EFFECTS,
      audioMapping: mappingRef.current,
    };

    const exporter = new VideoExporter({
      fps: exportFps,
      width: exportResolution,
      height: exportResolution,
    });
    exporterRef.current = exporter;

    try {
      const result = await exporter.export({
        audioFile,
        imageFile: imageDataUrl,
        effects,
        onProgress: (p) => {
          setExportProgress(p.progress);
          setExportMessage(p.message);
          setExportEta(p.eta ?? null);
        },
      });

      setDownloadUrl(result.url);
      setExportStatus("done");
    } catch (error) {
      setExportStatus("error");
      setExportError(error instanceof Error ? error.message : "Export failed");
    }
  }, [audioFile, imageDataUrl, exportFps, exportResolution]);

  const handleCancel = useCallback(() => {
    exporterRef.current?.cancel();
    setExportStatus("idle");
    setExportMessage("");
    setExportProgress(0);
    setExportEta(null);
    setDownloadUrl(null);
  }, []);

  const globalGainLabel = useMemo(() => mapping.globalGain.toFixed(2), [mapping.globalGain]);
  const lowBaseLabel = useMemo(() => mapping.lowBaseGain.toFixed(2), [mapping.lowBaseGain]);
  const lowDynLabel = useMemo(() => mapping.lowDynGain.toFixed(2), [mapping.lowDynGain]);
  const midBaseLabel = useMemo(() => mapping.midBaseGain.toFixed(2), [mapping.midBaseGain]);
  const midDynLabel = useMemo(() => mapping.midDynGain.toFixed(2), [mapping.midDynGain]);
  const highBaseLabel = useMemo(() => mapping.highBaseGain.toFixed(2), [mapping.highBaseGain]);
  const highDynLabel = useMemo(() => mapping.highDynGain.toFixed(2), [mapping.highDynGain]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">MusicLed</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Tune audio mapping and export a rendered cover video via the local render server.
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
        >
          Back to Home
        </Link>
      </header>

      <main className="p-6 flex flex-col lg:flex-row gap-6">
        <section className="w-full lg:w-[520px]">
          <div
            ref={containerRef}
            className="aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          />
          <p className="text-xs text-zinc-500 mt-3">
            Upload audio and cover image to drive the preview. Export uses the built-in renderer
            (FFmpeg must be available on this machine).
          </p>
        </section>

        <section className="flex-1 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">Global Gain</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Overall intensity</span>
                <span className="text-zinc-200">{globalGainLabel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={mapping.globalGain}
                onChange={(event) => updateMapping("globalGain", parseFloat(event.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200">Low (breath/brightness)</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Base gain</span>
                  <span className="text-zinc-200">{lowBaseLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={mapping.lowBaseGain}
                  onChange={(event) => updateMapping("lowBaseGain", parseFloat(event.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Dynamic gain</span>
                  <span className="text-zinc-200">{lowDynLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={mapping.lowDynGain}
                  onChange={(event) => updateMapping("lowDynGain", parseFloat(event.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200">Mid (scale/saturation)</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Base gain</span>
                  <span className="text-zinc-200">{midBaseLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={mapping.midBaseGain}
                  onChange={(event) => updateMapping("midBaseGain", parseFloat(event.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Dynamic gain</span>
                  <span className="text-zinc-200">{midDynLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={mapping.midDynGain}
                  onChange={(event) => updateMapping("midDynGain", parseFloat(event.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200">High (chroma)</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Base gain</span>
                  <span className="text-zinc-200">{highBaseLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={mapping.highBaseGain}
                  onChange={(event) => updateMapping("highBaseGain", parseFloat(event.target.value))}
                  className="w-full accent-pink-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Dynamic gain</span>
                  <span className="text-zinc-200">{highDynLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={mapping.highDynGain}
                  onChange={(event) => updateMapping("highDynGain", parseFloat(event.target.value))}
                  className="w-full accent-pink-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Audio Control</h2>
            <div
              className={`border border-dashed rounded-lg p-4 text-sm text-zinc-400 transition ${
                audioDragOver ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-zinc-700"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setAudioDragOver(true);
              }}
              onDragLeave={() => setAudioDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setAudioDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file && file.type.startsWith("audio/")) {
                  handleAudioChange(file);
                }
              }}
            >
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && file.type.startsWith("audio/")) {
                      handleAudioChange(file);
                    }
                  }}
                />
                Click or drop an audio file
              </label>
            </div>
            <audio
              ref={audioPlayerRef}
              controls
              onPlay={() => {
                if (audioContextRef.current?.state === "suspended") {
                  audioContextRef.current.resume();
                }
              }}
              style={{ display: "none" }}
              className="w-full"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Spectrum Monitor</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-12 text-zinc-400">Low</span>
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div ref={barLowRef} className="h-full bg-gradient-to-r from-rose-500 to-pink-500 w-0" />
                </div>
                <span ref={lowValueRef} className="text-zinc-300 w-12 text-right">0.00</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-zinc-400">Mid</span>
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div ref={barMidRef} className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 w-0" />
                </div>
                <span ref={midValueRef} className="text-zinc-300 w-12 text-right">0.00</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-zinc-400">High</span>
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div ref={barHighRef} className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 w-0" />
                </div>
                <span ref={highValueRef} className="text-zinc-300 w-12 text-right">0.00</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Cover Image</h2>
            <div
              className={`border border-dashed rounded-lg p-4 text-sm text-zinc-400 transition ${
                imageDragOver ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-zinc-700"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setImageDragOver(true);
              }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setImageDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  handleImageChange(file);
                }
              }}
            >
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      handleImageChange(file);
                    }
                  }}
                />
                Click or drop a cover image
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">Export Video</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-zinc-400">
                Resolution
                <select
                  value={exportResolution}
                  onChange={(event) => setExportResolution(parseInt(event.target.value, 10))}
                  className="mt-2 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                >
                  <option value={720}>720p (720x720)</option>
                  <option value={1080}>1080p (1080x1080)</option>
                </select>
              </label>
              <label className="text-sm text-zinc-400">
                FPS
                <select
                  value={exportFps}
                  onChange={(event) => setExportFps(parseInt(event.target.value, 10))}
                  className="mt-2 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!exportEnabled}
                onClick={handleExport}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  exportEnabled
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                Start Export
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  exportStatus === "running" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500"
                }`}
                disabled={exportStatus !== "running"}
              >
                Cancel
              </button>
            </div>

            {exportStatus === "running" && (
              <div className="space-y-2">
                <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-500"
                    style={{ width: `${exportProgress * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{exportMessage || "Working..."}</span>
                  <span>
                    {Math.round(exportProgress * 100)}%
                    {exportEta !== null ? ` (ETA ${exportEta}s)` : ""}
                  </span>
                </div>
              </div>
            )}

            {exportStatus === "done" && downloadUrl && (
              <div className="space-y-2">
                <p className="text-sm text-emerald-400 font-semibold">Export complete.</p>
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Download Video
                </a>
              </div>
            )}

            {exportStatus === "error" && exportError && (
              <p className="text-sm text-rose-400">Export failed: {exportError}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
