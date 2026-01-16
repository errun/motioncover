import { Renderer, Camera, Program, Mesh, Plane, Texture, type OGLRenderingContext } from "ogl";
import { vertexShader, fragmentShader } from "./shaders";
import { loadImage } from "./utils";

export class CoverLedVisualizer {
  private container: HTMLElement;
  private renderer: Renderer | null = null;
  private gl: OGLRenderingContext | null = null;
  private camera: Camera | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private texture: Texture | null = null;
  private fallbackImg: HTMLImageElement | null = null;
  private rafId: number | null = null;
  private time = 0;
  private lowValue = 0;
  private midValue = 0;
  private highValue = 0;
  private imageResolution = { width: 1, height: 1 };
  private resizeObserver: ResizeObserver | null = null;
  private boundResize: (() => void) | null = null;
  private isDisposed = false;
  private isFallback = false;
  private imageUrl: string;

  constructor(container: HTMLElement, imageUrl: string) {
    this.container = container;
    this.imageUrl = imageUrl;
    void this.init(imageUrl);
  }

  private async init(imageUrl: string) {
    try {
      this.setupRenderer();
      if (!this.gl) {
        this.createFallback();
        return;
      }
      this.setupCamera();
      await this.setupTexture(imageUrl);
      this.setupMesh();
      this.setupResize();
      this.render();
    } catch (error) {
      console.error("[CoverLedVisualizer] init failed", error);
    }
  }

  private setupRenderer() {
    this.renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: false,
      antialias: true,
    });

    this.gl = this.renderer.gl;
    if (!this.gl) {
      return;
    }
    this.container.appendChild(this.gl.canvas as HTMLCanvasElement);
    this.resize();
  }

  private setupCamera() {
    if (!this.gl) return;
    this.camera = new Camera(this.gl, {
      left: -0.5,
      right: 0.5,
      top: 0.5,
      bottom: -0.5,
      near: 0.01,
      far: 100,
    });
    this.camera.position.z = 1;
  }

  private async setupTexture(imageUrl: string) {
    if (!this.gl) return;
    const img = await loadImage(imageUrl);
    this.imageResolution = { width: img.width, height: img.height };
    this.texture = new Texture(this.gl, { image: img, generateMipmaps: true });
  }

  private setupMesh() {
    if (!this.gl || !this.texture) return;
    const { width, height } = this.renderer || { width: 1, height: 1 };

    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTexture: { value: this.texture },
        uTime: { value: 0 },
        uAudioLow: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioHigh: { value: 0 },
        uResolution: { value: [width, height] },
        uImageResolution: { value: [this.imageResolution.width, this.imageResolution.height] },
      },
    });

    const geometry = new Plane(this.gl, {
      width: 1,
      height: 1,
      widthSegments: 32,
      heightSegments: 32,
    });

    this.mesh = new Mesh(this.gl, { geometry, program: this.program });
  }

  private setupResize() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
      return;
    }

    this.boundResize = this.resize.bind(this);
    window.addEventListener("resize", this.boundResize);
  }

  private resize() {
    if (!this.renderer) return;
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height);
    if (this.program) {
      this.program.uniforms.uResolution.value = [width, height];
    }
  }

  private render = () => {
    if (this.isDisposed) return;
    if (this.isFallback) return;
    if (!this.renderer || !this.program || !this.camera || !this.mesh) return;

    this.rafId = requestAnimationFrame(this.render);
    this.time += 0.016;

    this.program.uniforms.uTime.value = this.time;
    this.program.uniforms.uAudioLow.value = this.lowValue;
    this.program.uniforms.uAudioMid.value = this.midValue;
    this.program.uniforms.uAudioHigh.value = this.highValue;

    this.renderer.render({ scene: this.mesh, camera: this.camera });
  };

  setLow(value: number) {
    this.lowValue = value;
  }

  setMid(value: number) {
    this.midValue = value;
  }

  setHigh(value: number) {
    this.highValue = value;
  }

  setBreath(value: number) {
    this.setLow(value);
  }

  setChroma(value: number) {
    this.setHigh(value);
  }

  async updateImage(url: string) {
    if (this.isDisposed || this.isFallback) return;
    try {
      const img = await loadImage(url);
      this.imageUrl = url;
      this.imageResolution = { width: img.width, height: img.height };
      if (this.texture && this.program) {
        this.texture.image = img;
        this.texture.needsUpdate = true;
        this.program.uniforms.uImageResolution.value = [img.width, img.height];
      }
    } catch (error) {
      console.error("[CoverLedVisualizer] updateImage failed", error);
    }
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.boundResize) {
      window.removeEventListener("resize", this.boundResize);
      this.boundResize = null;
    }

    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture.texture);
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program.program);
    }

    if (this.gl?.canvas) {
      this.gl.canvas.remove();
    }

    if (this.fallbackImg) {
      this.fallbackImg.remove();
      this.fallbackImg = null;
    }

    this.renderer = null;
    this.camera = null;
    this.program = null;
    this.mesh = null;
    this.texture = null;
    this.gl = null;
  }

  private createFallback() {
    if (this.isFallback) return;
    this.isFallback = true;
    const img = document.createElement("img");
    img.src = this.imageUrl;
    img.alt = "Cover";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    this.container.appendChild(img);
    this.fallbackImg = img;
  }
}
