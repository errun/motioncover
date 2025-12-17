import { NextRequest, NextResponse } from "next/server";

// Depth estimation using Replicate API (Depth Anything V2)
// Requires REPLICATE_API_TOKEN environment variable

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (!replicateToken) {
      // Fallback: Generate a simple gradient depth map
      // This is a placeholder - in production, use a real depth estimation API
      return NextResponse.json({
        depthMapUrl: await generateFallbackDepthMap(imageBase64),
        method: "fallback",
      });
    }

    // Use Replicate API with Depth Anything V2
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "667c80e9c25e3f8d9f04fdf5f5d4d26c5a67d64ba6d1db0e0c6e92f8f8a07c8b", // Depth Anything V2
        input: {
          image: imageBase64.startsWith("data:") 
            ? imageBase64 
            : `data:image/jpeg;base64,${imageBase64}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Poll for result
    let result = prediction;
    while (result.status === "starting" || result.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            "Authorization": `Token ${replicateToken}`,
          },
        }
      );
      result = await pollResponse.json();
    }

    if (result.status === "succeeded" && result.output) {
      return NextResponse.json({
        depthMapUrl: result.output,
        method: "replicate",
      });
    } else {
      throw new Error("Depth estimation failed");
    }
  } catch (error) {
    console.error("Depth estimation error:", error);
    
    // Return fallback depth map on error
    try {
      const { imageBase64 } = await request.json();
      return NextResponse.json({
        depthMapUrl: await generateFallbackDepthMap(imageBase64),
        method: "fallback",
        error: String(error),
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to generate depth map" },
        { status: 500 }
      );
    }
  }
}

// Generate a simple radial gradient depth map as fallback
async function generateFallbackDepthMap(imageBase64: string): Promise<string> {
  // Create a simple radial gradient depth map
  // Center is closer (white), edges are farther (black)
  const canvas = typeof document !== "undefined" 
    ? document.createElement("canvas")
    : null;
    
  if (!canvas) {
    // Server-side: return a placeholder gradient
    return createRadialGradientDataUrl(512, 512);
  }

  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    return createRadialGradientDataUrl(512, 512);
  }

  // Create radial gradient (center is white/close, edges are black/far)
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.5, "#888888");
  gradient.addColorStop(1, "#000000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  return canvas.toDataURL("image/png");
}

// Create a simple radial gradient data URL for server-side
function createRadialGradientDataUrl(width: number, height: number): string {
  // Return a pre-generated radial gradient as base64
  // This is a simple placeholder
  return "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="depth" cx="50%" cy="50%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="50%" style="stop-color:#888888"/>
          <stop offset="100%" style="stop-color:#000000"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#depth)"/>
    </svg>
  `);
}

