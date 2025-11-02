import { audioSession } from "$lib/audio/audioSession";
import { getContentLength, type Song, songById } from "$lib/api/songs";
import { getStreamUrl, roundRect, toShuffledArray } from "$lib/utils";
import { derived, get, type Unsubscriber, writable } from "svelte/store";
import { createCurve } from "$lib/audio/utils";
import { electronController } from "$lib/audio/electronController";
import { RepeatMode } from "$shared/models/repeatMode";
import { PlaybackStatus } from "$shared/models/playbackStatus";
import type { UUID } from "node:crypto";
import type { PagedResponse } from "$lib/api/apiTypes";
import { loggedIn } from "$lib/api/auth";
import { debugLog } from "$lib/logger";

export enum PlayingSourceType {
  Playlist = "playlist",
  Album = "album",
  LikedSongs = "likedSongs",
}

export type PlayingSource = {
  type: PlayingSourceType;
  id: UUID;
};

// noinspection JSUnusedGlobalSymbols
export class MediaSession {
  private audioContext: AudioContext | undefined;
  private audioAnalyser: AnalyserNode | undefined;
  private audioSource: MediaElementAudioSourceNode | undefined;

  private bufferLength: number = 0;
  private dataArray: Uint8Array<ArrayBuffer> | undefined;

  private queue = writable<Array<Song>>([]);
  private shuffledQueue = writable<Array<Song>>([]);

  playingSourceType = writable<PlayingSourceType>(PlayingSourceType.LikedSongs);
  playingSourceId = writable<UUID>("----");

  currentSong = writable<Song | null>(null);
  volume = writable<number>(50);
  paused = writable<boolean>(true);
  muted = writable<boolean>(false);
  bitrate = writable<number>(0);
  shuffled = writable<boolean>(false);
  repeatMode = writable<RepeatMode>(RepeatMode.None);

  currentIndex = writable<number>(-2);
  currentPosition = writable<number>(0);
  currentBuffer = writable<number>(0);

  private minDecibels = writable<number | undefined>(-90);
  private maxDecibels = writable<number | undefined>(-20);
  private smoothingTimeConstant = writable(0.75);

  // noinspection TypeScriptFieldCanBeMadeReadonly
  private initialLoad = true;
  private continuePlay = false;

  private unsubscribers: Array<Unsubscriber> = [];

  constructor() {
    let sub: Unsubscriber;
    // eslint-disable-next-line prefer-const
    sub = loggedIn.subscribe((loggedIn) => {
      if (loggedIn) this.setup();
      sub?.();
    });
  }

  private setup() {
    this.loadFromStorage();

    this.audioContext = new (window.AudioContext ||
      // eslint-disable-next-line
      (window as any).webkitAudioContext)();

    this.setupAudioConnection();

    audioSession.onPlay(() => this.paused.set(false));
    audioSession.onPause(() => this.paused.set(true));

    audioSession.onEnded(async () => {
      if (get(this.repeatMode) === RepeatMode.Track) await this.reset();
      else {
        this.paused.set(false);
        this.playNext();
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
      this.writeToStorage();
      await this.updatePlaybackVolume(volume);
    });

    this.repeatMode.subscribe(() => {
      this.writeToStorage();
    });

    this.shuffled.subscribe(async (shuffled) => {
      if (this.initialLoad) return;
      this.writeToStorage();
      if (!shuffled) {
        const currentSong = get(this.currentSong);
        const index = get(this.queue).findIndex(
          (s) => s.id === currentSong?.id,
        );
        this.continuePlay = true;
        await this.playIndex(index);
      } else this.shuffleQueue();
    });

    this.currentIndex.subscribe(async (index) => {
      if (index === -1) return;
      await this.playIndex(index, true);
      this.writeToStorage();
    });

    this.currentSong.subscribe(async (song) => {
      if (!song) return;
      await this.updateMetadata(song);
    });

    this.paused.subscribe(async (paused) => {
      await this.updatePlaybackStatus(
        paused ? PlaybackStatus.Paused : PlaybackStatus.Playing,
      );
    });

    this.initialLoad = false;
  }

  private currentQueue() {
    return get(this.shuffled) ? get(this.shuffledQueue) : get(this.queue);
  }

  private songByIndex(index: number) {
    return this.currentQueue()[index];
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

  private shuffleQueue(songId?: Song["id"], queue?: Array<Song>): Array<Song> {
    const currentQueue = queue ?? get(this.queue);
    const currentSongId =
      songId ?? get(this.currentSong)?.id ?? currentQueue[0]?.id;
    if (!currentSongId) return currentQueue;

    const currentSong = currentQueue.find((s) => s.id === currentSongId);
    if (!currentSong) return currentQueue;

    const newQueue = [
      currentSong,
      ...toShuffledArray(currentQueue.filter((s) => s.id !== currentSongId)),
    ];
    this.shuffledQueue.set(newQueue);
    return newQueue;
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

    const minDecibels = get(this.minDecibels);
    const maxDecibels = get(this.maxDecibels);
    const smoothingTimeConstant = get(this.smoothingTimeConstant);

    this.unsubscribers.push(
      this.minDecibels.subscribe((minDecibels) => {
        if (minDecibels !== undefined && this.audioAnalyser)
          this.audioAnalyser.minDecibels = minDecibels;
      }),
    );
    this.unsubscribers.push(
      this.maxDecibels.subscribe((maxDecibels) => {
        if (maxDecibels !== undefined && this.audioAnalyser)
          this.audioAnalyser.maxDecibels = maxDecibels;
      }),
    );
    this.unsubscribers.push(
      this.smoothingTimeConstant.subscribe((smoothingTimeConstant) => {
        if (this.audioAnalyser)
          this.audioAnalyser.smoothingTimeConstant = smoothingTimeConstant;
      }),
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
    audioSession.playUrl(url);
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
    if (audioSession.hasSource()) await audioSession.play();
    else this.currentIndex.set(get(this.currentIndex));
  }

  async playSong(songId: Song["id"], shuffled: boolean = false) {
    const queue = shuffled ? this.shuffleQueue(songId) : this.currentQueue();
    const index = queue.findIndex((song) => song.id === songId);
    this.paused.set(false);
    await this.playIndex(index);
    await audioSession.play();
  }

  playNext() {
    this.currentIndex.update((index) => {
      const newIndex = index + 1;
      if (newIndex > this.currentQueue().length - 1) {
        if (get(this.repeatMode) === RepeatMode.List) return 0;
        audioSession.seekToSeconds(audioSession.getDurationInSeconds());
        this.pause();
        this.paused.set(true);
        return index;
      } else return newIndex;
    });
  }

  playPrev() {
    this.currentIndex.update((index) => {
      const newIndex = index - 1;
      if (newIndex < 0) return this.currentQueue().length - 1;
      else return newIndex;
    });
  }

  pause() {
    audioSession.pause();
  }

  isPaused() {
    return audioSession.isPaused();
  }

  addToQueue(song: Song) {
    this.queue.update((queue) => [...queue, song]);
    this.shuffledQueue.update((queue) => [...queue, song]);
    this.writeToStorage();
  }

  removeFromQueue(song: Song) {
    this.queue.update((queue) => {
      const index = queue.indexOf(song);
      if (index >= 0) queue.splice(index, 1);
      return queue;
    });
    this.shuffledQueue.update((queue) => {
      const index = queue.indexOf(song);
      if (index >= 0) queue.splice(index, 1);
      return queue;
    });
    this.writeToStorage();
  }

  getQueue() {
    return Array.from(this.currentQueue());
  }

  getDerivedQueue() {
    return derived(
      [this.shuffled, this.shuffledQueue, this.queue],
      ([shuffled, shuffledQueue, queue]) => {
        return shuffled ? shuffledQueue : queue;
      },
    );
  }

  async loadSongsFromQueue(
    page: number,
    pageSize: number,
  ): Promise<PagedResponse<Song>> {
    if (page < 0) return { page, pageSize, data: [], hasNextPage: false };

    const queue = this.currentQueue();

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

  setQueue(queue: Array<Song>) {
    this.queue.set(queue);
    this.shuffleQueue(undefined, queue);
    this.writeToStorage();
  }

  private writeToStorage() {
    const data = {
      queue: get(this.queue),
      shuffledQueue: get(this.shuffledQueue),
      repeatMode: get(this.repeatMode),
      currentSong: get(this.currentSong),
      currentIndex: get(this.currentIndex) === -2 ? 0 : get(this.currentIndex),
      volume: get(this.volume),
      shuffled: get(this.shuffled),
      playingSourceType: get(this.playingSourceType),
      playingSourceId: get(this.playingSourceId),
    };

    localStorage.setItem("mediaSession", JSON.stringify(data));
  }

  private loadFromStorage() {
    const data = JSON.parse(localStorage.getItem("mediaSession") ?? "{}");

    this.shuffled.set(data.shuffled);
    this.queue.set(data.queue ?? []);
    this.shuffledQueue.set(data.shuffledQueue ?? []);
    this.repeatMode.set(data.repeatMode ?? RepeatMode.None);
    this.currentSong.set(data.currentSong);
    this.continuePlay = false;
    this.volume.set(data.volume ?? 50);
    this.playingSourceType.set(
      data.playingSourceType ?? PlayingSourceType.LikedSongs,
    );
    this.playingSourceId.set(data.playingSourceId);
    this.currentIndex.set(
      (data.queue ?? []).length > 0 ? (data.currentIndex ?? -1) : -1,
    );
  }
}

export const mediaSession = new MediaSession();
