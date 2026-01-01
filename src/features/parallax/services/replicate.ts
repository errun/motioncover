/**
 * Replicate ZoeDepth API 调用
 * @module features/parallax/services/replicate
 */

import type { ZoeDepthModel, ReplicatePrediction } from "./types";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

/** 可用的 ZoeDepth 模型列表 */
export const ZOEDEPTH_MODELS: ZoeDepthModel[] = [
  {
    name: "zedge/zoedepth",
    version: "zedge/zoedepth:fd85428545f04150f59856dab2a51a7be2ca5003a331920b0e4303b17b411332",
    extraInput: {},
  },
  {
    name: "cjwbw/zoedepth",
    version: "cjwbw/zoedepth:6375723d97400d3ac7b88e3022b738bf6f433ae165c4a2acd1955eaa6b8fcb62",
    extraInput: { model_type: "ZoeD_N" },
  },
];

/**
 * 调用 Replicate 上的 ZoeDepth，并加超时保护
 */
export async function callZoeDepthWithTimeout(
  imageBase64: string,
  token: string,
  maxWaitMs: number,
  debugSteps: string[] | undefined,
  modelVersion: string,
  extraInput: Record<string, unknown>
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), maxWaitMs);
  const push = (msg: string) => debugSteps?.push(msg);

  try {
    // 1. 创建预测任务
    push(`向 Replicate 创建预测任务 (${modelVersion.split(":")[0]})`);
    const createRes = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          image: imageBase64.startsWith("data:")
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`,
          ...extraInput,
        },
      }),
      signal: controller.signal,
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => createRes.statusText);
      push(`创建预测任务失败：${createRes.status} ${errText}`);
      throw new Error(`Replicate create error: ${createRes.status} ${errText}`);
    }

    let prediction: ReplicatePrediction = await createRes.json();
    push(`预测任务创建成功，id=${prediction.id}, 初始状态=${prediction.status}`);

    const start = Date.now();

    // 2. 轮询结果
    while (prediction.status === "starting" || prediction.status === "processing") {
      if (Date.now() - start > maxWaitMs) {
        push("轮询超时，停止等待 ZoeDepth 结果");
        throw new Error("Replicate depth estimation timeout");
      }

      push(`当前状态：${prediction.status}，1 秒后继续轮询`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollUrl =
        (prediction.urls && prediction.urls.get) ||
        `https://api.replicate.com/v1/predictions/${prediction.id}`;

      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Token ${token}` },
      });

      if (!pollRes.ok) {
        const errText = await pollRes.text().catch(() => pollRes.statusText);
        push(`轮询预测任务失败：${pollRes.status} ${errText}`);
        throw new Error(`Replicate poll error: ${pollRes.status} ${errText}`);
      }

      prediction = await pollRes.json();
      push(`轮询到新状态：${prediction.status}`);
    }

    if (prediction.status !== "succeeded" || !prediction.output) {
      push(`预测任务未成功结束，status=${prediction.status}, error=${prediction.error || ""}`);
      throw new Error(
        `Replicate prediction failed with status ${prediction.status}: ${prediction.error || ""}`
      );
    }

    const output = prediction.output;
    const url = Array.isArray(output) ? output[0] : output;

    if (!url || typeof url !== "string") {
      push("prediction.output 不是有效的 URL 字符串");
      throw new Error("Unexpected ZoeDepth output format from Replicate");
    }

    push("成功获取 ZoeDepth 输出 URL");
    return url;
  } finally {
    clearTimeout(timeoutId);
  }
}

