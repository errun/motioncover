import { RenderQueue } from "./RenderQueue";
import { MAX_CONCURRENT, OUTPUT_DIR } from "./constants";

declare global {
  // eslint-disable-next-line no-var
  var __rtvQueue: RenderQueue | undefined;
}

export const queueInstance: RenderQueue = global.__rtvQueue || new RenderQueue({
  maxConcurrent: MAX_CONCURRENT,
  outputDir: OUTPUT_DIR,
});

if (!global.__rtvQueue) {
  global.__rtvQueue = queueInstance;
  setInterval(() => {
    queueInstance.cleanup(3600000);
  }, 600000);
}
