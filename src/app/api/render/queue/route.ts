import { queueInstance } from "@/server/revert-to-video/queueInstance";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(queueInstance.getSnapshot());
}
