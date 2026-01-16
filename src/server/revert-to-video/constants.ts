import path from "path";

export const OUTPUT_DIR = process.env.RTV_OUTPUT_DIR
  ? path.resolve(process.env.RTV_OUTPUT_DIR)
  : path.join(process.cwd(), "output");

export const MAX_CONCURRENT = Number(process.env.RTV_MAX_CONCURRENT || 1);
