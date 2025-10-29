import { audioSession } from "$lib/audio/audioSession";
import { getContentLength, type Song } from "$lib/api/songs";
import { getStreamUrl, roundRect } from "$lib/utils";
import { get, type Unsubscriber, writable } from "svelte/store";
import { createCurve } from "$lib/audio/utils";
import { electronController } from "$lib/audio/electronController";
import { RepeatMode } from "$shared/models/repeatMode";
import { PlaybackStatus } from "$shared/models/playbackStatus";
import { tick } from "svelte";

export class MediaSession {
  private readonly audioContext: AudioContext;
  private audioAnalyser: AnalyserNode | undefined;
  private audioSource: MediaElementAudioSourceNode | undefined;

  private bufferLength: number = 0;
  private dataArray: Uint8Array<ArrayBuffer> | undefined;

  private queue = writable<Array<Song>>([]);
  private shuffledQueue = writable<Array<Song>>([]);

  currentSong = writable<Song | null>(null);
  volume = writable<number>(50);
  paused = writable<boolean>(true);
  muted = writable<boolean>(false);
  bitrate = writable<number>(0);
  shuffled = writable<boolean>(false);
  repeatMode = writable<RepeatMode>(RepeatMode.None);

  currentIndex = writable<number>(0);
  currentPosition = writable<number>(0);
  currentBuffer = writable<number>(0);

  private unsubscribers: Array<Unsubscriber> = [];

  constructor() {
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

    this.currentIndex.subscribe(async (index) => {
      const song = get(this.queue)[index];

      const streamUrl = getStreamUrl(song?.id);
      if (!streamUrl) return;

      await this.playUrl(streamUrl, !get(this.paused));
      this.currentSong.set(song);

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

    this.audioAnalyser = this.audioContext.createAnalyser();

    for (const analyser of [this.audioAnalyser]) {
      analyser.minDecibels = -80;
      analyser.maxDecibels = -20;
      analyser.smoothingTimeConstant = 0.9;
      analyser.fftSize = 512;
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

    const dataArray = createCurve([...this.dataArray], WIDTH / 5 / 2);
    const manipulators = createCurve(
      [0.5, 0.7, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      dataArray.length,
    );

    for (let i = 0; i < manipulators.length; i++) {
      dataArray[i] *= manipulators[i];
    }

    const data = [...dataArray.toReversed(), ...dataArray];

    const multiplier = 1.3;
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

  async playSong(songId: Song["id"]) {
    const queue = get(this.queue);
    const index = queue.findIndex((song) => song.id === songId);
    this.paused.set(false);
    this.currentIndex.set(index);
  }

  playNext() {
    this.currentIndex.update((index) =>
      Math.min(get(this.queue).length - 1, index + 1),
    );
  }

  playPrev() {
    this.currentIndex.update((index) => Math.max(0, index - 1));
  }

  pause() {
    audioSession.pause();
  }

  isPaused() {
    return audioSession.isPaused();
  }

  addToQueue(song: Song) {
    this.queue.update((queue) => [...queue, song]);
    this.writeToStorage();
  }

  removeFromQueue(song: Song) {
    this.queue.update((queue) => {
      const index = queue.indexOf(song);
      if (index >= 0) queue.splice(index, 1);
      return queue;
    });
    this.writeToStorage();
  }

  getQueue() {
    return Array.from(get(this.queue));
  }

  setQueue(queue: Array<Song>) {
    this.queue.set(queue);
    this.writeToStorage();
  }

  private writeToStorage() {
    const data = {
      queue: get(this.queue),
      shuffledQueue: get(this.shuffledQueue),
      repeatMode: get(this.repeatMode),
      currentSong: get(this.currentSong),
      currentIndex: get(this.currentIndex),
      volume: get(this.volume),
    };

    localStorage.setItem("mediaSession", JSON.stringify(data));
  }

  private loadFromStorage() {
    const data = JSON.parse(localStorage.getItem("mediaSession") ?? "{}");

    this.queue.set(data.queue ?? []);
    this.shuffledQueue.set(data.shuffledQueue ?? []);
    this.repeatMode.set(data.repeatMode ?? RepeatMode.None);
    this.currentSong.set(data.currentSong);
    this.currentIndex.set(
      (data.queue ?? []).length > 0 ? (data.currentIndex ?? -1) : -1,
    );
    this.volume.set(data.volume ?? 50);
  }
}

export const mediaSession = new MediaSession();
