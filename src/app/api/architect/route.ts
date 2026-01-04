import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const FLUX_API_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";

const DEFAULT_FLUX_PROMPT =
	"A vertical street level view of a densely atmospheric cyberpunk city. Neon signs glow wildly, a futuristic car drives on the road, and towering skyscrapers fill the background. The image is rendered in a distinct flat composition style with clear visual layers for foreground, middle ground, and background. High contrast lighting with a synthwave color palette of neon pinks, purples, and blues. Graphic novel aesthetic.";

const IMAGES_DIR = path.join(process.cwd(), "public", "imgs");

function buildStamp() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

function getExtensionFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,/);
  const contentType = match?.[1] || "image/png";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "bin";
}

async function saveDataUrlFile(
  dataUrl: string,
  prefix: string,
  stamp: string,
  sequence?: number
) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const ext = getExtensionFromDataUrl(dataUrl);
  const seqPart = sequence ? `-${String(sequence).padStart(4, "0")}` : "";
  const fileName = `${prefix}${seqPart}-${stamp}.${ext}`;
  const filePath = path.join(IMAGES_DIR, fileName);
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.writeFile(filePath, Buffer.from(match[2], "base64"));
  return { fileName, publicUrl: `/imgs/${fileName}` };
}

async function updateLatestManifest(partial: Record<string, unknown>) {
  const filePath = path.join(IMAGES_DIR, "latest.json");
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    current = {};
  }
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(next, null, 2));
  return next;
}

const HISTORY_FILE = path.join(IMAGES_DIR, "history.json");

type ArchitectRun = {
  index: number;
  fileName: string;
  publicUrl: string;
  prompt: string;
  createdAt: string;
};

type HistoryFile = {
  counters: { architect: number; layers: number };
  architectRuns: ArchitectRun[];
  layerRuns: Array<Record<string, unknown>>;
};

async function readHistory(): Promise<HistoryFile> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as HistoryFile;
    return {
      counters: parsed.counters || { architect: 0, layers: 0 },
      architectRuns: parsed.architectRuns || [],
      layerRuns: parsed.layerRuns || [],
    };
  } catch {
    return {
      counters: { architect: 0, layers: 0 },
      architectRuns: [],
      layerRuns: [],
    };
  }
}

async function writeHistory(history: HistoryFile) {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

type FluxPrediction = {
  id: string;
  status: string;
  output?: string[] | string | null;
  error?: string | null;
};

async function callFluxArchitect(
  prompt: string,
  steps: string[]
): Promise<{ imageUrl: string; dataUrl: string }> {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    steps.push("未配置 REPLICATE_API_TOKEN，无法调用 FLUX 1.1 Pro");
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  steps.push("调用 FLUX 1.1 Pro 生成底图");

  const response = await fetch(FLUX_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "2:3", // 竖版画面，更适合 Canvas / Motion Cover
        output_format: "webp",
        output_quality: 80,
        safety_tolerance: 2,
        prompt_upsampling: true,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    steps.push(`FLUX API 返回错误：${response.status} ${text.substring(0, 200)}`);
    throw new Error(`FLUX API error: ${response.status} ${text}`);
  }

  const prediction = (await response.json()) as FluxPrediction;
  steps.push(`FLUX 请求完成，状态：${prediction.status}`);

  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(
      `FLUX prediction failed: ${prediction.status} ${prediction.error || ""}`
    );
  }

  const output = prediction.output;
  const imageUrl = Array.isArray(output) ? output[0] : output;

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("FLUX 输出不是有效的图片 URL");
  }

  steps.push("开始下载 FLUX 生成的图片");

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    const text = await imageRes.text().catch(() => "");
    steps.push(`下载图片失败：${imageRes.status} ${text.substring(0, 200)}`);
    throw new Error(`Failed to download image: ${imageRes.status}`);
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = imageRes.headers.get("content-type") || "image/webp";
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${contentType};base64,${base64}`;

  steps.push("图片下载并转换为 data URL 完成");

  return { imageUrl, dataUrl };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const steps: string[] = [];

  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // ignore, 使用默认提示词
    }

    const promptFromClient =
      body && typeof body === "object" && "prompt" in body
        ? (body as { prompt?: unknown }).prompt
        : undefined;

    const prompt =
      typeof promptFromClient === "string" && promptFromClient.trim().length > 0
        ? promptFromClient.trim()
        : DEFAULT_FLUX_PROMPT;

    steps.push("开始处理 Architect 请求");

    const { imageUrl, dataUrl } = await callFluxArchitect(prompt, steps);
    const stamp = buildStamp();
    const history = await readHistory();
    const nextIndex = history.counters.architect + 1;
    history.counters.architect = nextIndex;
    const saved = await saveDataUrlFile(dataUrl, "architect", stamp, nextIndex);
    await updateLatestManifest({
      architect: saved.publicUrl,
      architectFile: saved.fileName,
      architectPrompt: prompt,
      architectIndex: nextIndex,
    });
    history.architectRuns.unshift({
      index: nextIndex,
      fileName: saved.fileName,
      publicUrl: saved.publicUrl,
      prompt,
      createdAt: new Date().toISOString(),
    });
    await writeHistory(history);
    steps.push(`已保存图片: ${saved.fileName}`);

    return NextResponse.json({
      imageUrl,
      dataUrl,
      prompt,
      saved,
      debug: {
        steps,
        elapsedMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    steps.push(`错误：${String(error)}`);
    return NextResponse.json(
      {
        error: String(error),
        debug: {
          steps,
          elapsedMs: Date.now() - startedAt,
        },
      },
      { status: 500 }
    );
  }
}
