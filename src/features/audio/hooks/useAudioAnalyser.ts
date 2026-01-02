"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAudioStore } from "../store";

const FFT_SIZE = 256;
const BASS_MIN_FREQ = 20;
const BASS_MAX_FREQ = 250;
const SMOOTHING_FACTOR = 0.5;

const lerp = (start: number, end: number, factor: number) =>
  start + (end - start) * factor;

export function useAudioAnalyser() {
  const {
    audioContext,
    analyser,
    setAudioContext,
    setAnalyser,
    setAudioSource,
    setBassEnergy,
    setFrequencyData,
    setIsPlaying,
  } = useAudioStore();

  const animationFrameRef = useRef<number | null>(null);
  const previousBassRef = useRef<number>(0);

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

  const calculateBassEnergy = useCallback(
    (analyserNode: AnalyserNode) => {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      const sampleRate = audioContext?.sampleRate || 44100;
      const freqPerBin = sampleRate / FFT_SIZE;

      const minBin = Math.floor(BASS_MIN_FREQ / freqPerBin);
      const maxBin = Math.ceil(BASS_MAX_FREQ / freqPerBin);

      let sum = 0;
      let count = 0;
      for (let i = minBin; i <= maxBin && i < bufferLength; i++) {
        sum += dataArray[i];
        count++;
      }

      const rawBass = count > 0 ? sum / count / 255 : 0;
      const smoothedBass = lerp(previousBassRef.current, rawBass, SMOOTHING_FACTOR);
      previousBassRef.current = smoothedBass;

      return smoothedBass;
    },
    [audioContext]
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
        const bass = calculateBassEnergy(node);
        setBassEnergy(bass);

        const freqData = getFrequencyData(node);
        setFrequencyData(new Uint8Array(freqData));

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      setIsPlaying(true);
      analyze();
    },
    [analyser, calculateBassEnergy, getFrequencyData, setBassEnergy, setFrequencyData, setIsPlaying]
  );

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setBassEnergy(0);
    setFrequencyData(null);
  }, [setBassEnergy, setFrequencyData, setIsPlaying]);

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
