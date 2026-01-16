import { queueInstance } from "@/server/revert-to-video/queueInstance";
import { validateRecipe } from "@/features/revert-to-video/recipeTypes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.recipe) {
    return Response.json({ error: "Missing recipe" }, { status: 400 });
  }

  const validation = validateRecipe(body.recipe);
  if (!validation.valid) {
    return Response.json(
      { error: "Invalid recipe", details: validation.errors },
      { status: 400 }
    );
  }

  const jobId = queueInstance.enqueue(body.recipe);
  return Response.json({
    jobId,
    wsUrl: null,
    status: "queued",
  });
}
