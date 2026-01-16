import { spawn } from "child_process";
import { EventEmitter } from "events";

type PipelineOptions = {
  width: number;
  height: number;
  fps: number;
  outputPath: string;
  audioPath?: string | null;
  preset?: string;
};

export class FFmpegPipeline extends EventEmitter {
  private width: number;
  private height: number;
  private fps: number;
  private outputPath: string;
  private audioPath?: string | null;
  private preset: string;
  private process: ReturnType<typeof spawn> | null = null;
  private isFinished = false;
  private stderrBuffer = "";

  constructor(options: PipelineOptions) {
    super();
    this.width = options.width;
    this.height = options.height;
    this.fps = options.fps;
    this.outputPath = options.outputPath;
    this.audioPath = options.audioPath;
    this.preset = options.preset || "medium";
  }

  start() {
    const args = [
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${this.width}x${this.height}`,
      "-r",
      String(this.fps),
      "-i",
      "pipe:0",
    ];

    if (this.audioPath) {
      args.push("-i", this.audioPath);
    }

    args.push(
      "-c:v",
      "libx264",
      "-preset",
      this.preset,
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-map",
      "0:v"
    );

    if (this.audioPath) {
      args.push("-c:a", "aac", "-b:a", "192k", "-map", "1:a", "-shortest");
    }

    args.push("-movflags", "+faststart", "-y", this.outputPath);

    this.process = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    this.stderrBuffer = "";
    this.process.stderr.on("data", (data) => {
      const message = data.toString();
      this.stderrBuffer += message;
      const frameMatch = message.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        this.emit("progress", { frame: parseInt(frameMatch[1], 10) });
      }
    });

    this.process.on("close", (code) => {
      this.isFinished = true;
      if (code === 0) {
        this.emit("complete", { path: this.outputPath });
      } else {
        this.emit(
          "error",
          new Error(`FFmpeg exited with code ${code}: ${this.stderrBuffer.slice(-500)}`)
        );
      }
    });

    this.process.on("error", (err: NodeJS.ErrnoException) => {
      this.isFinished = true;
      if (err.code === "ENOENT") {
        const ffmpegError = new Error(
          "FFmpeg not found. Install ffmpeg and add it to your PATH."
        ) as NodeJS.ErrnoException;
        ffmpegError.code = "FFMPEG_NOT_FOUND";
        this.emit("error", ffmpegError);
      } else {
        this.emit("error", err);
      }
    });

    return this;
  }

  writeFrame(frameBuffer: Buffer) {
    return new Promise<void>((resolve, reject) => {
      if (!this.process || this.isFinished) {
        reject(new Error("Pipeline not started or already finished"));
        return;
      }

      const onError = (err: Error) => {
        this.process?.stdin.removeListener("drain", onDrain);
        reject(err);
      };
      const onDrain = () => {
        this.process?.stdin.removeListener("error", onError);
        resolve();
      };

      this.process.stdin.once("error", onError);
      const canContinue = this.process.stdin.write(frameBuffer);

      if (canContinue) {
        this.process.stdin.removeListener("error", onError);
        resolve();
      } else {
        this.process.stdin.once("drain", onDrain);
      }
    });
  }

  finish() {
    return new Promise<{ path: string }>((resolve, reject) => {
      if (!this.process) {
        reject(new Error("Pipeline not started"));
        return;
      }

      this.once("complete", resolve);
      this.once("error", reject);
      this.process.stdin.end();
    });
  }

  cancel() {
    if (this.process && !this.isFinished) {
      this.process.kill("SIGTERM");
      this.isFinished = true;
    }
  }
}
