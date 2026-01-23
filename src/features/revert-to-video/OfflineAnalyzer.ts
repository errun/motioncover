export type OfflineAnalyzerProgress = {
  phase: "decoding" | "analyzing" | "extracting";
  progress: number;
};

export type AudioFrame = {
  low: number;
  mid: number;
  high: number;
};

export class OfflineAnalyzer {
  private fps: number;
  private fftSize: number;
  private smoothingFactor: number;

  constructor(options: { fps?: number; fftSize?: number; smoothingFactor?: number } = {}) {
    this.fps = options.fps || 30;
    this.fftSize = options.fftSize || 512;
    this.smoothingFactor =
      typeof options.smoothingFactor === "number" ? options.smoothingFactor : 1.0;
  }

  async analyze(
    audioBuffer: ArrayBuffer,
    onProgress: (p: OfflineAnalyzerProgress) => void = () => {}
  ): Promise<{
    frames: AudioFrame[];
    duration: number;
    sampleRate: number;
    totalFrames: number;
    decodedBuffer: AudioBuffer;
  }> {
    const AudioContextCtor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("AudioContext not supported");
    }

    const audioContext = new AudioContextCtor();
    const decodedData = await audioContext.decodeAudioData(audioBuffer);

    const duration = decodedData.duration;
    const sampleRate = decodedData.sampleRate;
    const totalFrames = Math.ceil(duration * this.fps);

    onProgress({ phase: "decoding", progress: 0.1 });

    const offlineCtx = new OfflineAudioContext(
      decodedData.numberOfChannels,
      decodedData.length,
      sampleRate
    );

    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = this.fftSize;
    analyser.smoothingTimeConstant = 0;

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedData;
    source.connect(analyser);
    analyser.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    onProgress({ phase: "analyzing", progress: 0.3 });

    const frames = await this.analyzeFrames(
      renderedBuffer,
      totalFrames,
      sampleRate,
      (p) => onProgress({ phase: "extracting", progress: 0.3 + p * 0.7 })
    );

    audioContext.close();

    return { frames, duration, sampleRate, totalFrames, decodedBuffer: decodedData };
  }

  private async analyzeFrames(
    audioBuffer: AudioBuffer,
    totalFrames: number,
    sampleRate: number,
    onProgress: (p: number) => void
  ): Promise<AudioFrame[]> {
    const frames: AudioFrame[] = [];
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerFrame = Math.floor(sampleRate / this.fps);

    let smoothedLow = 0;
    let smoothedMid = 0;
    let smoothedHigh = 0;

    for (let i = 0; i < totalFrames; i += 1) {
      const startSample = i * samplesPerFrame;
      const endSample = Math.min(startSample + samplesPerFrame, channelData.length);
      const frameData = channelData.slice(startSample, endSample);
      const features = this.extractFeatures(frameData);

      smoothedLow = this.lerp(smoothedLow, features.low, this.smoothingFactor);
      smoothedMid = this.lerp(smoothedMid, features.mid, this.smoothingFactor);
      smoothedHigh = this.lerp(smoothedHigh, features.high, this.smoothingFactor);

      frames.push({ low: smoothedLow, mid: smoothedMid, high: smoothedHigh });

      if (i % 100 === 0) {
        onProgress(i / totalFrames);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress(1);
    return frames;
  }

  private extractFeatures(samples: Float32Array | number[]): AudioFrame {
    const len = samples.length;
    if (len === 0) return { low: 0, mid: 0, high: 0 };

    let sum = 0;
    for (let i = 0; i < len; i += 1) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / len);

    let zeroCrossings = 0;
    for (let i = 1; i < len; i += 1) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        zeroCrossings += 1;
      }
    }
    const zeroCrossRate = zeroCrossings / len;

    const low = Math.min(rms * 3, 1);
    const high = Math.min(zeroCrossRate * 2, 1);
    const mid = Math.min((rms * 2 + zeroCrossRate) / 2, 1);

    return { low, mid, high };
  }

  private lerp(current: number, target: number, factor: number) {
    return current + (target - current) * factor;
  }
}
