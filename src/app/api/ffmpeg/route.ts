import { execSync } from "child_process";

export const runtime = "nodejs";

export async function GET() {
  try {
    const output = execSync("ffmpeg -version", { stdio: "pipe" }).toString();
    const firstLine = output.split("\n")[0] || "ffmpeg";
    return Response.json({ available: true, version: firstLine.trim() });
  } catch {
    return Response.json({ available: false, version: "unavailable" });
  }
}
