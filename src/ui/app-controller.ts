/**
 * Application Controller
 * Orchestrates Audio Recording, Playback, IndexedDB storage, UI tabs, and platform interactions.
 */

import {
  createIcons,
  Mic,
  MicOff,
  Database,
  Download,
  Disc,
  ListMusic,
  ShieldCheck,
  AudioWaveform,
  Clock,
  Pause,
  Play,
  Trash2,
  Cpu,
  HardDriveDownload,
  CodeXml,
  Search,
  RotateCw,
  RotateCcw,
  Trash,
  Music,
  Volume2,
  Volume1,
  VolumeX,
  X,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Square,
  Code,
  Edit3,
  Info
} from 'lucide';

const appIcons = {
  Mic,
  MicOff,
  Database,
  Download,
  Disc,
  ListMusic,
  ShieldCheck,
  AudioWaveform,
  Clock,
  Pause,
  Play,
  Trash2,
  Cpu,
  HardDriveDownload,
  CodeXml,
  Search,
  RotateCw,
  RotateCcw,
  Trash,
  Music,
  Volume2,
  Volume1,
  VolumeX,
  X,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Square,
  Code,
  Edit3,
  Info
};

import { AudioCaptureEngine } from '../recording/audio-engine';
import { SSMLHelper } from '../recording/ssml-validator';
import {
  AudioRecord,
  AudioRecordingRepository,
  StorageService,
  StorageManagerHelper
} from '../core/storage';
import { PlatformAdapter } from '../core/platform';
import { WaveformVisualizer } from './visualizer';
import { showToast, openConfirmDialog, openPromptModal } from './toast';

export class AppController {
  private repository: AudioRecordingRepository;
  private captureEngine: AudioCaptureEngine;
  private visualizer!: WaveformVisualizer;

  private activeAudio = new Audio();
  private currentPlayingClip: AudioRecord | null = null;
  private isPlaying = false;
  private playbackSpeed = 1.0;
  private readonly speeds = [1.0, 1.25, 1.5, 2.0, 0.8];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deferredInstallPrompt: any = null;

  constructor() {
    this.repository = new AudioRecordingRepository();

    this.captureEngine = new AudioCaptureEngine({
      onTick: (elapsedMs) => this.handleTimerTick(elapsedMs),
      onVisualData: (dataArray, avg) => this.visualizer?.render(dataArray, avg),
      onStateChange: (state) => this.handleStateChange(state),
      onAutoStop: () => {
        showToast('Actions on Google SSML limit (240s) reached. Audio saved!', 'info');
      }
    });
  }

  public async init(): Promise<void> {
    this.refreshIcons();

    // Initialize Canvas visualizer
    const canvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;
    if (canvas) {
      this.visualizer = new WaveformVisualizer(canvas);
    }

    // Initialize IndexedDB
    try {
      await this.repository.init();
    } catch (err) {
      console.error('[AppController] IndexedDB init error:', err);
      showToast('IndexedDB unavailable. Storage will be transient.', 'error');
    }

    // Load persisted settings
    const savedSpeed = await StorageService.get<number>('playbackSpeed', 1.0);
    this.playbackSpeed = savedSpeed;
    this.activeAudio.playbackRate = this.playbackSpeed;
    const speedBtn = document.getElementById('playerSpeedBtn');
    if (speedBtn) speedBtn.innerText = `${this.playbackSpeed}x`;

    // Setup Event Listeners
    this.setupUIEventListeners();
    this.setupPlayerEventListeners();
    this.setupPWAInstall();

    // Initial render
    await this.updateRecordingsView();
    await this.refreshStorageStatus();

    // Platform badges
    this.updatePlatformUI();
  }

  public refreshIcons(root?: HTMLElement): void {
    createIcons({ icons: appIcons, root });
  }

  private updatePlatformUI(): void {
    const isExt = PlatformAdapter.isExtension();
    const envBadge = document.getElementById('runtimeEnvBadge');
    if (envBadge) {
      if (isExt) {
        envBadge.innerText = `MV3 Extension v${PlatformAdapter.getAppVersion()}`;
        envBadge.classList.remove('hidden');
      } else {
        envBadge.innerText = 'PWA Standalone';
        envBadge.classList.remove('hidden');
      }
    }
  }

  private setupUIEventListeners(): void {
    // Record button toggles
    const toggleRecordBtn = document.getElementById('toggleRecordBtn');
    const pauseRecordBtn = document.getElementById('pauseRecordBtn');
    const discardRecordBtn = document.getElementById('discardRecordBtn');

    toggleRecordBtn?.addEventListener('click', async () => this.handleToggleRecord());
    pauseRecordBtn?.addEventListener('click', () => this.handlePauseResumeRecord());
    discardRecordBtn?.addEventListener('click', () => this.handleDiscardRecord());

    // Navigation Tabs
    const tabRecord = document.getElementById('tabRecord');
    const tabRecordings = document.getElementById('tabRecordings');
    const goToStudioBtn = document.getElementById('goToStudioBtn');

    tabRecord?.addEventListener('click', () => this.switchTab('studio'));
    tabRecordings?.addEventListener('click', () => this.switchTab('recordings'));
    goToStudioBtn?.addEventListener('click', () => this.switchTab('studio'));

    // Search and toolbar actions
    const searchInput = document.getElementById('searchRecordingsInput') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      this.updateRecordingsView((e.target as HTMLInputElement).value);
    });

    const refreshBtn = document.getElementById('refreshRecordingsBtn');
    refreshBtn?.addEventListener('click', async () => {
      await this.updateRecordingsView();
      await this.refreshStorageStatus();
      showToast('Recordings refreshed', 'info');
    });

    const clearAllBtn = document.getElementById('clearAllRecordingsBtn');
    clearAllBtn?.addEventListener('click', () => {
      openConfirmDialog(
        'Delete All Recordings?',
        'This will permanently delete all stored voice recordings from this browser.',
        async () => {
          this.activeAudio.pause();
          document.getElementById('audioPlayerDock')?.classList.add('translate-y-full');
          this.currentPlayingClip = null;
          await this.repository.clearAll();
          await this.updateRecordingsView();
          await this.refreshStorageStatus();
          showToast('All voice recordings cleared', 'warning');
        }
      );
    });

    // Storage status modal
    const storageBtn = document.getElementById('storageStatusBtn');
    const closeStorageModalBtn = document.getElementById('closeStorageModalBtn');
    const grantStorageBtn = document.getElementById('grantStorageBtn');
    const requestPersistActionBtn = document.getElementById('requestPersistActionBtn');

    storageBtn?.addEventListener('click', async () => {
      await this.refreshStorageStatus();
      document.getElementById('storageModal')?.classList.remove('hidden');
    });

    closeStorageModalBtn?.addEventListener('click', () => {
      document.getElementById('storageModal')?.classList.add('hidden');
    });

    const handleGrant = async () => {
      const granted = await StorageManagerHelper.requestPersistence();
      if (granted) {
        showToast('Persistent storage granted! Audio protected against browser eviction.', 'success');
      } else {
        showToast('Storage running in standard quota mode.', 'info');
      }
      await this.refreshStorageStatus();
    };

    grantStorageBtn?.addEventListener('click', handleGrant);
    requestPersistActionBtn?.addEventListener('click', handleGrant);
  }

  private setupPlayerEventListeners(): void {
    const playBtn = document.getElementById('playerPlayBtn');
    const skipBackBtn = document.getElementById('playerSkipBackBtn');
    const skipFwdBtn = document.getElementById('playerSkipFwdBtn');
    const speedBtn = document.getElementById('playerSpeedBtn');
    const closeBtn = document.getElementById('playerCloseBtn');
    const volumeSlider = document.getElementById('playerVolumeSlider') as HTMLInputElement | null;
    const muteBtn = document.getElementById('playerMuteBtn');
    const progressSlider = document.getElementById('playerProgressSlider') as HTMLInputElement | null;

    playBtn?.addEventListener('click', () => {
      if (!this.currentPlayingClip) return;
      if (this.isPlaying) {
        this.activeAudio.pause();
      } else {
        this.activeAudio.play().catch(console.error);
      }
    });

    skipBackBtn?.addEventListener('click', () => {
      this.activeAudio.currentTime = Math.max(0, this.activeAudio.currentTime - 5);
    });

    skipFwdBtn?.addEventListener('click', () => {
      this.activeAudio.currentTime = Math.min(this.activeAudio.duration || 0, this.activeAudio.currentTime + 5);
    });

    speedBtn?.addEventListener('click', async (e) => {
      const nextIndex = (this.speeds.indexOf(this.playbackSpeed) + 1) % this.speeds.length;
      this.playbackSpeed = this.speeds[nextIndex];
      this.activeAudio.playbackRate = this.playbackSpeed;
      (e.target as HTMLElement).innerText = `${this.playbackSpeed}x`;
      await StorageService.set('playbackSpeed', this.playbackSpeed);
      showToast(`Playback speed: ${this.playbackSpeed}x`, 'info');
    });

    closeBtn?.addEventListener('click', () => {
      this.activeAudio.pause();
      document.getElementById('audioPlayerDock')?.classList.add('translate-y-full');
    });

    volumeSlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.activeAudio.volume = val;
      this.activeAudio.muted = false;
      this.updateVolumeIcon(val);
    });

    muteBtn?.addEventListener('click', () => {
      this.activeAudio.muted = !this.activeAudio.muted;
      this.updateVolumeIcon(this.activeAudio.muted ? 0 : this.activeAudio.volume);
    });

    progressSlider?.addEventListener('input', (e) => {
      const pct = parseFloat((e.target as HTMLInputElement).value);
      const dur = this.activeAudio.duration || this.currentPlayingClip?.duration || 0;
      this.activeAudio.currentTime = (pct / 100) * dur;
    });

    this.activeAudio.addEventListener('play', () => {
      this.isPlaying = true;
      document.getElementById('playerPlayIcon')?.setAttribute('data-lucide', 'pause');
      this.refreshIcons();
      this.updateRecordingsView();
    });

    this.activeAudio.addEventListener('pause', () => {
      this.isPlaying = false;
      document.getElementById('playerPlayIcon')?.setAttribute('data-lucide', 'play');
      this.refreshIcons();
      this.updateRecordingsView();
    });

    this.activeAudio.addEventListener('timeupdate', () => {
      const cur = this.activeAudio.currentTime;
      const dur = this.activeAudio.duration || this.currentPlayingClip?.duration || 1;
      const curEl = document.getElementById('playerCurrentTime');
      if (curEl) curEl.innerText = this.formatDuration(cur);

      if (progressSlider) {
        progressSlider.value = String((cur / dur) * 100);
      }
    });

    this.activeAudio.addEventListener('ended', () => {
      this.isPlaying = false;
      document.getElementById('playerPlayIcon')?.setAttribute('data-lucide', 'play');
      this.refreshIcons();
      this.updateRecordingsView();
    });
  }

  private setupPWAInstall(): void {
    if (PlatformAdapter.isExtension()) {
      // In Chrome Extension, hide PWA installation trigger
      const pwaBtn = document.getElementById('pwaInstallBtn');
      if (pwaBtn) pwaBtn.classList.add('hidden');
      return;
    }

    const installBtn = document.getElementById('pwaInstallBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('flex');
        installBtn.addEventListener('click', async () => {
          if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const choiceResult = await this.deferredInstallPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
              installBtn.classList.add('hidden');
            }
            this.deferredInstallPrompt = null;
          }
        });
      }
    });
  }

  private async handleToggleRecord(): Promise<void> {
    if (!this.captureEngine.isRecording) {
      try {
        const ssmlEnabled = (document.getElementById('ssmlLimitToggle') as HTMLInputElement)?.checked ?? true;
        const noiseEnabled = (document.getElementById('noiseSuppressionToggle') as HTMLInputElement)?.checked ?? true;
        await this.captureEngine.startRecording(ssmlEnabled, noiseEnabled);
        showToast('Recording started', 'info');
      } catch (err) {
        console.error('[AudioEngine] Access error:', err);
        showToast('Microphone permission required: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
    } else {
      const result = await this.captureEngine.stopRecording();
      if (result && result.blob) {
        const timestamp = Date.now();
        const dateObj = new Date(timestamp);
        const defaultTitle = `Voice Note ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const record: AudioRecord = {
          id: 'rec_' + timestamp + '_' + Math.random().toString(36).substring(2, 7),
          title: defaultTitle,
          blob: result.blob,
          mimeType: result.mimeType,
          duration: result.duration,
          timestamp,
          size: result.blob.size,
          peaks: result.peaks
        };

        await this.repository.saveRecording(record);
        showToast('Recording stored in local browser database!', 'success');
        const timer = document.getElementById('timerDisplay');
        if (timer) timer.innerText = '00:00.0';
        await this.updateRecordingsView();
        await this.refreshStorageStatus();
      }
    }
  }

  private handlePauseResumeRecord(): void {
    if (!this.captureEngine.isRecording) return;
    if (this.captureEngine.isPaused) {
      this.captureEngine.resumeRecording();
      document.getElementById('pauseBtnIcon')?.setAttribute('data-lucide', 'pause');
    } else {
      this.captureEngine.pauseRecording();
      document.getElementById('pauseBtnIcon')?.setAttribute('data-lucide', 'play');
    }
    this.refreshIcons();
  }

  private handleDiscardRecord(): void {
    openConfirmDialog(
      'Discard Recording?',
      'This will cancel and erase the current active audio capture buffer.',
      () => {
        this.captureEngine.discardRecording();
        const timer = document.getElementById('timerDisplay');
        if (timer) timer.innerText = '00:00.0';
        showToast('Recording discarded', 'warning');
      }
    );
  }

  private handleTimerTick(elapsedMs: number): void {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    const tenths = Math.floor((elapsedMs % 1000) / 100);

    const timer = document.getElementById('timerDisplay');
    if (timer) timer.innerText = `${mins}:${secs}.${tenths}`;

    if (this.captureEngine.enforceSSML) {
      const remaining = Math.max(0, 240 - totalSeconds);
      const remainingEl = document.getElementById('ssmlRemainingText');
      if (remainingEl) remainingEl.innerText = `${remaining}s left`;
    }
  }

  private handleStateChange(state: 'idle' | 'recording' | 'paused'): void {
    const toggleBtn = document.getElementById('toggleRecordBtn');
    const pauseBtn = document.getElementById('pauseRecordBtn') as HTMLButtonElement | null;
    const discardBtn = document.getElementById('discardRecordBtn') as HTMLButtonElement | null;
    const glow = document.getElementById('recordRingGlow');
    const idleHint = document.getElementById('visualizerIdleHint');
    const liveBadge = document.getElementById('liveStatsBadge');
    const ssmlBadge = document.getElementById('ssmlTimerBadge');
    const badge = document.getElementById('recordingBadge');
    const statusText = document.getElementById('recordingStatusText');
    const recordIcon = document.getElementById('recordBtnIcon');

    if (state === 'recording') {
      toggleBtn?.classList.remove('from-red-600', 'to-rose-500');
      toggleBtn?.classList.add('from-indigo-600', 'to-brand-500');
      recordIcon?.setAttribute('data-lucide', 'square');
      if (pauseBtn) pauseBtn.disabled = false;
      if (discardBtn) discardBtn.disabled = false;
      glow?.classList.remove('hidden');
      idleHint?.classList.add('hidden');
      liveBadge?.classList.remove('hidden');
      if (this.captureEngine.enforceSSML) ssmlBadge?.classList.remove('hidden');
      badge?.classList.remove('hidden');
      if (statusText) {
        statusText.innerText = 'Capturing Voice Clip...';
        statusText.classList.add('text-red-400');
      }
    } else if (state === 'paused') {
      recordIcon?.setAttribute('data-lucide', 'square');
      glow?.classList.add('hidden');
      if (statusText) {
        statusText.innerText = 'Recording Paused';
        statusText.classList.remove('text-red-400');
      }
      document.getElementById('pauseBtnIcon')?.setAttribute('data-lucide', 'play');
    } else {
      toggleBtn?.classList.add('from-red-600', 'to-rose-500');
      toggleBtn?.classList.remove('from-indigo-600', 'to-brand-500');
      recordIcon?.setAttribute('data-lucide', 'mic');
      if (pauseBtn) pauseBtn.disabled = true;
      if (discardBtn) discardBtn.disabled = true;
      glow?.classList.add('hidden');
      idleHint?.classList.remove('hidden');
      liveBadge?.classList.add('hidden');
      ssmlBadge?.classList.add('hidden');
      badge?.classList.add('hidden');
      if (statusText) {
        statusText.innerText = 'Ready to Capture';
        statusText.classList.remove('text-red-400');
      }
      document.getElementById('pauseBtnIcon')?.setAttribute('data-lucide', 'pause');
      this.visualizer?.drawIdle();
    }
    this.refreshIcons();
  }

  public switchTab(target: 'studio' | 'recordings'): void {
    const tabRecord = document.getElementById('tabRecord');
    const tabRecordings = document.getElementById('tabRecordings');
    const viewStudio = document.getElementById('viewStudio');
    const viewRecordings = document.getElementById('viewRecordings');

    if (target === 'studio') {
      if (tabRecord) {
        tabRecord.className = 'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30 transition';
      }
      if (tabRecordings) {
        tabRecordings.className = 'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition';
      }
      viewStudio?.classList.remove('hidden');
      viewRecordings?.classList.add('hidden');
      this.visualizer?.resize();
      this.visualizer?.drawIdle();
    } else {
      if (tabRecordings) {
        tabRecordings.className = 'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30 transition';
      }
      if (tabRecord) {
        tabRecord.className = 'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition';
      }
      viewStudio?.classList.add('hidden');
      viewRecordings?.classList.remove('hidden');
      this.updateRecordingsView();
    }
  }

  public async updateRecordingsView(query = ''): Promise<void> {
    const recordings = await this.repository.getAllRecordings();
    const listContainer = document.getElementById('recordingsList');
    const emptyState = document.getElementById('emptyRecordingsState');
    const countBadge = document.getElementById('recordingsCountBadge');

    if (countBadge) countBadge.innerText = String(recordings.length);

    const filtered = recordings.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase())
    );

    if (!listContainer || !emptyState) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    listContainer.innerHTML = '';

    filtered.forEach((rec) => {
      const card = this.createRecordingCard(rec);
      listContainer.appendChild(card);
    });

    this.refreshIcons(listContainer);
  }

  private createRecordingCard(rec: AudioRecord): HTMLElement {
    const card = document.createElement('div');
    card.className =
      'group p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm';

    const isCurrentActive =
      this.currentPlayingClip && this.currentPlayingClip.id === rec.id && this.isPlaying;

    const peaks = rec.peaks || Array.from({ length: 45 }, () => 0.3);
    const peakBarsHtml = peaks
      .map((p) => {
        const heightPct = Math.max(12, Math.round(p * 100));
        return `<div class="w-1 rounded-full bg-slate-700 group-hover:bg-brand-500/50 transition" style="height: ${heightPct}%"></div>`;
      })
      .join('');

    card.innerHTML = `
      <div class="flex items-center space-x-3.5 flex-1 min-w-0">
        <button class="play-card-btn w-11 h-11 rounded-xl ${
          isCurrentActive
            ? 'bg-brand-500 text-white'
            : 'bg-slate-800 text-brand-400 group-hover:bg-brand-500/20'
        } flex items-center justify-center shrink-0 transition" title="Play Clip">
          <i data-lucide="${isCurrentActive ? 'pause' : 'play'}" class="w-5 h-5 ${
      isCurrentActive ? '' : 'ml-0.5'
    }"></i>
        </button>
        
        <div class="space-y-1 min-w-0 flex-1">
          <div class="flex items-center space-x-2">
            <h4 class="text-sm font-semibold text-white truncate clip-title">${rec.title}</h4>
            <span class="text-[10px] font-mono px-2 py-0.2 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60 uppercase">
              ${rec.mimeType.includes('ogg') ? 'OGG' : 'WebM'}
            </span>
          </div>

          <div class="h-6 w-full max-w-xs flex items-center space-x-0.5 py-1">
            ${peakBarsHtml}
          </div>

          <div class="flex items-center space-x-3 text-xs text-slate-400">
            <span class="font-mono text-slate-300">${this.formatDuration(rec.duration)}</span>
            <span>&bull;</span>
            <span>${this.formatBytes(rec.size)}</span>
            <span>&bull;</span>
            <span class="text-[11px]">${new Date(rec.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 justify-end">
        <button class="copy-ssml-btn p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition" title="Copy Actions on Google SSML Tag">
          <i data-lucide="code" class="w-4 h-4"></i>
        </button>
        <button class="download-btn p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition" title="Export Audio File">
          <i data-lucide="download" class="w-4 h-4"></i>
        </button>
        <button class="rename-btn p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition" title="Rename Note">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
        <button class="delete-btn p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition" title="Delete Note">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    card.querySelector('.play-card-btn')?.addEventListener('click', () => this.togglePlayClip(rec));
    card.querySelector('.download-btn')?.addEventListener('click', () => this.downloadClip(rec));
    card.querySelector('.copy-ssml-btn')?.addEventListener('click', () => this.copySSMLTag(rec));
    card.querySelector('.rename-btn')?.addEventListener('click', () => this.renameClip(rec));
    card.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteClip(rec));

    return card;
  }

  private togglePlayClip(record: AudioRecord): void {
    if (this.currentPlayingClip && this.currentPlayingClip.id === record.id) {
      if (this.isPlaying) {
        this.activeAudio.pause();
      } else {
        this.activeAudio.play().catch(console.error);
      }
      return;
    }

    this.currentPlayingClip = record;
    const audioUrl = URL.createObjectURL(record.blob);
    this.activeAudio.src = audioUrl;
    this.activeAudio.playbackRate = this.playbackSpeed;

    const trackTitle = document.getElementById('playerTrackTitle');
    const trackMeta = document.getElementById('playerTrackMeta');
    const playerDur = document.getElementById('playerDuration');
    const dock = document.getElementById('audioPlayerDock');

    if (trackTitle) trackTitle.innerText = record.title;
    if (trackMeta) trackMeta.innerText = `${this.formatDuration(record.duration)} • ${record.mimeType}`;
    if (playerDur) playerDur.innerText = this.formatDuration(record.duration);
    dock?.classList.remove('translate-y-full');

    this.activeAudio.play().catch(console.error);
  }

  private downloadClip(record: AudioRecord): void {
    const ext = record.mimeType.includes('ogg') ? 'ogg' : 'webm';
    const cleanName = record.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(record.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Audio file downloaded', 'success');
  }

  private async copySSMLTag(record: AudioRecord): Promise<void> {
    const ssmlTag = SSMLHelper.generateSSMLSnippet(record.id, record.mimeType);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ssmlTag);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = ssmlTag;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showToast('Actions on Google SSML snippet copied to clipboard!', 'success');
    } catch (err) {
      console.error('[SSML] Clipboard error:', err);
      showToast('Could not copy SSML snippet to clipboard', 'error');
    }
  }

  private renameClip(record: AudioRecord): void {
    openPromptModal('Rename Recording', record.title, async (newTitle) => {
      await this.repository.updateRecordingTitle(record.id, newTitle);
      await this.updateRecordingsView();
      showToast('Recording renamed', 'info');
    });
  }

  private deleteClip(record: AudioRecord): void {
    openConfirmDialog(
      'Delete Clip?',
      `Are you sure you want to delete "${record.title}"?`,
      async () => {
        if (this.currentPlayingClip && this.currentPlayingClip.id === record.id) {
          this.activeAudio.pause();
          document.getElementById('audioPlayerDock')?.classList.add('translate-y-full');
          this.currentPlayingClip = null;
        }
        await this.repository.deleteRecording(record.id);
        await this.updateRecordingsView();
        await this.refreshStorageStatus();
        showToast('Clip deleted', 'warning');
      }
    );
  }

  private updateVolumeIcon(vol: number): void {
    const icon = document.getElementById('playerVolumeIcon');
    if (!icon) return;
    if (vol === 0) {
      icon.setAttribute('data-lucide', 'volume-x');
    } else if (vol < 0.5) {
      icon.setAttribute('data-lucide', 'volume-1');
    } else {
      icon.setAttribute('data-lucide', 'volume-2');
    }
    this.refreshIcons();
  }

  public async refreshStorageStatus(): Promise<void> {
    const isPersisted = await StorageManagerHelper.checkPersistence();
    const estimate = await StorageManagerHelper.getEstimate();

    const usedMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
    const quotaMb = ((estimate.quota || 0) / (1024 * 1024 * 1024)).toFixed(2);

    const summaryText = document.getElementById('storageSummaryText');
    const badge = document.getElementById('modalPersistStatusBadge');
    const permBanner = document.getElementById('storagePermissionBanner');
    const usedEl = document.getElementById('modalStorageUsed');
    const quotaEl = document.getElementById('modalStorageQuota');
    const barEl = document.getElementById('modalStorageBar');

    if (summaryText) summaryText.innerText = `${usedMb} MB`;

    if (badge) {
      if (isPersisted) {
        badge.innerText = 'Persistent (Protected)';
        badge.className = 'font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800';
      } else {
        badge.innerText = 'Best-Effort';
        badge.className = 'font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800';
      }
    }

    if (permBanner) {
      if (isPersisted) {
        permBanner.classList.add('hidden');
      } else {
        permBanner.classList.remove('hidden');
      }
    }

    if (usedEl) usedEl.innerText = `${usedMb} MB`;
    if (quotaEl) quotaEl.innerText = `${quotaMb} GB`;

    const pct = estimate.quota ? Math.min(100, ((estimate.usage || 0) / estimate.quota) * 100) : 0;
    if (barEl) barEl.style.width = `${Math.max(1, pct)}%`;
  }

  private formatDuration(sec: number): string {
    const s = Math.floor(sec || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
