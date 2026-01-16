import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { OUTPUT_DIR } from "@/server/revert-to-video/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.inputPath || !body.format) {
    return Response.json({ error: "Missing inputPath or format" }, { status: 400 });
  }

  const supportedFormats = ["mp4", "webm", "gif"];
  if (!supportedFormats.includes(body.format)) {
    return Response.json(
      { error: `Unsupported format: ${body.format}`, supported: supportedFormats },
      { status: 400 }
    );
  }

  try {
    await fs.access(body.inputPath);
  } catch {
    return Response.json({ error: "Input file not found" }, { status: 404 });
  }

  const jobId = crypto.randomUUID();
  const outputPath = path.join(OUTPUT_DIR, `${jobId}.${body.format}`);

  try {
    await convertVideo(body.inputPath, outputPath, body.format, body.options || {});
    return Response.json({
      jobId,
      format: body.format,
      path: outputPath,
      downloadUrl: `/api/download/${jobId}.${body.format}`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function convertVideo(inputPath: string, outputPath: string, format: string, options: Record<string, unknown>) {
  return new Promise<{ path: string }>((resolve, reject) => {
    let args = ["-i", inputPath];

    switch (format) {
      case "mp4":
        args.push(
          "-c:v",
          "libx264",
          "-preset",
          String(options.preset || "medium"),
          "-crf",
          String(options.crf || 23),
          "-c:a",
          "aac",
          "-movflags",
          "+faststart"
        );
        break;
      case "webm":
        args.push(
          "-c:v",
          "libvpx-vp9",
          "-crf",
          String(options.crf || 30),
          "-b:v",
          "0",
          "-c:a",
          "libopus"
        );
        break;
      case "gif":
        args = [
          "-i",
          inputPath,
          "-vf",
          `fps=${options.fps || 15},scale=${options.width || 480}:-1:flags=lanczos`,
          "-loop",
          "0",
        ];
        break;
      default:
        break;
    }

    args.push("-y", outputPath);

    const ffmpeg = spawn("ffmpeg", args, { shell: true });
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve({ path: outputPath });
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });
    ffmpeg.on("error", reject);
  });
}
