import { audioSession } from "$lib/audio/audioSession";
import { getContentLength, type Song, songByIds } from "$lib/api/songs";
import { getStreamUrl } from "$lib/utils/utils";
import {
  derived,
  get,
  type Readable,
  readable,
  readonly,
  type Unsubscriber,
  writable,
} from "svelte/store";
import { electronController } from "$lib/audio/electronController";
import { RepeatMode } from "$shared/models/repeatMode";
import { PlaybackStatus } from "$shared/models/playbackStatus";
import type { PagedResponse } from "$lib/api/apiTypes";
import { loggedIn } from "$lib/api/auth";
import { settings, settingsService } from "$lib/utils/settings";
import { Queue } from "$lib/audio/queue";
import type { UUID } from "node:crypto";
import { nullSong } from "$shared/types/settings";
import type { MinimalSong, SongWithPosition } from "$shared/types/beApi";
import type { RGBColor } from "colorthief";

// noinspection JSUnusedGlobalSymbols
export class MediaSession {
  private audioContext: AudioContext | undefined;
  private audioAnalyser: AnalyserNode | undefined;
  private audioSource: MediaElementAudioSourceNode | undefined;

  private bufferLength: number = 0;
  private dataArray: Uint8Array<ArrayBuffer> | undefined;

  private queue = writable<Queue>();

  private worker: Worker | null = null;

  playingSourceType = settings.playingSourceType;
  playingSourceId = settings.playingSourceId;

  paused = writable<boolean>(true);
  bitrate = writable<number>(0);
  sampleRate = writable<number>(0);
  muted = writable<boolean>(false);

  volume = settings.volume;
  shuffled = settings.shuffle;
  repeatMode = settings.repeatMode;

  currentPosition = writable<number>(0);
  currentBuffer = writable<number>(0);

  private audioVisualizerSettings = settings.audioVisualizer;

  // noinspection TypeScriptFieldCanBeMadeReadonly
  private initialLoad = true;
  private continuePlay = false;

  private unsubscribers: Array<Unsubscriber> = [];

  private hasPlayed = false;

  constructor() {
    let sub: Unsubscriber;
    // eslint-disable-next-line prefer-const
    sub = derived(
      [loggedIn, settingsService.isLoaded()],
      ([$loggedIn, $settingsLoaded]) => $loggedIn && $settingsLoaded,
    ).subscribe((ready) => {
      if (ready) {
        this.setup();
        sub?.();
      }
    });
  }

  private setup() {
    this.audioContext = new (
      window.AudioContext ||
      // eslint-disable-next-line
      (window as any).webkitAudioContext
    )();

    this.setupAudioConnection();

    this.setQueue(
      new Queue({
        id: get(settings.playingSourceId),
        shuffled: get(settings.shuffle),
        initialIndex: get(settings.currentIndex),
        initialQueue: get(settings.queue),
        initialShuffledMap: get(settings.shuffleMap),
        writeToSettings: true,
      }),
    );

    this.queue.subscribe((queue) => {
      queue.setWriteToSettings(true);
      this.playingSourceId.set(queue.id as UUID);

      queue.currentSong.subscribe(async (song) => {
        if (!song) return;
        await this.updateMetadata(song);
      });
    });

    const currentId = get(this.currentQueue().currentSong)?.id;
    if (currentId) audioSession.setSrc(getStreamUrl(currentId));

    audioSession.onPlay(() => this.paused.set(false));
    audioSession.onPause(() => this.paused.set(true));

    audioSession.onEnded(async () => {
      if (get(this.repeatMode) === RepeatMode.Track) await this.reset();
      else {
        this.paused.set(false);
        await this.playNext();
      }
    });

    audioSession.onLoadedMetadata(async () => {
      let fetched = false;
      const fetch = async () => {
        if (fetched) return;
        const source = audioSession.getSource();
        const duration = audioSession.getDurationInSeconds();
        if (duration <= 0 || duration === Infinity) return;
        const contentLength = await getContentLength(source);
        this.bitrate.set(Math.floor((contentLength * 8) / duration / 1000));
        this.sampleRate.set(this.audioContext?.sampleRate ?? 0);
        fetched = true;
      };
      audioSession.once("durationchange", fetch);
      await fetch();
    });

    audioSession.onTimeUpdated(async (position) => {
      this.currentPosition.set(position);

      const song = this.currentQueue().getCurrentSong();
      if (!song) return;

      if (audioSession.getBuffers().length > 0) {
        this.currentBuffer.set(
          (audioSession.getBuffers().end(0) / (song.duration / 1000)) * 100,
        );
      }

      await this.updatePlaybackPosition(position);
    });

    this.volume.subscribe(async (volume) => {
      await this.updatePlaybackVolume(volume);
    });

    this.paused.subscribe(async (paused) => {
      if (!paused) this.hasPlayed = true;
      await this.updatePlaybackStatus(
        paused ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      );
    });

    this.initialLoad = false;
  }

  private currentQueue() {
    return get(this.queue);
  }

  private async _playSong(song?: MinimalSong) {
    if (!song || song === nullSong) return;

    const streamUrl = getStreamUrl(song?.id);
    if (!streamUrl) return;

    if (!this.continuePlay || this.initialLoad)
      await this.playUrl(streamUrl, !get(this.paused));
    else this.continuePlay = false;
  }

  private async updateMetadata(song: Song) {
    await electronController.updateMediaControls(
      song,
      get(this.paused) ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      get(this.shuffled),
      get(this.repeatMode),
      get(this.currentPosition),
      get(this.volume) / 100,
    );
  }

  private async updatePlaybackStatus(status: PlaybackStatus) {
    await electronController.updateMediaControls(
      this.currentQueue().getCurrentSong(),
      status,
      get(this.shuffled),
      get(this.repeatMode),
      get(this.currentPosition),
      get(this.volume) / 100,
    );
  }

  private async updatePlaybackPosition(position: number) {
    await electronController.updateMediaControls(
      this.currentQueue().getCurrentSong(),
      get(this.paused) ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      get(this.shuffled),
      get(this.repeatMode),
      position,
      get(this.volume) / 100,
    );
  }

  private async updatePlaybackVolume(volume: number) {
    await electronController.updateMediaControls(
      this.currentQueue().getCurrentSong(),
      get(this.paused) ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      get(this.shuffled),
      get(this.repeatMode),
      get(this.currentPosition),
      volume / 100,
    );
  }

  private setupAudioConnection() {
    try {
      this.audioSource?.disconnect();
      this.audioAnalyser?.disconnect();
      for (const unsub of this.unsubscribers) {
        unsub?.();
      }
    } catch (_) {
      /* empty */
    }

    if (!this.audioContext || !audioSession) return;

    this.audioAnalyser = this.audioContext.createAnalyser();

    const { minDecibels, maxDecibels, smoothingTimeConstant } = get(
      this.audioVisualizerSettings,
    );

    this.unsubscribers.push(
      this.audioVisualizerSettings.subscribe(
        ({ minDecibels, maxDecibels, smoothingTimeConstant }) => {
          if (minDecibels !== undefined && this.audioAnalyser)
            this.audioAnalyser.minDecibels = minDecibels;
          if (this.audioAnalyser)
            this.audioAnalyser.smoothingTimeConstant = smoothingTimeConstant;
          if (maxDecibels !== undefined && this.audioAnalyser)
            this.audioAnalyser.maxDecibels = maxDecibels;
        },
      ),
    );

    for (const analyser of [this.audioAnalyser]) {
      if (minDecibels !== undefined) analyser.minDecibels = minDecibels;
      if (maxDecibels !== undefined) analyser.maxDecibels = maxDecibels;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyser.fftSize = 1024;
    }

    const distortion = this.audioContext.createWaveShaper();
    const gainNode = this.audioContext.createGain();
    const biquadFilter = this.audioContext.createBiquadFilter();
    const convolver = this.audioContext.createConvolver();

    this.unsubscribers.push(
      this.volume.subscribe((volume) => {
        gainNode.gain.value = volume / 100;
      }),
    );
    this.unsubscribers.push(
      this.muted.subscribe((muted) => {
        gainNode.gain.value = muted ? 0 : get(this.volume) / 100;
      }),
    );

    gainNode.gain.value = get(this.volume) / 100;

    biquadFilter.type = "highpass";
    biquadFilter.frequency.value = 0.5;

    convolver.normalize = true;

    this.bufferLength = this.audioAnalyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    this.audioSource = audioSession.attachAudioContext(this.audioContext);

    this.audioSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    this.audioSource.connect(this.audioAnalyser);

    distortion.connect(biquadFilter);
    biquadFilter.connect(this.audioAnalyser);
    convolver.connect(this.audioAnalyser);

    this.worker = new Worker(
      new URL("../workers/bars-worker.js", import.meta.url),
      {
        type: "module",
      },
    );
  }

  private async playUrl(url: string, start: boolean = false) {
    audioSession.setSrc(url);
    if (start) await audioSession.play();
    //this.setupAudioConnection();
  }

  bassAmplitude(...bands: Array<number>) {
    return readable(0, (set) => {
      let rafId: NodeJS.Timeout;

      const analyze = async () => {
        if (!this.dataArray) {
          rafId = setTimeout(analyze, 100);
          return;
        }

        const limit = bands.length;

        if (limit <= 0) {
          rafId = setTimeout(analyze, 100);
          return;
        }

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          if (bands.includes(i)) sum += this.dataArray[i];
        }

        const averageAmplitude = sum / limit;

        set(averageAmplitude);

        rafId = setTimeout(analyze, 25);
      };

      void analyze();

      return () => {
        clearTimeout(rafId);
        set(0);
      };
    });
  }

  private fps = writable(0);

  getFps(): Readable<number> {
    return readonly(this.fps);
  }

  private currentAnimationFrame = writable(0);

  updateSize(width: number, height: number) {
    this.worker?.postMessage({
      type: "resize",
      width,
      height,
    });
  }

  private colors: RGBColor[] = [
    [255, 255, 255],
    [255, 255, 255],
  ];

  updateColors(colors: RGBColor[]) {
    this.colors = colors;

    this.worker?.postMessage({
      type: "updateColors",
      colors,
    });
  }

  terminate() {
    this.worker?.terminate();
  }

  private FRAME_INTERVAL = 1000 / 80;
  private lastTime = performance.now();
  private canvas: HTMLCanvasElement | undefined;

  drawVisualizer(canvas?: HTMLCanvasElement, time: number = performance.now()) {
    this.currentAnimationFrame.set(
      requestAnimationFrame((time) => this.drawVisualizer(canvas, time)),
    );

    const deltaTime = time - this.lastTime;

    if (deltaTime < this.FRAME_INTERVAL) {
      return readonly(this.currentAnimationFrame);
    }

    this.lastTime = time - (deltaTime % this.FRAME_INTERVAL);

    if (!canvas && !this.canvas) return readonly(this.currentAnimationFrame);

    if (!this.dataArray || !this.audioAnalyser)
      return readonly(this.currentAnimationFrame);

    this.audioAnalyser.getByteFrequencyData(this.dataArray);

    if (!this.canvas) {
      this.canvas = canvas;

      const offscreenCanvas = this.canvas!.transferControlToOffscreen();

      this.worker?.postMessage(
        {
          type: "init",
          canvas: offscreenCanvas,
          width: this.canvas!.width,
          height: this.canvas!.height,
          colors: this.colors,
          dataArrayBuffer: this.dataArray?.buffer ?? new ArrayBuffer(),
        },
        [offscreenCanvas],
      );
    }

    this.worker?.postMessage({
      type: "update",
      colors: this.colors,
      dataArrayBuffer: this.dataArray.buffer,
    });

    return readonly(this.currentAnimationFrame);
  }

  async reset() {
    audioSession.seekToSeconds(0);
    await this.play();
  }

  async play() {
    if (!this.hasPlayed)
      return await this.playSong(this.currentQueue().getCurrentSong().id);
    if (audioSession.hasSource()) await audioSession.play();
  }

  async playSong(
    songId: Song["id"],
    shuffled: boolean = get(settings.shuffle),
  ) {
    const song = this.currentQueue().getSongById(songId);
    if (!song) return;

    await this.playSongWithPosition(song, shuffled);
  }

  async playSongWithPosition(
    song: MinimalSong,
    shuffled: boolean = get(settings.shuffle),
  ) {
    this.currentQueue().setShuffled(shuffled);

    this.paused.set(false);

    const index = this.currentQueue().getIndexByIdAndPosition(
      song.id,
      song.position,
    );

    if (
      index !== get(this.currentQueue().currentIndex) &&
      !(
        song.id === this.currentQueue().getCurrentSong().id &&
        song.position === this.currentQueue().getCurrentSong().position
      )
    )
      this.currentQueue().setIndex(index);

    await this._playSong(song);
    await audioSession.play();
  }

  async playNext() {
    const index = this.currentQueue().nextSong();
    await this._playSong(this.currentQueue().getSongByIndex(index));
  }

  async playPrev() {
    const index = this.currentQueue().previousSong();
    await this._playSong(this.currentQueue().getSongByIndex(index));
  }

  pause() {
    audioSession.pause();
  }

  isPaused() {
    return audioSession.isPaused();
  }

  addToQueue(song: Song) {
    get(this.queue).addToQueue(song);
  }

  removeFromQueue(song: Song) {
    get(this.queue).removeFromQueue(song);
  }

  getQueue() {
    return this.currentQueue().get().queue;
  }

  getDerivedQueue() {
    return readonly(this.queue);
  }

  async loadSongsFromQueue(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<SongWithPosition>> {
    if (page < 0) return { page, pageSize, data: [], hasNextPage: false };

    const queue = this.currentQueue().get().queue;

    const startIndex = pageSize * page;

    const data = Array.from(queue).slice(startIndex, startIndex + pageSize);
    const positions: Record<UUID, Array<number>> = {};

    for (const d of data) {
      if (positions[d.id]) positions[d.id].push(d.position);
      else positions[d.id] = [d.position];
    }

    return {
      page,
      pageSize,
      data: await songByIds(...data.map(({ id }) => id)).then(
        (songs) =>
          songs
            .map((song) => ({
              ...song,
              position: positions[song.id]?.pop(),
            }))
            .filter(
              ({ position }) => position !== undefined,
            ) as Array<SongWithPosition>,
      ),
      hasNextPage: data.length === pageSize,
    };
  }

  setQueue(queue: Queue) {
    this.queue.update((oldQueue) => {
      oldQueue?.disconnect();
      return queue;
    });
  }
}

export const mediaSession = new MediaSession();
