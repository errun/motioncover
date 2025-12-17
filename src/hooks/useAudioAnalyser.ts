"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAudioStore, lerp } from "@/stores/audioStore";

const FFT_SIZE = 256;
const BASS_MIN_FREQ = 40;
const BASS_MAX_FREQ = 100;
const SMOOTHING_FACTOR = 0.1;

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

  // Initialize audio context and analyser
  const initAudio = useCallback(
    (audioElement: HTMLAudioElement) => {
      // Create or resume audio context
      const ctx = audioContext || new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      setAudioContext(ctx);

      // Create analyser
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = FFT_SIZE;
      analyserNode.smoothingTimeConstant = 0.8;
      setAnalyser(analyserNode);

      // Connect audio element
      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      setAudioSource(source);

      return { ctx, analyserNode };
    },
    [audioContext, setAudioContext, setAnalyser, setAudioSource]
  );

  // Calculate bass energy from FFT data
  const calculateBassEnergy = useCallback(
    (analyserNode: AnalyserNode) => {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      // Calculate frequency per bin
      const sampleRate = audioContext?.sampleRate || 44100;
      const freqPerBin = sampleRate / FFT_SIZE;

      // Find bins in bass range (40-100Hz)
      const minBin = Math.floor(BASS_MIN_FREQ / freqPerBin);
      const maxBin = Math.ceil(BASS_MAX_FREQ / freqPerBin);

      // Calculate average energy in bass range
      let sum = 0;
      let count = 0;
      for (let i = minBin; i <= maxBin && i < bufferLength; i++) {
        sum += dataArray[i];
        count++;
      }

      const rawBass = count > 0 ? sum / count / 255 : 0;

      // Apply smoothing
      const smoothedBass = lerp(
        previousBassRef.current,
        rawBass,
        SMOOTHING_FACTOR
      );
      previousBassRef.current = smoothedBass;

      return smoothedBass;
    },
    [audioContext]
  );

  // Get full frequency data for waveform visualization
  const getFrequencyData = useCallback(
    (analyserNode: AnalyserNode): Uint8Array => {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);
      return dataArray;
    },
    []
  );

  // Animation loop for continuous analysis
  const startAnalysis = useCallback(() => {
    if (!analyser) return;

    const analyze = () => {
      const bass = calculateBassEnergy(analyser);
      setBassEnergy(bass);

      // Get full frequency data for waveform
      const freqData = getFrequencyData(analyser);
      setFrequencyData(new Uint8Array(freqData));

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    setIsPlaying(true);
    analyze();
  }, [analyser, calculateBassEnergy, getFrequencyData, setBassEnergy, setFrequencyData, setIsPlaying]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setBassEnergy(0);
    setFrequencyData(null);
  }, [setBassEnergy, setFrequencyData, setIsPlaying]);

  // Cleanup on unmount
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

