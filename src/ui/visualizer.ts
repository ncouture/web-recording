/**
 * Canvas Waveform Visualizer
 * Renders real-time audio frequency data and idle states with HiDPI support.
 */

export class WaveformVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.drawIdle();
  }

  public drawIdle(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.beginPath();
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2;
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
  }

  public render(dataArray: Uint8Array, averageVolume: number): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    this.ctx.clearRect(0, 0, width, height);

    const bufferLength = dataArray.length;
    const barWidth = (width / bufferLength) * 2.2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * (height * 0.85);

      const gradient = this.ctx.createLinearGradient(
        0,
        height / 2 - barHeight / 2,
        0,
        height / 2 + barHeight / 2
      );
      gradient.addColorStop(0, '#818cf8');
      gradient.addColorStop(0.5, '#6366f1');
      gradient.addColorStop(1, '#4338ca');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);
      x += barWidth;
    }

    // Update decibel badge
    const db = Math.round((averageVolume / 255) * 60 - 60);
    const dbEl = document.getElementById('liveDbText');
    if (dbEl) dbEl.innerText = `${db} dB`;
  }
}
