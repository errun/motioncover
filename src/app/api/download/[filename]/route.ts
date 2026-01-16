import fs from "fs/promises";
import path from "path";
import { OUTPUT_DIR } from "@/server/revert-to-video/constants";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ filename: string }>;
};

const contentTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  const filePath = path.join(OUTPUT_DIR, filename);

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
}
