"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAudioStore } from "../store";

const FFT_SIZE = 256;
// Narrower bass range for more punch detection (kick drum)
const BASS_MIN_FREQ = 40;
const BASS_MAX_FREQ = 120;
const SMOOTHING_FACTOR = 0.3; // Faster response
const BAND_SMOOTHING_FACTOR = 0.15;
const MID_START_RATIO = 0.15; // ~1-4kHz range
const MID_END_RATIO = 0.4;
const HIGH_START_RATIO = 0.4; // 4kHz+ range
const HIGH_END_RATIO = 0.8; // Avoid very high freq noise
const SNARE_THRESHOLD = 0.03;
const SNARE_GAIN = 5;
const SNARE_DECAY = 0.8;

const DYNAMICS = {
  bass: { gate: 0.06, exponent: 1.7, gain: 1.1 },
  mid: { gate: 0.05, exponent: 1.5, gain: 1.05 },
  high: { gate: 0.04, exponent: 1.4, gain: 1.0 },
};

const RANGE = {
  bass: { attack: 0.2, release: 0.01, minSpan: 0.08 },
  mid: { attack: 0.18, release: 0.01, minSpan: 0.07 },
  high: { attack: 0.16, release: 0.012, minSpan: 0.06 },
};

const lerp = (start: number, end: number, factor: number) =>
  start + (end - start) * factor;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const normalizeDynamic = (
  value: number,
  state: { min: number; max: number },
  config: { attack: number; release: number; minSpan: number }
) => {
  if (state.max < state.min) {
    state.max = value;
    state.min = value;
    return 0;
  }
  const { attack, release, minSpan } = config;
  state.max = value > state.max ? lerp(state.max, value, attack) : lerp(state.max, value, release);
  state.min = value < state.min ? lerp(state.min, value, attack) : lerp(state.min, value, release);
  const span = Math.max(minSpan, state.max - state.min);
  return clamp01((value - state.min) / span);
};

// Dynamic range mapping: gate + power curve + gain
const applyDynamics = (value: number, gate: number, exponent: number, gain: number) => {
  const gated = Math.max(0, value - gate);
  if (gated <= 0) return 0;
  const normalized = gated / (1 - gate);
  const shaped = Math.pow(normalized, exponent) * gain;
  return clamp01(shaped);
};

export function useAudioAnalyser() {
  const {
    audioContext,
    analyser,
    setAudioContext,
    setAnalyser,
    setAudioSource,
    setBassEnergy,
    setMidEnergy,
    setHighEnergy,
    setSnareHit,
    setFrequencyData,
    setIsPlaying,
  } = useAudioStore();

  const animationFrameRef = useRef<number | null>(null);
  const previousBassRef = useRef<number>(0);
  const previousMidRef = useRef<number>(0);
  const previousHighRef = useRef<number>(0);
  const previousMidRawRef = useRef<number>(0);
  const snareRef = useRef<number>(0);
  const rangeRef = useRef({
    bass: { min: 1, max: 0 },
    mid: { min: 1, max: 0 },
    high: { min: 1, max: 0 },
  });

  const initAudio = useCallback(
    (audioElement: HTMLAudioElement) => {
      const ctx = audioContext || new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      setAudioContext(ctx);

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = FFT_SIZE;
      analyserNode.smoothingTimeConstant = 0.3;
      setAnalyser(analyserNode);

      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      setAudioSource(source);

      return { ctx, analyserNode };
    },
    [audioContext, setAudioContext, setAnalyser, setAudioSource]
  );

  const calculateBandEnergy = useCallback(
    (dataArray: Uint8Array, startIndex: number, endIndex: number) => {
      if (endIndex <= startIndex) return 0;
      let sumSq = 0;
      for (let i = startIndex; i < endIndex; i++) {
        const v = dataArray[i] / 255;
        sumSq += v * v;
      }
      return Math.sqrt(sumSq / (endIndex - startIndex));
    },
    []
  );

  const calculateBandEnergyByRatio = useCallback(
    (dataArray: Uint8Array, startRatio: number, endRatio: number) => {
      if (dataArray.length === 0) return 0;
      const start = Math.floor(dataArray.length * startRatio);
      const end = Math.floor(dataArray.length * endRatio);
      return calculateBandEnergy(dataArray, start, end);
    },
    [calculateBandEnergy]
  );

  const calculateBassEnergy = useCallback(
    (dataArray: Uint8Array) => {
      const sampleRate = audioContext?.sampleRate || 44100;
      const freqPerBin = sampleRate / FFT_SIZE;
      const minBin = Math.floor(BASS_MIN_FREQ / freqPerBin);
      const maxBin = Math.ceil(BASS_MAX_FREQ / freqPerBin);

      const clampedMin = Math.max(0, minBin);
      const clampedMax = Math.min(dataArray.length - 1, maxBin);
      return calculateBandEnergy(dataArray, clampedMin, clampedMax + 1);
    },
    [audioContext, calculateBandEnergy]
  );

  const getFrequencyData = useCallback((analyserNode: AnalyserNode): Uint8Array => {
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  const startAnalysis = useCallback(
    (analyserNode?: AnalyserNode) => {
      const node = analyserNode || analyser;
      if (!node) {
        console.warn("[useAudioAnalyser] No analyser available for startAnalysis");
        return;
      }

      const analyze = () => {
        const freqData = getFrequencyData(node);
        const rawBassLinear = calculateBassEnergy(freqData);
        const rawMidLinear = calculateBandEnergyByRatio(freqData, MID_START_RATIO, MID_END_RATIO);
        const rawHighLinear = calculateBandEnergyByRatio(freqData, HIGH_START_RATIO, HIGH_END_RATIO);

        const bassNormalized = normalizeDynamic(rawBassLinear, rangeRef.current.bass, RANGE.bass);
        const midNormalized = normalizeDynamic(rawMidLinear, rangeRef.current.mid, RANGE.mid);
        const highNormalized = normalizeDynamic(rawHighLinear, rangeRef.current.high, RANGE.high);

        const shapedBass = applyDynamics(
          bassNormalized,
          DYNAMICS.bass.gate,
          DYNAMICS.bass.exponent,
          DYNAMICS.bass.gain
        );
        const shapedMid = applyDynamics(
          midNormalized,
          DYNAMICS.mid.gate,
          DYNAMICS.mid.exponent,
          DYNAMICS.mid.gain
        );
        const shapedHigh = applyDynamics(
          highNormalized,
          DYNAMICS.high.gate,
          DYNAMICS.high.exponent,
          DYNAMICS.high.gain
        );

        const smoothedBass = lerp(previousBassRef.current, shapedBass, SMOOTHING_FACTOR);
        const smoothedMid = lerp(previousMidRef.current, shapedMid, BAND_SMOOTHING_FACTOR);
        const smoothedHigh = lerp(previousHighRef.current, shapedHigh, BAND_SMOOTHING_FACTOR);

        previousBassRef.current = smoothedBass;
        previousMidRef.current = smoothedMid;
        previousHighRef.current = smoothedHigh;

        const midDelta = rawMidLinear - previousMidRawRef.current;
        previousMidRawRef.current = rawMidLinear;
        const rawSnare = midDelta > SNARE_THRESHOLD
          ? Math.min((midDelta - SNARE_THRESHOLD) * SNARE_GAIN, 1)
          : 0;
        if (rawSnare > snareRef.current) {
          snareRef.current = rawSnare;
        } else {
          snareRef.current *= SNARE_DECAY;
        }

        setBassEnergy(smoothedBass);
        setMidEnergy(smoothedMid);
        setHighEnergy(smoothedHigh);
        setSnareHit(snareRef.current);

        setFrequencyData(new Uint8Array(freqData));

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      setIsPlaying(true);
      analyze();
    },
    [
      analyser,
      calculateBassEnergy,
      calculateBandEnergyByRatio,
      getFrequencyData,
      setBassEnergy,
      setMidEnergy,
      setHighEnergy,
      setSnareHit,
      setFrequencyData,
      setIsPlaying
    ]
  );

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    previousBassRef.current = 0;
    previousMidRef.current = 0;
    previousHighRef.current = 0;
    previousMidRawRef.current = 0;
    snareRef.current = 0;
    rangeRef.current = {
      bass: { min: 1, max: 0 },
      mid: { min: 1, max: 0 },
      high: { min: 1, max: 0 },
    };
    setIsPlaying(false);
    setBassEnergy(0);
    setMidEnergy(0);
    setHighEnergy(0);
    setSnareHit(0);
    setFrequencyData(null);
  }, [setBassEnergy, setMidEnergy, setHighEnergy, setSnareHit, setFrequencyData, setIsPlaying]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    initAudio,
    startAnalysis,
    stopAnalysis,
    calculateBassEnergy,
  };
}
