/**
 * Audio Capture Engine
 * Manages MediaStream capture, Web Audio Analyser, MediaRecorder, and waveform peak extraction.
 */

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  duration: number;
  peaks: number[];
}

export interface AudioEngineCallbacks {
  onTick: (elapsedMs: number) => void;
  onVisualData: (dataArray: Uint8Array, averageVolume: number) => void;
  onStateChange: (state: 'idle' | 'recording' | 'paused') => void;
  onAutoStop?: () => void;
}

export class AudioCaptureEngine {
  private onTick: (elapsedMs: number) => void;
  private onVisualData: (dataArray: Uint8Array, averageVolume: number) => void;
  private onStateChange: (state: 'idle' | 'recording' | 'paused') => void;
  private onAutoStop?: () => void;

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private audioChunks: Blob[] = [];
  private elapsedTime = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private visualizerRafId: number | null = null;

  public isRecording = false;
  public isPaused = false;
  public maxDurationSeconds = 240; // 240 seconds Actions on Google SSML ceiling
  public enforceSSML = true;

  constructor(callbacks: AudioEngineCallbacks) {
    this.onTick = callbacks.onTick;
    this.onVisualData = callbacks.onVisualData;
    this.onStateChange = callbacks.onStateChange;
    this.onAutoStop = callbacks.onAutoStop;
  }

  /**
   * Detect best modern MIME type (Opus in OGG/WebM is standard for Actions on Google).
   */
  public getSupportedMimeType(): string {
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/mp4'
    ];
    for (const type of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  public async startRecording(enforceSSML = true, noiseSuppression = true): Promise<void> {
    this.enforceSSML = enforceSSML;
    this.audioChunks = [];
    this.elapsedTime = 0;

    // Obtain microphone stream with acoustic enhancements
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1, // Voice recording optimal in mono for Assistant SSML
        sampleRate: 48000,
        echoCancellation: true,
        noiseSuppression: noiseSuppression,
        autoGainControl: true
      }
    });

    // Initialize AudioContext & AnalyserNode for live visualizer
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.analyser);

    const mimeType = this.getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType
      ? { mimeType, audioBitsPerSecond: 128000 }
      : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Emit 250ms chunks for steady streaming
    this.isRecording = true;
    this.isPaused = false;

    this.startTimer();
    this.startVisualizerLoop();
    this.onStateChange('recording');
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedTime += 100;
        const seconds = this.elapsedTime / 1000;
        this.onTick(this.elapsedTime);

        if (this.enforceSSML && seconds >= this.maxDurationSeconds) {
          this.stopRecording(true);
        }
      }
    }, 100);
  }

  private startVisualizerLoop(): void {
    if (!this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!this.isRecording || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average decibel proxy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      this.onVisualData(dataArray, average);

      this.visualizerRafId = requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }

  public pauseRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
    this.mediaRecorder.pause();
    this.isPaused = true;
    this.onStateChange('paused');
  }

  public resumeRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') return;
    this.mediaRecorder.resume();
    this.isPaused = false;
    this.onStateChange('recording');
  }

  public async stopRecording(autoStopped = false): Promise<RecordingResult | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.visualizerRafId) cancelAnimationFrame(this.visualizerRafId);

        // Clean up audio tracks
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
        }

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const durationSec = this.elapsedTime / 1000;

        // Generate waveform preview peaks
        const peaks = await this.extractWaveformPeaks(blob);

        this.isRecording = false;
        this.isPaused = false;
        this.onStateChange('idle');

        if (autoStopped && this.onAutoStop) {
          this.onAutoStop();
        }

        resolve({
          blob,
          mimeType,
          duration: durationSec,
          peaks
        });
      };

      this.mediaRecorder.stop();
    });
  }

  public discardRecording(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.visualizerRafId) cancelAnimationFrame(this.visualizerRafId);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    this.isRecording = false;
    this.isPaused = false;
    this.audioChunks = [];
    this.onStateChange('idle');
  }

  private async extractWaveformPeaks(blob: Blob): Promise<number[]> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const offlineContext = new AudioCtx();
      const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const sampleCount = 45; // Bars for card preview
      const blockSize = Math.floor(channelData.length / sampleCount);
      const peaks: number[] = [];

      for (let i = 0; i < sampleCount; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j] || 0);
        }
        peaks.push(Math.min(1, (sum / blockSize) * 4)); // Boost visibility
      }
      return peaks;
    } catch (err) {
      console.warn('[AudioEngine] Peak extraction fallback:', err);
      return Array.from({ length: 45 }, () => 0.2 + Math.random() * 0.6);
    }
  }
}
