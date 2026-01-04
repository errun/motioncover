import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

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

type LayerRun = {
  index: number;
  foreground: string;
  background: string;
  mask?: string;
  layers?: string[];
  method?: string;
  createdAt: string;
  degraded?: boolean;
  degradeReason?: string;
};

type HistoryFile = {
  counters: { architect: number; layers: number };
  architectRuns: Array<Record<string, unknown>>;
  layerRuns: LayerRun[];
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

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const REMBG_TIMEOUT_MS = 180000;
const LAMA_TIMEOUT_MS = 240000;
const QWEN_API_URL =
  "https://api.replicate.com/v1/models/qwen/qwen-image-layered/predictions";
const QWEN_TIMEOUT_MS = 240000;
const QWEN_DEFAULT_LAYERS = 4;

// 抠图模型
const REMBG_VERSION = "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

// 背景擦除模型 (LaMa) - 只会用周围像素填充，不会生成新内容
const LAMA_VERSION = "allenhooo/lama:cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const debugSteps: string[] = [];
  const push = (msg: string) => debugSteps.push(msg);

  let imageBase64: string | undefined;
  let method: "rembg" | "qwen" = "rembg";
  let numLayers = QWEN_DEFAULT_LAYERS;
  try {
    const body = await request.json();
    imageBase64 = body?.imageBase64;
    if (body?.method === "qwen") {
      method = "qwen";
      const requestedLayers = Number(body?.numLayers);
      if (Number.isFinite(requestedLayers)) {
        numLayers = Math.min(Math.max(Math.round(requestedLayers), 2), 8);
      }
    }
    push("收到请求");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    // ========== 第一步：抠图 (rembg) ==========
    push("第一步：调用 rembg 抠图");
    const imageDataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    if (method === "qwen") {
      push("Step 1: call qwen-image-layered");
      const qwenOutputs = await callReplicateWithPolling(
        QWEN_API_URL,
        replicateToken,
        {
          input: {
            image: imageDataUrl,
            go_fast: true,
            num_layers: numLayers,
            description:
              "foreground: single futuristic sports car only, centered, clean roadway; background: cyberpunk cityscape with neon signs and skyscrapers; exclude poles, wires, traffic lights, and foreground signs",
            output_format: "webp",
            output_quality: 95,
          },
        },
        QWEN_TIMEOUT_MS,
        push
      );

      if (qwenOutputs.length === 0) {
        throw new Error("qwen-image-layered returned empty output");
      }

      const layerDataUrls = await Promise.all(
        qwenOutputs.map((url) => toDataUrl(url))
      );
      const stamp = buildStamp();
      const history = await readHistory();
      const nextIndex = history.counters.layers + 1;
      history.counters.layers = nextIndex;

      const savedLayers = await Promise.all(
        layerDataUrls.map((dataUrl, index) =>
          saveDataUrlFile(
            dataUrl,
            `layers-qwen-layer-${String(index + 1).padStart(2, "0")}`,
            stamp,
            nextIndex
          )
        )
      );

      const foregroundDataUrl = layerDataUrls[0];
      const backgroundDataUrl = layerDataUrls[layerDataUrls.length - 1];

      await updateLatestManifest({
        layerForeground: savedLayers[0]?.publicUrl,
        layerBackground: savedLayers[savedLayers.length - 1]?.publicUrl,
        layerLayers: savedLayers.map((layer) => layer.publicUrl),
        layerIndex: nextIndex,
        layerMethod: "qwen",
        layerCount: savedLayers.length,
      });
      history.layerRuns.unshift({
        index: nextIndex,
        foreground: savedLayers[0]?.publicUrl || "",
        background: savedLayers[savedLayers.length - 1]?.publicUrl || "",
        layers: savedLayers.map((layer) => layer.publicUrl),
        createdAt: new Date().toISOString(),
        method: "qwen",
      });
      await writeHistory(history);

      const elapsed = Date.now() - startedAt;
      push(`Done in ${elapsed}ms`);

      return NextResponse.json({
        success: true,
        foregroundUrl: foregroundDataUrl,
        backgroundUrl: backgroundDataUrl,
        layers: layerDataUrls,
        debug: debugSteps,
        elapsed,
        method: "qwen",
      });
    }

    const rembgOutputs = await callReplicateWithPolling(
      REPLICATE_API_URL,
      replicateToken,
      {
        version: REMBG_VERSION,
        input: { image: imageDataUrl },
      },
      REMBG_TIMEOUT_MS,
      push
    );
    const rembgResult = rembgOutputs[0];

    if (!rembgResult) {
      throw new Error("rembg 返回空结果");
    }
    push(`抠图完成，得到透明背景人物图: ${rembgResult.substring(0, 50)}...`);
    const foregroundDataUrl = await toDataUrl(rembgResult);

    // ========== 第二步：生成 Mask ==========
    // rembg 返回的是透明背景 PNG，我们需要把它转成黑白 mask
    // 人物区域 = 白色，背景 = 黑色
    push("第二步：从透明图生成 Mask");
    const maskDataUrl = await generateMaskFromTransparentImage(foregroundDataUrl);
    push("Mask 生成完成");

	    // ========== 第三步：擦除人物 (LaMa) ==========
	    // LaMa 只会用周围像素填充，100% 不会画出人物
	    // 注意：LaMa 需要真正的 URL，不能用 base64
	    push("第三步：调用 LaMa 擦除人物区域");

	    // 使用原图的 data URL 和 mask 的 data URL
	    // Replicate 支持 data URL 作为输入
	    try {
	      const lamaOutputs = await callReplicateWithPolling(
	        REPLICATE_API_URL,
	        replicateToken,
	        {
	          version: LAMA_VERSION,
	          input: {
	            image: imageDataUrl,   // 原图 (data URL)
	            mask: maskDataUrl,     // mask (data URL)
	          },
	        },
	        LAMA_TIMEOUT_MS,
	        push
	      );
	      const lamaResult = lamaOutputs[0];

	      if (!lamaResult) {
	        throw new Error("LaMa 返回空结果");
	      }
	      push(`背景生成完成: ${lamaResult.substring(0, 50)}...`);
	      const backgroundDataUrl = await toDataUrl(lamaResult);
	      const stamp = buildStamp();
	      const history = await readHistory();
	      const nextIndex = history.counters.layers + 1;
	      history.counters.layers = nextIndex;
	      const savedForeground = await saveDataUrlFile(foregroundDataUrl, "layers-foreground", stamp, nextIndex);
	      const savedBackground = await saveDataUrlFile(backgroundDataUrl, "layers-background", stamp, nextIndex);
	      const savedMask = await saveDataUrlFile(maskDataUrl, "layers-mask", stamp, nextIndex);
	      await updateLatestManifest({
	        layerForeground: savedForeground.publicUrl,
	        layerBackground: savedBackground.publicUrl,
	        layerMask: savedMask.publicUrl,
	        layerIndex: nextIndex,
	        layerMethod: "rembg",
	        layerCount: 2,
	      });
	      history.layerRuns.unshift({
	        index: nextIndex,
	        foreground: savedForeground.publicUrl,
	        background: savedBackground.publicUrl,
	        mask: savedMask.publicUrl,
	        createdAt: new Date().toISOString(),
	        method: "rembg",
	      });
	      await writeHistory(history);

	      const elapsed = Date.now() - startedAt;
	      push(`全部完成，耗时 ${elapsed}ms`);

	      return NextResponse.json({
	        success: true,
	        foregroundUrl: foregroundDataUrl,   // 透明背景人物
	        backgroundUrl: backgroundDataUrl,    // LaMa 擦除后的纯背景
	        maskUrl: maskDataUrl,         // 黑白 mask
	        debug: debugSteps,
	        elapsed,
	        method: "rembg",
	      });
	    } catch (lamaError) {
	      const errStr = String(lamaError);
	      const isRateLimit429 =
	        errStr.includes("429") || errStr.toLowerCase().includes("throttled");

	      if (isRateLimit429) {
	        // A+B: 对 LaMa 步骤的 429 进行友好提示 + 启用降级策略
	        push(
	          "LaMa 步骤触发 Replicate 429 限流，将启用降级策略：返回 rembg 前景图 + 原始图像作为背景。"
	        );
	        const elapsed = Date.now() - startedAt;
	        const stamp = buildStamp();
	        const history = await readHistory();
	        const nextIndex = history.counters.layers + 1;
	        history.counters.layers = nextIndex;
	        const savedForeground = await saveDataUrlFile(foregroundDataUrl, "layers-foreground", stamp, nextIndex);
	        const savedBackground = await saveDataUrlFile(imageDataUrl, "layers-background", stamp, nextIndex);
	        const savedMask = await saveDataUrlFile(maskDataUrl, "layers-mask", stamp, nextIndex);
	        await updateLatestManifest({
	          layerForeground: savedForeground.publicUrl,
	          layerBackground: savedBackground.publicUrl,
	          layerMask: savedMask.publicUrl,
	          layerIndex: nextIndex,
	          layerMethod: "rembg",
	          layerCount: 2,
	        });
	        history.layerRuns.unshift({
	          index: nextIndex,
	          foreground: savedForeground.publicUrl,
	          background: savedBackground.publicUrl,
	          mask: savedMask.publicUrl,
	          createdAt: new Date().toISOString(),
	          degraded: true,
	          degradeReason: "rate_limited_lama_429",
	          method: "rembg",
	        });
	        await writeHistory(history);
	        push(`降级完成，耗时 ${elapsed}ms`);

	        return NextResponse.json({
	          success: true,
	          foregroundUrl: foregroundDataUrl,   // 透明背景人物
	          backgroundUrl: imageDataUrl,  // 降级：直接使用原图作为背景
	          maskUrl: maskDataUrl,         // 仍然返回 mask，方便调试
	          debug: debugSteps,
	          elapsed,
	          degraded: true,
	          degradeReason: "rate_limited_lama_429",
	          method: "rembg",
	        });
	      }

	      // 其他错误仍然交给外层 try/catch 处理
	      throw lamaError;
	    }

	} catch (error) {
	    const errStr = String(error);
	    push(`错误: ${errStr}`);

	    const isRateLimit429 =
	      errStr.includes("429") || errStr.toLowerCase().includes("throttled");

	    const friendlyMessage = isRateLimit429
	      ? "Replicate 返回 429：当前账号或该模型请求被限流（可能认为余额不足或请求过于频繁）。请稍等几秒后重试，或检查 API Token / 账单状态。"
	      : errStr;

	    return NextResponse.json({
	      error: friendlyMessage,
	      rawError: errStr,
	      debug: debugSteps,
	      rateLimit: isRateLimit429,
	    }, { status: 500 });
	  }
}

// Replicate API 轮询调用
async function callReplicateWithPolling(
  url: string,
  token: string,
  body: Record<string, unknown>,
  maxWaitMs: number,
  push: (msg: string) => void
): Promise<string[]> {
  // 创建预测
  push(`正在调用 ${url}...`);

  let createRes: Response;
  try {
    createRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (fetchError) {
    push(`fetch 错误: ${String(fetchError)}`);
    throw new Error(`网络请求失败: ${String(fetchError)}`);
  }

  if (!createRes.ok) {
    const text = await createRes.text();
    push(`API 错误: ${createRes.status} ${text.substring(0, 200)}`);
    throw new Error(`创建预测失败: ${createRes.status} ${text}`);
  }

  const prediction = await createRes.json();
  push(`预测已创建: ${prediction.id}, 状态: ${prediction.status}`);

  // 如果已完成
  if (prediction.status === "succeeded") {
    return extractOutputs(prediction.output);
  }

  // 轮询等待
  const pollUrl = prediction.urls?.get || `${REPLICATE_API_URL}/${prediction.id}`;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(2000);

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await pollRes.json();
    push(`轮询状态: ${result.status}`);

    if (result.status === "succeeded") {
      return extractOutputs(result.output);
    }
    if (result.status === "failed" || result.status === "canceled") {
      throw new Error(`预测失败: ${result.error || result.status}`);
    }
  }

  throw new Error("超时");
}

async function toDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function extractOutputs(output: unknown): string[] {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) {
    return output
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const url = (item as { url?: unknown }).url;
          if (typeof url === "string") return url;
        }
        return null;
      })
      .filter((item): item is string => typeof item === "string");
  }
  if (output && typeof output === "object") {
    const url = (output as { url?: unknown }).url;
    if (typeof url === "string") return [url];
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 从透明 PNG 生成黑白 Mask
// 人物区域（不透明）= 白色，背景（透明）= 黑色
async function generateMaskFromTransparentImage(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const sharp = await import("sharp");
    // 提取 alpha 通道作为 mask
    const alphaBuffer = await sharp.default(buffer)
      .extractChannel("alpha")
      .png()
      .toBuffer();

    const base64 = alphaBuffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    console.warn("sharp not available, using original image as mask");
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  }
}

