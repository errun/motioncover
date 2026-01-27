"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CoverLedVisualizer } from "@/features/cover-led/CoverLedVisualizer";
import { VideoExporter } from "@/features/revert-to-video/VideoExporter";
import { createDefaultEffects } from "@/features/revert-to-video/recipeTypes";
import type { AudioMappingConfig, EffectConfig } from "@/features/revert-to-video/recipeTypes";
import { extractTrackId } from "@/features/spotify-core";

type ExportStatus = "idle" | "running" | "done" | "error";
type QueueJobStatus = "pending" | "rendering" | "completed" | "failed" | "cancelled";
type QueueJob = {
  id: string;
  status: QueueJobStatus;
  progress: number;
  eta?: number;
  position?: number;
  createdAt?: number;
  completedAt?: number;
  outputPath?: string;
  error?: string | null;
};

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
const PREVIEW_GAIN = 2.5;
const MAPPING_KEYS: Array<keyof AudioMappingConfig> = [
  "globalGain",
  "lowBaseGain",
  "lowDynGain",
  "midBaseGain",
  "midDynGain",
  "highBaseGain",
  "highDynGain",
];

type RhythmPreset = {
  id: string;
  label: string;
  description: string;
  mapping: AudioMappingConfig;
};

export default function CoverLedPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visualizerRef = useRef<CoverLedVisualizer | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformPeaksRef = useRef<Float32Array | null>(null);
  const bpmModeRef = useRef<"beat" | "bpm">("beat");
  const bpmValueRef = useRef<number | null>(null);
  const imageLoadIdRef = useRef(0);

  const barLowRef = useRef<HTMLDivElement | null>(null);
  const barMidRef = useRef<HTMLDivElement | null>(null);
  const barHighRef = useRef<HTMLDivElement | null>(null);
  const lowValueRef = useRef<HTMLSpanElement | null>(null);
  const midValueRef = useRef<HTMLSpanElement | null>(null);
  const highValueRef = useRef<HTMLSpanElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const audioUrlRef = useRef<string | null>(null);

  const [mapping, setMapping] = useState<AudioMappingConfig>(DEFAULT_MAPPING);
  const mappingRef = useRef<AudioMappingConfig>(DEFAULT_MAPPING);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [audioDragOver, setAudioDragOver] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState<string>("");
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportEta, setExportEta] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [queueStats, setQueueStats] = useState<{ pending: number; active: number; completed: number } | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [enqueueing, setEnqueueing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [myJobIds, setMyJobIds] = useState<string[]>([]);
  const [myJobTitles, setMyJobTitles] = useState<Record<string, string>>({});
  const [exportResolution, setExportResolution] = useState<number>(1080);
  const [exportFps, setExportFps] = useState<number>(30);
  const [exportPreset, setExportPreset] = useState<"custom" | "spotify">("custom");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [spotifyStartSec, setSpotifyStartSec] = useState(0);
  const [spotifyEndSec, setSpotifyEndSec] = useState(SPOTIFY_MAX_SECONDS);
  const [previewing, setPreviewing] = useState(false);
  const [editingSegment, setEditingSegment] = useState(false);
  const [waveformZoom, setWaveformZoom] = useState(1);
  const [bpmAuto, setBpmAuto] = useState<number | null>(null);
  const [bpmValue, setBpmValue] = useState<number | null>(null);
  const [bpmSource, setBpmSource] = useState<"auto" | "manual">("auto");
  const [bpmMode, setBpmMode] = useState<"beat" | "bpm">("beat");
  const [bpmAnalyzing, setBpmAnalyzing] = useState(false);
  const [bpmInput, setBpmInput] = useState("");
  const [metronomeBeat, setMetronomeBeat] = useState(0);
  const [metronomeTick, setMetronomeTick] = useState(0);
  const [metronomeSubBeat, setMetronomeSubBeat] = useState(0);
  const [metronomeOffset, setMetronomeOffset] = useState(0);
  const [metronomeOffsetInput, setMetronomeOffsetInput] = useState("0.00");

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
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const exportEnabled = Boolean(audioFile && imageDataUrl && !enqueueing);
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
  const spotifyCoverOk = useMemo(() => {
    if (!imageSize) return false;
    const ratio = imageSize.width / imageSize.height;
    if (!Number.isFinite(ratio)) return false;
    return Math.abs(ratio - 9 / 16) <= 0.01;
  }, [imageSize]);
  const bpmExportValue = useMemo(() => {
    if (bpmSource === "manual" && bpmValue) return bpmValue;
    if (bpmSource === "auto" && bpmAuto) return bpmAuto;
    return 120;
  }, [bpmSource, bpmValue, bpmAuto]);
  const bpmLoopInfo = useMemo(() => {
    if (bpmMode !== "bpm") return null;
    const bpm = Math.max(1, bpmExportValue);
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    let bars = Math.floor(SPOTIFY_MAX_SECONDS / barDuration);
    if (bars < 1) bars = 1;
    let duration = bars * barDuration;
    if (duration < SPOTIFY_MIN_SECONDS) {
      bars = Math.ceil(SPOTIFY_MIN_SECONDS / barDuration);
      duration = bars * barDuration;
    }
    return {
      duration: Math.round(duration * 100) / 100,
      bars,
      beats: bars * 4,
    };
  }, [bpmMode, bpmExportValue]);

  const visibleQueueJobs = useMemo(() => {
    if (myJobIds.length === 0) return [];
    const idSet = new Set(myJobIds);
    return queueJobs.filter((job) => idSet.has(job.id));
  }, [queueJobs, myJobIds]);

  const getJobLabel = useCallback(
    (job: QueueJob) => {
      if (job.outputPath) {
        const fileName = job.outputPath.split(/[\\/]/).pop();
        if (fileName) {
          return fileName.replace(/\.[^.]+$/, "");
        }
      }
      return myJobTitles[job.id] || job.id;
    },
    [myJobTitles]
  );

  useEffect(() => {
    if (exportPreset !== "spotify") return;
    const defaultEnd = Math.min(spotifyRangeMax, SPOTIFY_MAX_SECONDS);
    setSpotifyStartSec(0);
    setSpotifyEndSec(defaultEnd);
  }, [exportPreset, spotifyRangeMax]);

  useEffect(() => {
    bpmModeRef.current = bpmMode;
    bpmValueRef.current = bpmValue;
  }, [bpmMode, bpmValue]);

  useEffect(() => {
    setMetronomeOffsetInput(metronomeOffset.toFixed(2));
  }, [metronomeOffset]);

  const commitMetronomeOffset = useCallback(() => {
    const trimmed = metronomeOffsetInput.trim();
    if (!trimmed) {
      setMetronomeOffset(0);
      return;
    }
    const raw = parseFloat(trimmed);
    if (Number.isNaN(raw)) {
      setMetronomeOffsetInput(metronomeOffset.toFixed(2));
      return;
    }
    const clamped = Math.min(2, Math.max(-2, raw));
    const rounded = Math.round(clamped * 100) / 100;
    setMetronomeOffset(rounded);
  }, [metronomeOffsetInput, metronomeOffset]);

  useEffect(() => {
    setWaveformZoom(1);
    if (!audioFile) {
      setBpmAuto(null);
      if (bpmSource === "auto") {
        setBpmValue(null);
      }
    }
  }, [audioFile, bpmSource]);

  const estimateBpm = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    const audioContext = new AudioContextCtor();
    try {
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
      const channel = decoded.getChannelData(0);
      const hopSize = 512;
      const frameCount = Math.max(1, Math.floor(channel.length / hopSize));
      const energies = new Float32Array(frameCount);

      for (let i = 0; i < frameCount; i += 1) {
        const start = i * hopSize;
        const end = Math.min(channel.length, start + hopSize);
        let sum = 0;
        for (let j = start; j < end; j += 1) {
          const sample = channel[j];
          sum += sample * sample;
        }
        energies[i] = Math.sqrt(sum / Math.max(1, end - start));
      }

      let series = energies;
      let downsample = 1;
      if (series.length > 5000) {
        downsample = Math.ceil(series.length / 5000);
        const reduced = new Float32Array(Math.ceil(series.length / downsample));
        for (let i = 0; i < reduced.length; i += 1) {
          let peak = 0;
          const start = i * downsample;
          const end = Math.min(series.length, start + downsample);
          for (let j = start; j < end; j += 1) {
            if (series[j] > peak) peak = series[j];
          }
          reduced[i] = peak;
        }
        series = reduced;
      }

      let mean = 0;
      for (let i = 0; i < series.length; i += 1) {
        mean += series[i];
      }
      mean /= series.length;
      for (let i = 0; i < series.length; i += 1) {
        series[i] -= mean;
      }

      const minBpm = 60;
      const maxBpm = 180;
      const framesPerSecond = decoded.sampleRate / (hopSize * downsample);
      const minLag = Math.max(1, Math.floor((framesPerSecond * 60) / maxBpm));
      const maxLag = Math.min(series.length - 1, Math.floor((framesPerSecond * 60) / minBpm));

      let bestLag = minLag;
      let bestScore = -Infinity;

      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let sum = 0;
        for (let i = 0; i < series.length - lag; i += 1) {
          sum += series[i] * series[i + lag];
        }
        if (sum > bestScore) {
          bestScore = sum;
          bestLag = lag;
        }
      }

      const bpm = (framesPerSecond * 60) / Math.max(1, bestLag);
      return Math.round(bpm);
    } catch (error) {
      console.error("[MusicLed] BPM analysis failed", error);
      return null;
    } finally {
      audioContext.close();
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!audioFile) return;

    setBpmAnalyzing(true);
    void estimateBpm(audioFile).then((value) => {
      if (!active) return;
      setBpmAuto(value);
      if (bpmSource === "auto") {
        setBpmValue(value);
      }
      setBpmAnalyzing(false);
    });

    return () => {
      active = false;
    };
  }, [audioFile, bpmSource, estimateBpm]);

  useEffect(() => {
    if (bpmSource === "auto") {
      setBpmInput(bpmAuto ? String(bpmAuto) : "");
    } else if (bpmValue !== null && !Number.isNaN(bpmValue)) {
      setBpmInput(String(bpmValue));
    }
  }, [bpmSource, bpmAuto, bpmValue]);

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

  const commitBpmInput = useCallback(() => {
    const trimmed = bpmInput.trim();
    if (!trimmed) {
      setBpmValue(null);
      return;
    }
    const raw = parseFloat(trimmed);
    if (Number.isNaN(raw)) {
      setBpmInput(bpmValue ? String(bpmValue) : "");
      return;
    }
    const clamped = Math.min(220, Math.max(40, Math.round(raw)));
    setBpmSource("manual");
    setBpmValue(clamped);
    setBpmInput(String(clamped));
  }, [bpmInput, bpmValue]);

  const updateMapping = useCallback((key: keyof AudioMappingConfig, value: number) => {
    setMapping((prev) => {
      const next = { ...prev, [key]: value };
      mappingRef.current = next;
      return next;
    });
  }, []);

  const rhythmPresets = useMemo<RhythmPreset[]>(
    () => [
      {
        id: "default",
        label: "Default",
        description: "Baseline response",
        mapping: { ...DEFAULT_MAPPING },
      },
      {
        id: "calm",
        label: "Calm",
        description: "Soft, smooth breathing",
        mapping: {
          globalGain: 0.5,
          lowBaseGain: 0.75,
          lowDynGain: 2.5,
          midBaseGain: 0.35,
          midDynGain: 3,
          highBaseGain: 0.2,
          highDynGain: 2,
        },
      },
      {
        id: "balanced",
        label: "Balanced",
        description: "All-round response",
        mapping: {
          globalGain: 0.75,
          lowBaseGain: 0.65,
          lowDynGain: 8,
          midBaseGain: 0.6,
          midDynGain: 7,
          highBaseGain: 0.6,
          highDynGain: 6,
        },
      },
      {
        id: "punch",
        label: "Punch",
        description: "Louder transients",
        mapping: {
          globalGain: 1.05,
          lowBaseGain: 0.5,
          lowDynGain: 12,
          midBaseGain: 0.55,
          midDynGain: 11,
          highBaseGain: 0.4,
          highDynGain: 9,
        },
      },
      {
        id: "crisp",
        label: "Crisp",
        description: "Bright highs, clean lows",
        mapping: {
          globalGain: 0.85,
          lowBaseGain: 0.35,
          lowDynGain: 5,
          midBaseGain: 0.45,
          midDynGain: 6.5,
          highBaseGain: 1.2,
          highDynGain: 9,
        },
      },
      {
        id: "pulse",
        label: "Pulse",
        description: "Rhythmic emphasis",
        mapping: {
          globalGain: 0.7,
          lowBaseGain: 0.4,
          lowDynGain: 9,
          midBaseGain: 0.25,
          midDynGain: 4.5,
          highBaseGain: 0.3,
          highDynGain: 6,
        },
      },
    ],
    []
  );

  const applyPreset = useCallback((preset: RhythmPreset) => {
    setMapping(preset.mapping);
    mappingRef.current = preset.mapping;
  }, []);

  const isPresetActive = useCallback(
    (preset: RhythmPreset) => {
      return MAPPING_KEYS.every(
        (key) => Math.abs((mapping[key] ?? 0) - (preset.mapping[key] ?? 0)) < 0.001
      );
    },
    [mapping]
  );

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
      const mode = bpmModeRef.current;
      const bpm = bpmValueRef.current;
      const audioPlayerEl = audioPlayerRef.current;

      if (mode === "bpm" && bpm && audioPlayerEl) {
        const time = audioPlayerEl.currentTime || 0;
        const phase = (time * bpm / 60) % 1;
        const pulse = Math.exp(-phase * 6);
        const low = Math.min(1, pulse);
        const mid = Math.min(1, pulse * 0.7);
        const high = Math.min(1, pulse * 0.5);

        updateBars(low, mid, high);

        const { globalGain, lowBaseGain, midBaseGain, highBaseGain } = mappingRef.current;
        const lowEffect = low * lowBaseGain * globalGain * 2;
        const midEffect = mid * midBaseGain * globalGain * 2 * PREVIEW_GAIN;
        const highEffect = high * highBaseGain * globalGain * 2;
        visualizerRef.current?.setLow(Math.min(lowEffect, 3.0));
        visualizerRef.current?.setMid(Math.min(midEffect, 2.5));
        visualizerRef.current?.setHigh(Math.min(highEffect, 3.0));
        return;
      }

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

      let rawLow = lowSum / (lowEnd - 1) / 255;
      let rawMid = midSum / (midEnd - lowEnd) / 255;
      let rawHigh = highSum / (highEnd - midEnd) / 255;

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
      midEffect *= globalGain * PREVIEW_GAIN;
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
      if (outputGainRef.current) {
        outputGainRef.current.disconnect();
        outputGainRef.current = null;
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

    audioPlayerRef.current.volume = 1;
    audioPlayerRef.current.muted = false;

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const audioSource = audioContext.createMediaElementSource(audioPlayerRef.current);
    const outputGain = audioContext.createGain();
    outputGain.gain.value = audioVolume;
    audioSource.connect(analyser);
    analyser.connect(outputGain);
    outputGain.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    audioSourceRef.current = audioSource;
    outputGainRef.current = outputGain;
  }, [audioVolume]);

  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = audioVolume;
    }
  }, [audioVolume]);

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
        audioPlayerRef.current.volume = 1;
        audioPlayerRef.current.muted = false;
      }
      setAudioFile(file);
      setAudioCurrentTime(0);
      setAudioPlaying(false);
      initAudioAnalyser();
    },
    [initAudioAnalyser]
  );

  const handleAudioUpload = useCallback(
    (file: File) => {
      setAudioUploading(true);
      setAudioUploadProgress(0);
      let failed = false;
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setAudioUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      reader.onerror = () => {
        failed = true;
        setAudioUploadProgress(0);
      };
      reader.onloadend = () => {
        setAudioUploading(false);
        setAudioUploadProgress(failed ? 0 : 100);
        if (!failed) {
          handleAudioChange(file);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [handleAudioChange]
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

  const applyImageDataUrl = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
    visualizerRef.current?.updateImage(dataUrl);

    const loadId = ++imageLoadIdRef.current;
    const img = new Image();
    img.onload = () => {
      if (imageLoadIdRef.current !== loadId) return;
      setImageSize({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      if (imageLoadIdRef.current !== loadId) return;
      setImageSize(null);
    };
    img.src = dataUrl;
  }, []);

  const handleImageChange = useCallback(
    (file: File) => {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          applyImageDataUrl(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [applyImageDataUrl]
  );

  const handleImageUpload = useCallback(
    (file: File) => {
      setImageFileName(file.name);
      setImageUploading(true);
      setImageUploadProgress(0);
      let failed = false;
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setImageUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          applyImageDataUrl(result);
        }
      };
      reader.onerror = () => {
        failed = true;
        setImageUploadProgress(0);
      };
      reader.onloadend = () => {
        setImageUploading(false);
        setImageUploadProgress(failed ? 0 : 100);
      };
      reader.readAsDataURL(file);
    },
    [applyImageDataUrl]
  );

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
        setSpotifyError("PREVIEW_MISSING");
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

  const fetchQueueSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/render/queue");
      if (!response.ok) {
        throw new Error("Failed to load render queue");
      }
      const data = await response.json() as {
        stats: { pending: number; active: number; completed: number };
        pending: QueueJob[];
        active: QueueJob[];
        completed: QueueJob[];
      };
      setQueueStats(data.stats);
      setQueueJobs([...data.active, ...data.pending, ...data.completed]);
      setQueueError(null);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Queue unavailable");
    }
  }, []);

  useEffect(() => {
    if (!showQueue) return;
    void fetchQueueSnapshot();
    const timer = window.setInterval(() => {
      void fetchQueueSnapshot();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [fetchQueueSnapshot, showQueue]);

  const handleExport = useCallback(async () => {
    if (!audioFile || !imageDataUrl) {
      setExportError("Upload audio and cover first.");
      return;
    }

    setShowQueue(true);
    if (enqueueing) return;
    setEnqueueing(true);
    setExportStatus("running");
    setExportError(null);
    setExportProgress(0);
    setExportMessage("Starting...");
    setExportEta(null);

    const effects: EffectConfig = {
      ...DEFAULT_EFFECTS,
      audioMapping: mappingRef.current,
    };

    const { width, height, fps } = exportSettings;
    const bpmLoopEnabled = exportPreset === "spotify" && bpmMode === "bpm";
    const bpmSegmentDuration = Math.max(0.1, bpmLoopInfo?.duration ?? SPOTIFY_MAX_SECONDS);
    const segmentStartSec =
      bpmLoopEnabled ? 0 : exportPreset === "spotify" ? spotifyStartSec : undefined;
    const segmentDurationSec =
      bpmLoopEnabled
        ? bpmSegmentDuration
        : exportPreset === "spotify"
          ? Math.max(0, spotifyEndSec - spotifyStartSec)
          : undefined;
    const rhythmMode = bpmMode;
    const bpmToUse = bpmSource === "manual" ? bpmValue : bpmAuto;
    const exportTitle =
      spotifyTrack?.name ||
      (audioFile?.name ? audioFile.name.replace(/\.[^/.]+$/, "").trim() : "") ||
      "export";

    const exporter = new VideoExporter({
      fps,
      width,
      height,
    });

    try {
      const { jobId } = await exporter.enqueue({
        audioFile,
        imageFile: imageDataUrl,
        effects,
        maxDurationSec: bpmLoopEnabled ? bpmSegmentDuration : undefined,
        segmentStartSec,
        segmentDurationSec,
        rhythmMode,
        bpm: bpmToUse ?? undefined,
        title: exportTitle,
        onProgress: (p) => {
          setExportProgress(p.progress);
          setExportMessage(p.message);
          setExportEta(p.eta ?? null);
        },
      });

      setMyJobIds((prev) => {
        if (prev.includes(jobId)) return prev;
        return [jobId, ...prev].slice(0, 50);
      });
      setMyJobTitles((prev) => ({
        ...prev,
        [jobId]: exportTitle,
      }));
      setExportStatus("idle");
      setExportMessage("Queued");
      setExportProgress(0);
      setExportEta(null);
      void fetchQueueSnapshot();
    } catch (error) {
      setExportStatus("error");
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setEnqueueing(false);
    }
  }, [
    audioFile,
    imageDataUrl,
    exportSettings,
    exportPreset,
    spotifyStartSec,
    spotifyEndSec,
    bpmMode,
    bpmSource,
    bpmValue,
    bpmAuto,
    bpmLoopInfo,
    spotifyTrack,
    enqueueing,
    fetchQueueSnapshot,
  ]);

  const handleCancelJob = useCallback(
    async (jobId: string) => {
      try {
        await fetch(`/api/render/${jobId}/cancel`, { method: "POST" });
      } finally {
        void fetchQueueSnapshot();
      }
    },
    [fetchQueueSnapshot]
  );

  const handlePreview = useCallback(() => {
    const player = audioPlayerRef.current;
    if (!player) return;

    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    let start = 0;
    let duration = Math.min(SPOTIFY_MAX_SECONDS, player.duration || SPOTIFY_MAX_SECONDS);

    if (exportPreset === "spotify" && bpmMode === "bpm") {
      start = 0;
      duration = Math.max(0.1, bpmLoopInfo?.duration ?? SPOTIFY_MAX_SECONDS);
    } else if (exportPreset === "spotify") {
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
  }, [exportPreset, spotifyStartSec, spotifyEndSec, bpmMode, bpmLoopInfo]);

  const getDownloadUrl = useCallback((outputPath?: string) => {
    if (!outputPath) return null;
    const fileName = outputPath.split(/[\\/]/).pop();
    if (!fileName) return null;
    return `/api/download/${fileName}`;
  }, []);

  const toggleAudioPlayback = useCallback(() => {
    const player = audioPlayerRef.current;
    if (!player) return;
    if (player.paused) {
      player.play().catch(() => {});
    } else {
      player.pause();
    }
  }, []);

  const formatTime = useCallback((value?: number | null) => {
    if (!value || !Number.isFinite(value)) return "0:00";
    const total = Math.max(0, Math.floor(value));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

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
  const bpmDisplay = useMemo(() => {
    if (bpmSource === "auto") {
      if (bpmAnalyzing) return "Analyzing...";
      return bpmAuto ? `${bpmAuto} BPM` : "Unavailable";
    }
    return bpmValue ? `${bpmValue} BPM` : "Manual";
  }, [bpmSource, bpmAuto, bpmValue, bpmAnalyzing]);

  const metronomeBpm = useMemo(() => {
    const value = bpmSource === "manual" ? bpmValue : bpmAuto;
    if (typeof value === "number" && value > 0) return value;
    return 120;
  }, [bpmSource, bpmValue, bpmAuto]);

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

  useEffect(() => {
    if (bpmMode !== "bpm") return;
    let rafId: number | null = null;

    const update = () => {
      const player = audioPlayerRef.current;
      if (!player || !Number.isFinite(player.currentTime)) {
        rafId = requestAnimationFrame(update);
        return;
      }

      const bpm = Math.max(1, metronomeBpm);
      const beatDuration = 60 / bpm;
      const time = Math.max(0, player.currentTime + metronomeOffset);
      const beatIndex = Math.floor(time / beatDuration) % 4;
      const beatProgress = (time / beatDuration) % 1;
      const subIndex = Math.floor(beatProgress * 4) % 4;

      setMetronomeBeat(beatIndex);
      setMetronomeSubBeat(subIndex);
      setMetronomeTick((prev) => prev + 1);

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [bpmMode, metronomeBpm, metronomeOffset]);

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

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-200">Audio Control</h2>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file && file.type.startsWith("audio/")) {
                    handleAudioUpload(file);
                  }
                }}
              />
              {audioUploading ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Uploading audio...</span>
                    <span className="tabular-nums">{Math.min(100, audioUploadProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{ width: `${Math.min(100, audioUploadProgress)}%` }}
                    />
                  </div>
                </div>
              ) : audioFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 gap-3">
                    <span className="max-w-[220px] truncate text-zinc-200" title={audioFile?.name ?? ""}>
                      {audioFile?.name ?? "Audio loaded"}
                    </span>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Re-upload
                    </button>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={toggleAudioPlayback}
                        disabled={!audioFile}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          audioFile
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {audioPlaying ? "Pause" : "Play"}
                      </button>
                      <div className="text-xs text-zinc-400 tabular-nums">
                        {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={audioDuration ?? 0}
                      step={0.01}
                      value={audioDuration ? Math.min(audioCurrentTime, audioDuration) : 0}
                      disabled={!audioDuration}
                      onChange={(event) => {
                        const nextTime = parseFloat(event.target.value);
                        setAudioCurrentTime(nextTime);
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.currentTime = nextTime;
                        }
                      }}
                      className={`w-full accent-emerald-400 ${
                        audioDuration ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                      }`}
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">Volume</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={audioVolume}
                        onChange={(event) => setAudioVolume(parseFloat(event.target.value))}
                        className="flex-1 accent-emerald-400"
                      />
                      <span className="w-10 text-right text-xs text-zinc-400 tabular-nums">
                        {Math.round(audioVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`border border-dashed rounded-lg p-4 text-sm text-zinc-400 transition cursor-pointer ${
                    audioDragOver ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-zinc-700"
                  }`}
                  onClick={() => audioInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      audioInputRef.current?.click();
                    }
                  }}
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
                      handleAudioUpload(file);
                    }
                  }}
                >
                  Click or drop an audio file
                </div>
              )}
              <audio
                ref={audioPlayerRef}
                onLoadedMetadata={() => {
                  if (audioPlayerRef.current?.duration) {
                    setAudioDuration(audioPlayerRef.current.duration);
                    setAudioCurrentTime(audioPlayerRef.current.currentTime || 0);
                  }
                }}
                onTimeUpdate={() => {
                  if (audioPlayerRef.current) {
                    setAudioCurrentTime(audioPlayerRef.current.currentTime || 0);
                  }
                }}
                onPause={() => {
                  if (previewTimeoutRef.current) {
                    window.clearTimeout(previewTimeoutRef.current);
                    previewTimeoutRef.current = null;
                  }
                  setAudioPlaying(false);
                  setPreviewing(false);
                }}
                onEnded={() => {
                  if (previewTimeoutRef.current) {
                    window.clearTimeout(previewTimeoutRef.current);
                    previewTimeoutRef.current = null;
                  }
                  setAudioPlaying(false);
                  setPreviewing(false);
                }}
                onPlay={() => {
                  if (audioContextRef.current?.state === "suspended") {
                    audioContextRef.current.resume();
                  }
                  setAudioPlaying(true);
                }}
                onVolumeChange={() => {
                  if (!audioPlayerRef.current) return;
                  const player = audioPlayerRef.current;
                  if (player.muted) {
                    player.muted = false;
                  }
                  if (player.volume !== 1) {
                    player.volume = 1;
                  }
                }}
                style={{ display: "none" }}
                className="w-full"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-200">Cover Image</h2>
              {exportPreset === "spotify" && imageDataUrl && imageSize && !spotifyCoverOk && (
                <p className="text-xs text-amber-300/90">
                  Spotify Canvas requires a 9:16 portrait cover (720x1280). Upload a matching image
                  to avoid letterboxing.
                </p>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file && file.type.startsWith("image/")) {
                    handleImageUpload(file);
                  }
                }}
              />
              {imageUploading ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Uploading image...</span>
                    <span className="tabular-nums">{Math.min(100, imageUploadProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-[width]"
                      style={{ width: `${Math.min(100, imageUploadProgress)}%` }}
                    />
                  </div>
                </div>
              ) : imageDataUrl ? (
                <div className="flex items-center justify-between text-xs text-zinc-400 gap-3">
                  <span className="max-w-[220px] truncate text-zinc-200" title={imageFileName ?? ""}>
                    {imageFileName ?? "Image loaded"}
                  </span>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Re-upload
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`border border-dashed rounded-lg p-4 text-sm text-zinc-400 transition cursor-pointer ${
                    imageDragOver ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-zinc-700"
                  }`}
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      imageInputRef.current?.click();
                    }
                  }}
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
                      handleImageUpload(file);
                    }
                  }}
                >
                  Click or drop a cover image
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex-1 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Spotify Import</h2>
            {spotifyLoading ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Importing from Spotify...</span>
                  <span className="tabular-nums">0%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full w-1/2 bg-emerald-500/70 animate-pulse" />
                </div>
              </div>
            ) : spotifyTrack ? (
              <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="min-w-0">
                  <div className="truncate text-zinc-200 font-semibold" title={spotifyTrack.name}>
                    {spotifyTrack.name}
                  </div>
                  <div className="truncate text-zinc-500" title={spotifyTrack.artists.join(", ")}>
                    {spotifyTrack.artists.join(", ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSpotifyTrack(null);
                    setSpotifyError(null);
                    setSpotifyLink("");
                  }}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Re-import
                </button>
              </div>
            ) : (
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
                  onClick={() => handleSpotifyImport()}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  Fetch
                </button>
              </div>
            )}
            {spotifyError === "PREVIEW_MISSING" && !spotifyLoading && (
              <p className="text-xs text-amber-400">暂无试听片段</p>
            )}
            {spotifyError && spotifyError !== "PREVIEW_MISSING" && !spotifyLoading && (
              <p className="text-xs text-rose-400">{spotifyError}</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Rhythm Mode</h2>
              <p className="text-xs text-zinc-500 mt-1">Choose how the LEDs sync with audio.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Mode</div>
              <div className="relative flex rounded-full border border-zinc-800 bg-zinc-950/70 p-1">
                <div
                  className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.35)] transition-transform"
                  style={{ transform: bpmMode === "bpm" ? "translateX(100%)" : "translateX(0)" }}
                />
                <button
                  type="button"
                  onClick={() => setBpmMode("beat")}
                  className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    bpmMode === "beat" ? "text-white" : "text-zinc-300 hover:text-zinc-100"
                  }`}
                >
                  <span className="mr-2">∿</span>Music Onsets
                </button>
                <button
                  type="button"
                  onClick={() => setBpmMode("bpm")}
                  className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    bpmMode === "bpm" ? "text-white" : "text-zinc-300 hover:text-zinc-100"
                  }`}
                >
                  <span className="mr-2">⏱</span>BPM Pulse
                </button>
              </div>
            </div>

            {bpmMode === "bpm" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 backdrop-blur space-y-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Rhythm Source</div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBpmSource("auto")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        bpmSource === "auto"
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setBpmSource("manual")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        bpmSource === "manual"
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      Manual
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={bpmInput}
                        onChange={(event) => {
                          setBpmSource("manual");
                          setBpmInput(event.target.value);
                        }}
                        onBlur={commitBpmInput}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitBpmInput();
                            (event.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="120"
                        className="w-14 bg-transparent text-right text-sm text-white outline-none"
                      />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">BPM</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Offset</span>
                      <input
                        type="range"
                        min={-2}
                        max={2}
                        step={0.01}
                        value={metronomeOffset}
                        onChange={(event) => setMetronomeOffset(parseFloat(event.target.value))}
                        className="w-24 accent-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setMetronomeOffset((prev) => Math.max(-2, Math.round((prev - 0.01) * 100) / 100))}
                        className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={-2}
                        max={2}
                        step={0.01}
                        value={metronomeOffsetInput}
                        onChange={(event) => setMetronomeOffsetInput(event.target.value)}
                        onBlur={commitMetronomeOffset}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitMetronomeOffset();
                            (event.target as HTMLInputElement).blur();
                          }
                        }}
                        className="offset-input w-14 bg-transparent text-right text-xs text-zinc-100 outline-none"
                      />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">s</span>
                      <button
                        type="button"
                        onClick={() => setMetronomeOffset((prev) => Math.min(2, Math.round((prev + 0.01) * 100) / 100))}
                        className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-end gap-1">
                      {Array.from({ length: 16 }).map((_, index) => {
                        const isBeat = index % 4 === 0;
                        const activeIndex = (metronomeBeat % 4) * 4 + metronomeSubBeat;
                        const isActive = index === activeIndex;
                        const isDownbeat = isBeat && index === 0;
                        return (
                          <span
                            key={index}
                            className={`metronome-bar ${isBeat ? "is-beat" : "is-tick"} ${
                              isActive ? "is-active" : ""
                            } ${isDownbeat ? "is-downbeat" : ""}`}
                          />
                        );
                      })}
                    </div>
                    <span>{bpmDisplay}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {bpmSource === "auto"
                    ? `Auto detected: ${bpmAuto ?? "--"} BPM`
                    : "Manual BPM will override audio onsets."}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Presets</h2>
              <p className="text-xs text-zinc-500 mt-1">Quickly apply a tuned response.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {rhythmPresets.map((preset) => {
                const isActive = isPresetActive(preset);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-100">{preset.label}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Active</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <details className="rounded-xl border border-zinc-800 bg-zinc-900/60 details-advanced">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-200">
              <div className="flex items-center justify-between">
                <span>高级设置</span>
                <svg
                  className="details-chevron h-4 w-4 text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </summary>
            <div className="space-y-4 px-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Global Gain</span>
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

            </div>
          </details>

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
            {exportPreset === "spotify" && bpmMode !== "bpm" && (
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
            {exportPreset === "spotify" && bpmMode === "bpm" && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Loop length (auto)</span>
                  <span className="tabular-nums">
                    {bpmLoopInfo?.duration?.toFixed(2) ?? SPOTIFY_MAX_SECONDS.toFixed(2)}s
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  BPM mode locks to full bars for seamless looping ({bpmLoopInfo?.beats ?? 0} beats,
                  {bpmLoopInfo?.bars ?? 0} bars).
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!audioFile || !imageDataUrl || enqueueing}
                onClick={handlePreview}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  !audioFile || !imageDataUrl || enqueueing
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
                {enqueueing ? "Queueing..." : "Start Export"}
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

            {exportStatus === "error" && exportError && (
              <p className="text-sm text-rose-400">Export failed: {exportError}</p>
            )}

            {showQueue && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Render Queue</h3>
                    <p className="text-xs text-zinc-500">Shared across all users.</p>
                  </div>
                  {queueStats && (
                    <div className="text-xs text-zinc-400">
                      {queueStats.pending} pending · {queueStats.active} running · {queueStats.completed} done
                    </div>
                  )}
                </div>
                {queueError && <p className="text-xs text-rose-400">{queueError}</p>}
                {!queueError && visibleQueueJobs.length === 0 && (
                  <p className="text-xs text-zinc-500">No jobs from this session yet.</p>
                )}
                {!queueError && visibleQueueJobs.length > 0 && (
                  <div className="space-y-2">
                    {visibleQueueJobs.map((job) => {
                      const downloadUrl = job.status === "completed" ? getDownloadUrl(job.outputPath) : null;
                      const isCancelable = job.status === "pending" || job.status === "rendering";
                      const jobLabel = getJobLabel(job);
                      return (
                        <div
                          key={job.id}
                          className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="text-zinc-300 truncate" title={jobLabel}>
                                {jobLabel}
                              </div>
                              <div className="text-zinc-500">
                                {job.status === "pending" && `Waiting · #${job.position ?? "-"}`}
                                {job.status === "rendering" && `Rendering · ${Math.round(job.progress || 0)}%`}
                                {job.status === "completed" && "Completed"}
                                {job.status === "failed" && "Failed"}
                                {job.status === "cancelled" && "Cancelled"}
                              </div>
                            </div>
                            {isCancelable && (
                              <button
                                type="button"
                                onClick={() => handleCancelJob(job.id)}
                                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {job.status === "rendering" && (
                            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${Math.min(100, Math.max(0, job.progress || 0))}%` }}
                              />
                            </div>
                          )}
                          {job.status === "completed" && downloadUrl && (
                            <a
                              href={downloadUrl}
                              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Download
                            </a>
                          )}
                          {job.status === "failed" && job.error && (
                            <p className="text-xs text-rose-400">{job.error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
        .details-advanced .details-chevron {
          transition: transform 0.2s ease;
        }
        .details-advanced[open] .details-chevron {
          transform: rotate(180deg);
        }
        .offset-input::-webkit-outer-spin-button,
        .offset-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .offset-input {
          -moz-appearance: textfield;
        }
        .metronome-bar {
          display: inline-block;
          width: 3px;
          height: 8px;
          border-radius: 999px;
          background: #3f3f46;
          opacity: 0.65;
          transition: height 0.2s ease, background 0.2s ease, opacity 0.2s ease;
        }
        .metronome-bar.is-tick {
          height: 5px;
          opacity: 0.35;
        }
        .metronome-bar.is-beat {
          height: 12px;
          opacity: 0.85;
        }
        .metronome-bar.is-downbeat {
          height: 16px;
        }
        .metronome-bar.is-active {
          background: #22c55e;
          opacity: 1;
          transform: scaleY(1.2);
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .metronome-bar.is-active.is-beat {
          background: #10b981;
        }
        .metronome-bar.is-active.is-downbeat {
          height: 20px;
        }
      `}</style>
    </div>
  );
}
