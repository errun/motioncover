import { queueInstance } from "@/server/revert-to-video/queueInstance";
import { MAX_CONCURRENT, OUTPUT_DIR } from "@/server/revert-to-video/constants";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    queue: queueInstance.getStats(),
    config: {
      maxConcurrent: MAX_CONCURRENT,
      outputDir: OUTPUT_DIR,
    },
  });
}
