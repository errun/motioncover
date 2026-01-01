/**
 * Client-side depth map generator
 * Creates a pseudo depth map based on image luminance and edge detection
 * 
 * @module features/parallax/services/localDepthGenerator
 */

export async function generateLocalDepthMap(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Use a reasonable size for processing
        const maxSize = 512;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        // Draw original image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Create depth map based on luminance
        // Lighter areas = closer (white), Darker areas = farther (black)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Apply contrast enhancement for more dramatic depth
          let depth = luminance;
          depth = ((depth / 255 - 0.5) * 1.5 + 0.5) * 255; // Increase contrast
          depth = Math.max(0, Math.min(255, depth));
          
          // Set grayscale value
          data[i] = depth;
          data[i + 1] = depth;
          data[i + 2] = depth;
          // Alpha stays the same
        }
        
        // Apply Gaussian blur for smoother depth
        applyGaussianBlur(imageData, canvas.width, canvas.height, 3);
        
        ctx.putImageData(imageData, 0, 0);
        
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
}

// Simple Gaussian blur implementation
function applyGaussianBlur(
  imageData: ImageData,
  width: number,
  height: number,
  radius: number
): void {
  const data = imageData.data;
  const kernel = createGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  // Create temporary buffer
  const temp = new Uint8ClampedArray(data.length);
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const px = x + k - halfKernel;
        if (px >= 0 && px < width) {
          const idx = (y * width + px) * 4;
          const weight = kernel[k];
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          a += data[idx + 3] * weight;
          weightSum += weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      temp[idx] = r / weightSum;
      temp[idx + 1] = g / weightSum;
      temp[idx + 2] = b / weightSum;
      temp[idx + 3] = a / weightSum;
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const py = y + k - halfKernel;
        if (py >= 0 && py < height) {
          const idx = (py * width + x) * 4;
          const weight = kernel[k];
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
          a += temp[idx + 3] * weight;
          weightSum += weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = r / weightSum;
      data[idx + 1] = g / weightSum;
      data[idx + 2] = b / weightSum;
      data[idx + 3] = a / weightSum;
    }
  }
}

function createGaussianKernel(radius: number): number[] {
  const size = radius * 2 + 1;
  const kernel: number[] = [];
  const sigma = radius / 2;
  
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
  }
  
  return kernel;
}

