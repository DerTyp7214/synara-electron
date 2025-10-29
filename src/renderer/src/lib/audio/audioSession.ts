import { debugLog } from "$lib/logger";
import type { PartialRecord } from "$lib/types";
import { killBrowserMediaSession } from "$lib/audio/utils";
import { isElectron } from "$lib/consts";

type Listeners = keyof HTMLMediaElementEventMap;

export class AudioSession {
  private audio: HTMLAudioElement = document.createElement("audio");

  private listeners: PartialRecord<Listeners, Array<EventListener>> = {};

  private eventListeners: PartialRecord<Listeners, EventListener> = {};

  constructor() {
    this.setup();
  }

  private setup() {
    try {
      for (const [key, listener] of Object.entries(this.eventListeners)) {
        this.audio?.removeEventListener(key, listener);
        debugLog("info", "cleared listeners for", key);
      }
      this.audio.remove();
    } catch (_) {
      /* empty */
    }
    this.audio = document.createElement("audio");
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "metadata";
    document.body.appendChild(this.audio);

    if (isElectron()) killBrowserMediaSession(this.audio);

    this.addListeners();
  }

  private addListeners() {
    for (const [key, listener] of Object.entries(this.eventListeners)) {
      this.audio?.removeEventListener(key, listener);
      debugLog("info", "cleared listeners for", key);
    }

    this.setupListeners("ended");
    this.setupListeners("seeking");
    this.setupListeners("progress");
    this.setupListeners("timeupdate");
    this.setupListeners("pause");
    this.setupListeners("play");
    this.setupListeners("loadedmetadata");
  }

  private setupListeners(key: Listeners) {
    this.eventListeners[key] = (event: Event) => {
      for (const listener of this.listeners[key] ?? []) {
        listener(event);
      }
    };
    this.audio.addEventListener(key, this.eventListeners[key]);
  }

  attachAudioContext(context: AudioContext) {
    return context.createMediaElementSource(this.audio);
  }

  playUrl(url: string) {
    this.audio.src = url;
    this.audio.load();
  }

  async play() {
    debugLog("info", "CAN PLAY FLAC", this.audio.canPlayType("audio/flac"));
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  kill() {
    this.audio.pause();
    this.audio.remove();
  }

  setLooping(looping: boolean) {
    this.audio.loop = looping;
  }

  seekToSeconds(position: number) {
    //this.audio.fastSeek(position);
    this.audio.currentTime = position;
  }

  seekToMilliseconds(position: number) {
    //this.audio.fastSeek(position / 1000);
    this.audio.currentTime = position / 1000;
  }

  getPositionInSeconds() {
    return this.audio.currentTime;
  }

  getPositionInMilliseconds() {
    return this.audio.currentTime * 1000;
  }

  getDurationInSeconds() {
    return this.audio.duration;
  }

  getDurationInMilliseconds() {
    return this.audio.duration * 1000;
  }

  isPaused() {
    return this.audio.paused;
  }

  hasEnded() {
    return this.audio.ended;
  }

  isLooping() {
    return this.audio.loop;
  }

  hasSource() {
    return this.audio.src !== null && this.audio.src.trim().length > 0;
  }

  getBuffers() {
    return this.audio.buffered;
  }

  getSource() {
    return this.audio.src;
  }

  onTimeUpdated(listener: (time: number) => void) {
    this.addListener("timeupdate", () => {
      listener(this.getPositionInMilliseconds());
    });
  }

  onPlay(listener: () => void) {
    this.addListener("play", () => {
      listener();
    });
  }

  onPause(listener: () => void) {
    this.addListener("pause", () => {
      listener();
    });
  }

  onLoadedMetadata(listener: () => void) {
    this.addListener("loadedmetadata", () => {
      listener();
    });
  }

  onEnded(listener: () => void) {
    this.addListener("ended", () => {
      listener();
    });
  }

  once(key: Listeners, listener: () => void) {
    this.audio.addEventListener(key, listener, { once: true });
  }

  private addListener(key: Listeners, listener: EventListener) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(listener);

    this.addListeners();
  }
}

export const audioSession = new AudioSession();
