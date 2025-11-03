import { audioSession } from "$lib/audio/audioSession";
import { getContentLength, type Song, songById } from "$lib/api/songs";
import { getStreamUrl, roundRect } from "$lib/utils";
import { derived, get, type Unsubscriber, writable } from "svelte/store";
import { createCurve } from "$lib/audio/utils";
import { electronController } from "$lib/audio/electronController";
import { RepeatMode } from "$shared/models/repeatMode";
import { PlaybackStatus } from "$shared/models/playbackStatus";
import type { PagedResponse } from "$lib/api/apiTypes";
import { loggedIn } from "$lib/api/auth";
import { settings, settingsService } from "$lib/settings";
import { Queue } from "$lib/audio/queue";
import type { UUID } from "node:crypto";

// noinspection JSUnusedGlobalSymbols
export class MediaSession {
  private audioContext: AudioContext | undefined;
  private audioAnalyser: AnalyserNode | undefined;
  private audioSource: MediaElementAudioSourceNode | undefined;

  private bufferLength: number = 0;
  private dataArray: Uint8Array<ArrayBuffer> | undefined;

  private queue = writable<Queue>();

  playingSourceType = settings.playingSourceType;
  playingSourceId = settings.playingSourceId;

  paused = writable<boolean>(true);
  bitrate = writable<number>(0);
  muted = writable<boolean>(false);

  currentSong = settings.currentSong;
  volume = settings.volume;
  shuffled = settings.shuffle;
  repeatMode = settings.repeatMode;

  currentIndex = writable<number>(-2);

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
    this.audioContext = new (window.AudioContext ||
      // eslint-disable-next-line
      (window as any).webkitAudioContext)();

    this.setupAudioConnection();

    this.queue.set(
      new Queue({
        id: get(settings.playingSourceId),
        initialIndex: get(settings.currentIndex),
        initialQueue: get(settings.queue),
        initialShuffledMap: get(settings.shuffleMap),
        writeToSettings: true,
      }),
    );

    this.queue.subscribe((queue) => {
      this.playingSourceId.set(queue.id as UUID);
      queue.setWriteToSettings(true);
    });

    const currentId = get(settings.currentSong)?.id;
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
        fetched = true;
      };
      audioSession.once("durationchange", fetch);
      await fetch();
    });

    audioSession.onTimeUpdated(async (position) => {
      this.currentPosition.set(position);

      const song = get(this.currentSong);
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

    this.currentIndex.subscribe(async (index) => {
      if (index === -1) return;
      await this.playIndex(index, true);
    });

    this.currentSong.subscribe(async (song) => {
      if (!song) return;
      await this.updateMetadata(song);
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

  private songByIndex(index: number) {
    return this.currentQueue().get().queue[index];
  }

  private async playIndex(index: number, fromSub: boolean = false) {
    if (get(this.currentIndex) !== index) this.currentIndex.set(index);
    else if (fromSub) return;
    const song = this.songByIndex(index);

    const streamUrl = getStreamUrl(song?.id);
    if (!streamUrl) return;

    if (!this.continuePlay || this.initialLoad)
      await this.playUrl(streamUrl, !get(this.paused));
    else this.continuePlay = false;
    const currentSong = await songById(song.id);
    this.currentSong.set(currentSong);
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
      get(this.currentSong),
      status,
      get(this.shuffled),
      get(this.repeatMode),
      get(this.currentPosition),
      get(this.volume) / 100,
    );
  }

  private async updatePlaybackPosition(position: number) {
    await electronController.updateMediaControls(
      get(this.currentSong),
      get(this.paused) ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      get(this.shuffled),
      get(this.repeatMode),
      position,
      get(this.volume) / 100,
    );
  }

  private async updatePlaybackVolume(volume: number) {
    await electronController.updateMediaControls(
      get(this.currentSong),
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

    if (!this.audioContext) return;

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
  }

  private async playUrl(url: string, start: boolean = false) {
    audioSession.setSrc(url);
    if (start) await audioSession.play();
    //this.setupAudioConnection();
  }

  drawVisualizer(canvas: HTMLCanvasElement) {
    requestAnimationFrame(() => this.drawVisualizer(canvas));
    if (!this.dataArray || !this.audioAnalyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    this.audioAnalyser.getByteFrequencyData(this.dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    if (WIDTH === 0 || HEIGHT === 0) return;

    ctx.fillStyle = "rgba(255, 255, 255, .8)";

    const dataArray = createCurve(
      [...this.dataArray].slice(0, -Math.floor(this.dataArray.length / 8)),
      WIDTH / 5 / 2,
    );

    const data = [...dataArray.toReversed(), ...dataArray];

    const multiplier = 0.9;
    const barSpacing = 1;
    const barWidth = WIDTH / data.length - 1;
    const barRadius = 5;

    for (let i = 0; i < data.length; i++) {
      const barHeight = Math.min(
        Math.max(((data[i] * HEIGHT) / 256) * multiplier, 0) + 5,
        HEIGHT,
      );

      roundRect(
        ctx,
        i * (barWidth + barSpacing),
        HEIGHT / 2 - barHeight / 2,
        Math.max(barWidth, 1),
        barHeight,
        barRadius,
      );
    }
  }

  async reset() {
    audioSession.seekToSeconds(0);
    await this.play();
  }

  async play() {
    if (!this.hasPlayed) return await this.playSong(get(this.currentSong)!.id);
    if (audioSession.hasSource()) await audioSession.play();
    else this.currentIndex.set(get(this.currentIndex));
  }

  async playSong(songId: Song["id"], shuffled: boolean = false) {
    this.currentQueue().setShuffled(shuffled);

    const queue = this.currentQueue().get().queue;
    const index = queue.findIndex((song) => song.id === songId);
    this.paused.set(false);
    await this.playIndex(index);
    await audioSession.play();
  }

  async playNext() {
    const index = get(this.currentIndex);
    const newIndex = index + 1;
    if (newIndex > this.currentQueue().length() - 1) {
      if (get(this.repeatMode) === RepeatMode.List) {
        await this.playIndex(0);
        this.currentIndex.set(0);
        return;
      }
      audioSession.seekToSeconds(audioSession.getDurationInSeconds());
      this.pause();
      this.paused.set(true);
      await this.playIndex(index);
      this.currentIndex.set(index);
    } else {
      await this.playIndex(newIndex);
      this.currentIndex.set(newIndex);
    }
  }

  async playPrev() {
    const index = get(this.currentIndex);
    const newIndex = index - 1;
    if (newIndex < 0) {
      const startIndex = this.currentQueue().length() - 1;
      await this.playIndex(startIndex);
      this.currentIndex.set(startIndex);
    } else {
      await this.playIndex(newIndex);
      this.currentIndex.set(newIndex);
    }
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
    return get(this.queue).queue;
  }

  async loadSongsFromQueue(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<Song>> {
    if (page < 0) return { page, pageSize, data: [], hasNextPage: false };

    const queue = this.currentQueue().get().queue;

    const startIndex = pageSize * page;

    const data = Array.from(queue).slice(startIndex, startIndex + pageSize);

    return {
      page,
      pageSize,
      data,
      hasNextPage: data.length === pageSize,
    };
  }

  getPage(pageSize: number) {
    return Math.max(0, Math.ceil(get(this.currentIndex) / pageSize) - 1);
  }

  setQueue(queue: Queue) {
    this.queue.set(queue);
  }
}

export const mediaSession = new MediaSession();
