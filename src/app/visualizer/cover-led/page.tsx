"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CoverLedVisualizer } from "@/features/cover-led/CoverLedVisualizer";
import { VideoExporter } from "@/features/revert-to-video/VideoExporter";
import { createDefaultEffects } from "@/features/revert-to-video/recipeTypes";
import type { AudioMappingConfig, EffectConfig } from "@/features/revert-to-video/recipeTypes";
import { extractTrackId } from "@/features/spotify-core";

type ExportStatus = "idle" | "running" | "done" | "error";

const DEFAULT_EFFECTS = createDefaultEffects();
const SPOTIFY_MIN_SECONDS = 3;
const SPOTIFY_MAX_SECONDS = 8;
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
  const previewTimeoutRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformPeaksRef = useRef<Float32Array | null>(null);

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
  const [exportPreset, setExportPreset] = useState<"custom" | "spotify">("custom");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [spotifyStartSec, setSpotifyStartSec] = useState(0);
  const [spotifyEndSec, setSpotifyEndSec] = useState(SPOTIFY_MAX_SECONDS);
  const [previewing, setPreviewing] = useState(false);
  const [editingSegment, setEditingSegment] = useState(false);
  const [waveformZoom, setWaveformZoom] = useState(1);

  const [spotifyLink, setSpotifyLink] = useState<string>("");
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyTrack, setSpotifyTrack] = useState<{
    name: string;
    artists: string[];
    albumArt: string | null;
    previewUrl: string | null;
  } | null>(null);
  const lastSpotifyLinkRef = useRef<string>("");

  const exportEnabled = Boolean(audioFile && imageDataUrl && exportStatus !== "running");
  const exportSettings = useMemo(() => {
    if (exportPreset === "spotify") {
      return { width: 720, height: 1280, fps: 24 };
    }
    return { width: exportResolution, height: exportResolution, fps: exportFps };
  }, [exportPreset, exportResolution, exportFps]);

  const spotifyRangeMax = useMemo(() => {
    if (audioDuration && Number.isFinite(audioDuration)) {
      return audioDuration;
    }
    return SPOTIFY_MAX_SECONDS;
  }, [audioDuration]);

  const spotifyMinLength = useMemo(
    () => Math.min(SPOTIFY_MIN_SECONDS, spotifyRangeMax),
    [spotifyRangeMax]
  );
  const spotifyMaxLength = useMemo(
    () => Math.min(SPOTIFY_MAX_SECONDS, spotifyRangeMax),
    [spotifyRangeMax]
  );
  const spotifyStartPercent = spotifyRangeMax > 0 ? (spotifyStartSec / spotifyRangeMax) * 100 : 0;
  const spotifyEndPercent = spotifyRangeMax > 0 ? (spotifyEndSec / spotifyRangeMax) * 100 : 0;
  const spotifySegmentDuration = Math.max(0, spotifyEndSec - spotifyStartSec);

  useEffect(() => {
    if (exportPreset !== "spotify") return;
    const defaultEnd = Math.min(spotifyRangeMax, SPOTIFY_MAX_SECONDS);
    setSpotifyStartSec(0);
    setSpotifyEndSec(defaultEnd);
  }, [exportPreset, spotifyRangeMax]);

  useEffect(() => {
    setWaveformZoom(1);
  }, [audioFile]);

  const applySpotifyStart = useCallback(
    (nextStart: number) => {
      const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
      let start = clamp(nextStart, 0, spotifyRangeMax);
      let end = spotifyEndSec;

      if (end < start) {
        end = start;
      }

      if (end - start < spotifyMinLength) {
        end = start + spotifyMinLength;
      }
      if (end - start > spotifyMaxLength) {
        end = start + spotifyMaxLength;
      }

      if (end > spotifyRangeMax) {
        end = spotifyRangeMax;
        if (end - start < spotifyMinLength) {
          start = Math.max(0, end - spotifyMinLength);
        }
        if (end - start > spotifyMaxLength) {
          start = Math.max(0, end - spotifyMaxLength);
        }
      }

      setSpotifyStartSec(start);
      setSpotifyEndSec(end);
    },
    [spotifyRangeMax, spotifyMinLength, spotifyMaxLength, spotifyEndSec]
  );

  const applySpotifyEnd = useCallback(
    (nextEnd: number) => {
      const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
      let end = clamp(nextEnd, 0, spotifyRangeMax);
      let start = spotifyStartSec;

      if (start > end) {
        start = end;
      }

      if (end - start < spotifyMinLength) {
        start = end - spotifyMinLength;
      }
      if (end - start > spotifyMaxLength) {
        start = end - spotifyMaxLength;
      }

      if (start < 0) {
        start = 0;
        if (end - start < spotifyMinLength) {
          end = Math.min(spotifyRangeMax, start + spotifyMinLength);
        }
        if (end - start > spotifyMaxLength) {
          end = Math.min(spotifyRangeMax, start + spotifyMaxLength);
        }
      }

      setSpotifyStartSec(start);
      setSpotifyEndSec(end);
    },
    [spotifyRangeMax, spotifyMinLength, spotifyMaxLength, spotifyStartSec]
  );

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
    visualizerRef.current?.setFitMode(exportPreset === "spotify" ? "letterbox" : "cover");
  }, [exportPreset]);

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
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
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

  useEffect(() => {
    let active = true;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 480;
      const displayHeight = canvas.clientHeight || 96;
      canvas.width = Math.max(1, Math.floor(displayWidth * ratio));
      canvas.height = Math.max(1, Math.floor(displayHeight * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width: displayWidth, height: displayHeight };
    };

    const drawPlaceholder = (width: number, height: number) => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    const { width, height } = setupCanvas();
    drawPlaceholder(width, height);

    if (!audioFile) return;

    let audioContext: AudioContext | null = null;

    const render = async () => {
      try {
        const buffer = await audioFile.arrayBuffer();
        if (!active) return;
        const AudioContextCtor =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        audioContext = new AudioContextCtor();
        const decoded = await audioContext.decodeAudioData(buffer.slice(0));
        if (!active) return;

        const channelData = decoded.getChannelData(0);
        const peaksTarget = Math.min(12000, Math.max(1200, Math.floor(decoded.duration * 240)));
        const samples = Math.max(1, peaksTarget);
        const blockSize = Math.max(1, Math.floor(channelData.length / samples));
        const peaks = new Float32Array(samples);

        for (let i = 0; i < samples; i += 1) {
          const start = i * blockSize;
          const end = Math.min(channelData.length, start + blockSize);
          let peak = 0;
          for (let j = start; j < end; j += 1) {
            const value = Math.abs(channelData[j]);
            if (value > peak) peak = value;
          }
          peaks[i] = peak;
        }

        waveformPeaksRef.current = peaks;
      } catch (error) {
        const { width: drawWidth, height: drawHeight } = setupCanvas();
        drawPlaceholder(drawWidth, drawHeight);
        console.error("[MusicLed] waveform render failed", error);
      } finally {
        if (audioContext) {
          audioContext.close();
        }
      }
    };

    void render();

    return () => {
      active = false;
      waveformPeaksRef.current = null;
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioFile]);

  useEffect(() => {
    let rafId: number | null = null;
    const canvas = waveformCanvasRef.current;
    const player = audioPlayerRef.current;
    if (!canvas || !player) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const peaks = waveformPeaksRef.current;
      if (!peaks) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 480;
      const height = canvas.clientHeight || 96;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const duration = player.duration || 0;
      const progress = duration > 0 ? Math.min(1, Math.max(0, player.currentTime / duration)) : 0;
      const total = peaks.length;
      const zoom = Math.max(1, waveformZoom);
      let windowSize = Math.max(60, Math.floor(total / zoom));
      if (windowSize > total) windowSize = total;
      const halfWindow = windowSize / 2;
      const center = progress * total;
      let start = Math.max(0, Math.min(total - windowSize, center - halfWindow));
      let end = Math.min(total, start + windowSize);

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      const mid = height / 2;
      ctx.beginPath();
      for (let i = 0; i < windowSize; i += 1) {
        const index = Math.min(total - 1, Math.floor(start + i));
        const x = (i / Math.max(1, windowSize - 1)) * width;
        const amp = peaks[index] * height * 0.45;
        ctx.moveTo(x, mid - amp);
        ctx.lineTo(x, mid + amp);
      }
      ctx.stroke();

      const playX =
        windowSize > 0 ? ((center - start) / windowSize) * width : progress * width;
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [audioFile, waveformZoom]);

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

  const loadImageFromUrl = useCallback(
    async (url: string) => {
      const response = await fetch(`/api/musicled/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error("Failed to download cover image");
      }
      const blob = await response.blob();
      const file = new File([blob], "spotify-cover.jpg", { type: blob.type || "image/jpeg" });
      handleImageChange(file);
    },
    [handleImageChange]
  );

  const loadAudioFromUrl = useCallback(
    async (url: string) => {
      const response = await fetch(`/api/musicled/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error("Failed to download preview audio");
      }
      const blob = await response.blob();
      const file = new File([blob], "spotify-preview.mp3", { type: blob.type || "audio/mpeg" });
      handleAudioChange(file);
    },
    [handleAudioChange]
  );

  const handleSpotifyImport = useCallback(async (linkOverride?: string) => {
    const linkSource = typeof linkOverride === "string" ? linkOverride : spotifyLink;
    const link = linkSource.trim();
    if (!link) {
      setSpotifyError("Paste a Spotify track URL first.");
      return;
    }
    lastSpotifyLinkRef.current = link;
    setSpotifyLoading(true);
    setSpotifyError(null);
    setSpotifyTrack(null);

    try {
      const response = await fetch(`/api/musicled/spotify?link=${encodeURIComponent(link)}`);
      if (!response.ok) {
        throw new Error("Spotify request failed.");
      }
      const data = await response.json() as {
        name: string;
        artists: string[];
        albumArt: string | null;
        previewUrl: string | null;
      };

      setSpotifyTrack(data);
      if (data.albumArt) {
        await loadImageFromUrl(data.albumArt);
      }
      if (data.previewUrl) {
        await loadAudioFromUrl(data.previewUrl);
      } else {
        setSpotifyError("Spotify preview audio is not available for this track.");
      }

      setExportPreset("spotify");
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : "Spotify import failed.");
    } finally {
      setSpotifyLoading(false);
    }
  }, [spotifyLink, loadAudioFromUrl, loadImageFromUrl]);

  useEffect(() => {
    if (spotifyLoading) return;
    const trimmed = spotifyLink.trim();
    if (!trimmed) return;
    if (trimmed === lastSpotifyLinkRef.current) return;
    if (!extractTrackId(trimmed)) return;

    const timer = window.setTimeout(() => {
      if (spotifyLoading) return;
      if (trimmed === lastSpotifyLinkRef.current) return;
      lastSpotifyLinkRef.current = trimmed;
      handleSpotifyImport(trimmed);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [spotifyLink, spotifyLoading, handleSpotifyImport]);

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

    const { width, height, fps } = exportSettings;
    const segmentStartSec = exportPreset === "spotify" ? spotifyStartSec : undefined;
    const segmentDurationSec =
      exportPreset === "spotify" ? Math.max(0, spotifyEndSec - spotifyStartSec) : undefined;

    const exporter = new VideoExporter({
      fps,
      width,
      height,
    });
    exporterRef.current = exporter;

    try {
      const result = await exporter.export({
        audioFile,
        imageFile: imageDataUrl,
        effects,
        segmentStartSec,
        segmentDurationSec,
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
  }, [audioFile, imageDataUrl, exportSettings, exportPreset, spotifyStartSec, spotifyEndSec]);

  const handleCancel = useCallback(() => {
    exporterRef.current?.cancel();
    setExportStatus("idle");
    setExportMessage("");
    setExportProgress(0);
    setExportEta(null);
    setDownloadUrl(null);
  }, []);

  const handlePreview = useCallback(() => {
    const player = audioPlayerRef.current;
    if (!player) return;

    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    let start = 0;
    let duration = Math.min(SPOTIFY_MAX_SECONDS, player.duration || SPOTIFY_MAX_SECONDS);

    if (exportPreset === "spotify") {
      start = spotifyStartSec;
      duration = Math.max(0.1, spotifyEndSec - spotifyStartSec);
    }

    player.currentTime = Math.min(start, Math.max(0, (player.duration || start) - 0.1));
    void player.play().catch(() => {});
    setPreviewing(true);

    previewTimeoutRef.current = window.setTimeout(() => {
      player.pause();
      setPreviewing(false);
      previewTimeoutRef.current = null;
    }, duration * 1000);
  }, [exportPreset, spotifyStartSec, spotifyEndSec]);

  const globalGainLabel = useMemo(() => mapping.globalGain.toFixed(2), [mapping.globalGain]);
  const lowBaseLabel = useMemo(() => mapping.lowBaseGain.toFixed(2), [mapping.lowBaseGain]);
  const lowDynLabel = useMemo(() => mapping.lowDynGain.toFixed(2), [mapping.lowDynGain]);
  const midBaseLabel = useMemo(() => mapping.midBaseGain.toFixed(2), [mapping.midBaseGain]);
  const midDynLabel = useMemo(() => mapping.midDynGain.toFixed(2), [mapping.midDynGain]);
  const highBaseLabel = useMemo(() => mapping.highBaseGain.toFixed(2), [mapping.highBaseGain]);
  const highDynLabel = useMemo(() => mapping.highDynGain.toFixed(2), [mapping.highDynGain]);
  const waveformLabel = useMemo(() => {
    if (!audioFile) return "No audio loaded";
    if (audioDuration && Number.isFinite(audioDuration)) return `${audioDuration.toFixed(1)}s`;
    return "Loaded";
  }, [audioFile, audioDuration]);

  const getWaveformRange = useCallback(
    (clientX: number) => {
      const canvas = waveformCanvasRef.current;
      const player = audioPlayerRef.current;
      const peaks = waveformPeaksRef.current;
      if (!canvas || !player || !peaks || !player.duration) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const total = peaks.length;
      const zoom = Math.max(1, waveformZoom);
      let windowSize = Math.max(60, Math.floor(total / zoom));
      if (windowSize > total) windowSize = total;
      const halfWindow = windowSize / 2;
      const progress = Math.min(1, Math.max(0, player.currentTime / player.duration));
      const center = progress * total;
      const start = Math.max(0, Math.min(total - windowSize, center - halfWindow));
      const targetIndex = start + ratio * windowSize;
      const targetProgress = Math.min(1, Math.max(0, targetIndex / total));
      return targetProgress * player.duration;
    },
    [waveformZoom]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">MusicLed</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Import a Spotify track, tune audio mapping, and export a Canvas-ready video.
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
            className={`w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
              exportPreset === "spotify" ? "aspect-[9/16]" : "aspect-square"
            }`}
          />
          <p className="text-xs text-zinc-500 mt-3">
            Upload audio and cover image to drive the preview. Export uses the built-in renderer
            (FFmpeg must be available on this machine).
          </p>
        </section>

        <section className="flex-1 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Spotify Import</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={spotifyLink}
                onChange={(event) => setSpotifyLink(event.target.value)}
                placeholder="Paste Spotify track URL"
                className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={handleSpotifyImport}
                disabled={spotifyLoading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  spotifyLoading ? "bg-zinc-800 text-zinc-500" : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {spotifyLoading ? "Loading..." : "Fetch"}
              </button>
            </div>
            {spotifyTrack && (
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-200 font-semibold">{spotifyTrack.name}</span>
                {" "}· {spotifyTrack.artists.join(", ")}
              </div>
            )}
            {spotifyError && <p className="text-xs text-rose-400">{spotifyError}</p>}
          </div>

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
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Waveform</span>
                <span>{waveformLabel}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
                <canvas
                  ref={waveformCanvasRef}
                  className="w-full h-24"
                  onPointerDown={(event) => {
                    const player = audioPlayerRef.current;
                    if (!player) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const targetTime = getWaveformRange(event.clientX);
                    if (typeof targetTime === "number") {
                      player.currentTime = targetTime;
                    }
                    player.play().catch(() => {});
                  }}
                  onPointerMove={(event) => {
                    if (!(event.buttons & 1)) return;
                    const player = audioPlayerRef.current;
                    if (!player) return;
                    const targetTime = getWaveformRange(event.clientX);
                    if (typeof targetTime === "number") {
                      player.currentTime = targetTime;
                    }
                  }}
                  onPointerUp={(event) => {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={(event) => {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-12">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.25}
                  value={waveformZoom}
                  onChange={(event) => setWaveformZoom(parseFloat(event.target.value))}
                  className="flex-1 accent-sky-400"
                />
                <span className="w-12 text-right">{waveformZoom.toFixed(2)}x</span>
              </div>
              {!audioFile && (
                <p className="text-xs text-zinc-500">Upload audio to preview the waveform.</p>
              )}
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
              onLoadedMetadata={() => {
                if (audioPlayerRef.current?.duration) {
                  setAudioDuration(audioPlayerRef.current.duration);
                }
              }}
              onPause={() => {
                if (previewTimeoutRef.current) {
                  window.clearTimeout(previewTimeoutRef.current);
                  previewTimeoutRef.current = null;
                }
                setPreviewing(false);
              }}
              onEnded={() => {
                if (previewTimeoutRef.current) {
                  window.clearTimeout(previewTimeoutRef.current);
                  previewTimeoutRef.current = null;
                }
                setPreviewing(false);
              }}
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
            <h2 className="text-sm font-semibold text-zinc-200">Cover Image</h2>
            {exportPreset === "spotify" && (
              <p className="text-xs text-amber-300/90">
                Spotify Canvas requires a 9:16 portrait cover (720x1280). Upload a matching image
                to avoid letterboxing.
              </p>
            )}
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
            <label className="text-sm text-zinc-400">
              Preset
              <select
                value={exportPreset}
                onChange={(event) => setExportPreset(event.target.value as "custom" | "spotify")}
                className="mt-2 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
              >
                <option value="custom">Custom (square)</option>
                <option value="spotify">Spotify Canvas (720x1280 @ 24 fps, 8s)</option>
              </select>
            </label>
            {exportPreset !== "spotify" && (
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
            )}
            {exportPreset === "spotify" && (
              <p className="text-xs text-zinc-500">
                Canvas preset uses 720x1280 @ 24 fps, capped to 8 seconds (192 frames). Use a
                9:16 portrait image to prevent extra padding.
              </p>
            )}
            {exportPreset === "spotify" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Segment (3-8s)</span>
                  {editingSegment ? (
                    <div
                      className="flex items-center gap-1"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setEditingSegment(false);
                        }
                      }}
                    >
                      <input
                        type="number"
                        min={0}
                        max={spotifyRangeMax}
                        step={0.1}
                        value={Number.isFinite(spotifyStartSec) ? spotifyStartSec : 0}
                        onChange={(event) => {
                          const raw = parseFloat(event.target.value);
                          if (Number.isNaN(raw)) return;
                          applySpotifyStart(raw);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape") {
                            setEditingSegment(false);
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-14 rounded-md bg-zinc-900 border border-zinc-700 px-1 py-0.5 text-right text-xs text-white"
                      />
                      <span className="text-zinc-500">s -</span>
                      <input
                        type="number"
                        min={0}
                        max={spotifyRangeMax}
                        step={0.1}
                        value={Number.isFinite(spotifyEndSec) ? spotifyEndSec : 0}
                        onChange={(event) => {
                          const raw = parseFloat(event.target.value);
                          if (Number.isNaN(raw)) return;
                          applySpotifyEnd(raw);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape") {
                            setEditingSegment(false);
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-14 rounded-md bg-zinc-900 border border-zinc-700 px-1 py-0.5 text-right text-xs text-white"
                      />
                      <span className="text-zinc-500">s</span>
                      <span className="text-zinc-500">({spotifySegmentDuration.toFixed(1)}s)</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingSegment(true)}
                      className="text-zinc-400 hover:text-zinc-200 transition"
                    >
                      {spotifyStartSec.toFixed(1)}s - {spotifyEndSec.toFixed(1)}s (
                      {spotifySegmentDuration.toFixed(1)}s)
                    </button>
                  )}
                </div>
                <div className="relative h-8">
                  <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-800" />
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-emerald-500/60"
                    style={{ left: `${spotifyStartPercent}%`, right: `${100 - spotifyEndPercent}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={spotifyRangeMax}
                    step={0.1}
                    value={spotifyStartSec}
                    onChange={(event) => {
                      const raw = parseFloat(event.target.value);
                      applySpotifyStart(raw);
                    }}
                    className="range-input absolute inset-0 w-full accent-emerald-400 bg-transparent"
                  />
                  <input
                    type="range"
                    min={0}
                    max={spotifyRangeMax}
                    step={0.1}
                    value={spotifyEndSec}
                    onChange={(event) => {
                      const raw = parseFloat(event.target.value);
                      applySpotifyEnd(raw);
                    }}
                    className="range-input absolute inset-0 w-full accent-emerald-400 bg-transparent"
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>0s</span>
                  <span>{spotifyRangeMax.toFixed(1)}s</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!audioFile || !imageDataUrl || exportStatus === "running"}
                onClick={handlePreview}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  !audioFile || !imageDataUrl || exportStatus === "running"
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                {previewing ? "Previewing..." : "Preview"}
              </button>
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

      <style jsx>{`
        .range-input {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }
        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #34d399;
          border: 2px solid #0f172a;
          pointer-events: auto;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.15);
        }
        .range-input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #34d399;
          border: 2px solid #0f172a;
          pointer-events: auto;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.15);
        }
        .range-input::-webkit-slider-runnable-track {
          height: 2px;
          background: transparent;
        }
        .range-input::-moz-range-track {
          height: 2px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
