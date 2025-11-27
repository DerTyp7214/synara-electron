import { settings, settingsService } from "$lib/settings";
import type { Song, SongWithPosition } from "$shared/types/beApi";
import { type LastFmSong, nullSong } from "$shared/types/settings";
import { get, type Unsubscriber, writable } from "svelte/store";
import { mediaSession, MediaSession } from "$lib/audio/mediaSession";
import { scopedDebugLog, scopeStyle } from "$lib/logger";
import { sleep } from "$lib/utils";

class LastFM {
  private logScope = {
    name: "LastFM",
    style: scopeStyle("#D32F2F"),
  };

  private scrobbleQueue = settings.lastFmScrobbleQueue;
  private scrobblingQueue: boolean = false;
  private currentSong = writable<SongWithPosition>();

  private unsubscribers: Array<() => void> = [];
  private queueUnsubscribers: Array<Unsubscriber> = [];

  constructor() {
    this.unsubscribers.push(
      settingsService.isLoaded().subscribe((loaded) => {
        if (!loaded) return;
        this.scrobbleQueue = settings.lastFmScrobbleQueue;

        this.unsubscribers.push(
          settings.lastFmScrobbleQueue.subscribe((queue) => {
            if (!this.scrobblingQueue && queue) void this.runScrobbleQueue();
          }),
        );
      }),
    );
  }

  public connectMediaSession(mediaSession: MediaSession) {
    this.unsubscribers.push(
      mediaSession.getDerivedQueue().subscribe((queue) => {
        if (!queue) return;

        for (const unsubscriber of this.queueUnsubscribers) {
          unsubscriber?.();
        }

        const newSongStore = queue.currentSong;

        if (newSongStore) {
          this.queueUnsubscribers.push(
            newSongStore.subscribe((song) => {
              if (
                !song ||
                song.id === nullSong.id ||
                (get(this.currentSong)?.id === song.id &&
                  get(this.currentSong)?.position === song.position)
              )
                return;
              this.currentSong.set(song);
            }),
          );
        } else {
          this.queueUnsubscribers = [];
        }
      }),
      this.currentSong.subscribe((song) => {
        this.songTimeoutStartTime = Date.now();
        this.songTimeoutEndTime = this.songTimeoutStartTime;

        this.nowPlaying(song);
        this.songTimer(song);
      }),
      mediaSession.paused.subscribe((paused) => {
        if (paused) {
          if (this.songTimeout) {
            clearTimeout(this.songTimeout);
            this.songTimeout = null;

            this.songTimeoutEndTime = Date.now();
          }
        } else this.songTimer(get(this.currentSong), paused);
      }),
      () => {
        for (const unsubscriber of this.queueUnsubscribers) unsubscriber?.();
      },
    );
  }

  public disconnect() {
    for (const unsubscriber of this.unsubscribers) {
      unsubscriber?.();
    }
  }

  public nowPlaying(song: Song, chosenByUser: boolean = false) {
    if (!song) return;
    scopedDebugLog(
      "info",
      this.logScope,
      "nowPlaying",
      this.songToLastFmSong(song, chosenByUser),
    );
  }

  public addSongToScrobbleQueue(song: Song, chosenByUser: boolean = false) {
    scopedDebugLog(
      "info",
      this.logScope,
      `Adding ${song.title} to scrobble queue`,
      song,
      chosenByUser,
    );

    try {
      this.scrobbleQueue.update((queue) => [
        ...queue,
        this.songToLastFmSong(song, chosenByUser),
      ]);
    } catch (error) {
      scopedDebugLog("error", this.logScope, error, song);
    }
  }

  private songTimeout: NodeJS.Timeout | null = null;
  private songTimeoutStartTime: number = 0;
  private songTimeoutEndTime: number = 0;

  private songTimer(song: Song, paused: boolean = get(mediaSession.paused)) {
    if (!song || paused) {
      scopedDebugLog(
        "info",
        this.logScope,
        "leaving songTimer",
        `paused: ${paused}`,
        `song:`,
        song,
      );
      return;
    }

    if (this.songTimeout) {
      clearTimeout(this.songTimeout);
      this.songTimeoutEndTime = this.songTimeoutStartTime;
    } else {
      scopedDebugLog(
        "info",
        this.logScope,
        `start: ${this.songTimeoutStartTime}, end: ${this.songTimeoutEndTime}`,
        `diff: ${this.songTimeoutEndTime - this.songTimeoutStartTime}`,
      );
    }

    const minTime = Math.min(song.duration * 0.3, 1000 * 60 * 4);
    const alreadyPlayedTime =
      this.songTimeoutEndTime - this.songTimeoutStartTime;

    const runTime = Math.max(minTime - alreadyPlayedTime, 0);

    if (runTime === 0) {
      scopedDebugLog(
        "info",
        this.logScope,
        "leaving songTimer",
        `runTime: ${runTime}`,
        `alreadyPlayedTime: ${alreadyPlayedTime}`,
      );
      return;
    }

    this.songTimeoutStartTime = Date.now() - alreadyPlayedTime;
    this.songTimeoutEndTime = this.songTimeoutStartTime;

    scopedDebugLog(
      "info",
      this.logScope,
      `starting songTimeout for ${song.title}`,
      runTime,
      "cleared",
      this.songTimeout,
    );
    this.songTimeout = setTimeout(
      (song) => {
        if (song.id === get(this.currentSong)?.id) {
          this.addSongToScrobbleQueue(song);

          this.songTimeoutStartTime = Date.now();
          this.songTimeoutEndTime = Date.now();
        }
      },
      runTime,
      song,
    );
  }

  private async runScrobbleQueue() {
    return true; // TODO: remove return when lastFM is implemented
    this.scrobblingQueue = true;

    let hasQueue = get(this.scrobbleQueue).length > 0;
    while (hasQueue) {
      const song = get(this.scrobbleQueue)[0];

      const success = await this.scrobble(song);

      if (success) this.scrobbleQueue.update((queue) => [...queue.slice(1)]);
      else await sleep(1000);

      hasQueue = get(this.scrobbleQueue).length > 0;
    }

    this.scrobblingQueue = false;
  }

  private async scrobble(lastFmSong: LastFmSong): Promise<boolean> {
    scopedDebugLog("info", this.logScope, "scrobbling", lastFmSong);

    return false;
  }

  private songToLastFmSong(song: Song, chosenByUser: boolean): LastFmSong {
    return {
      artist: song.artists.map((a) => a.name).join(", "),
      track: song.title,
      timestamp: Math.floor(Date.now() / 1000),
      album: song.album?.name,
      chosenByUser: chosenByUser,
      trackNumber: song.trackNumber,
      // mbid: TODO: fetch mbid somehow
      albumArtist: song.album?.artists.map((a) => a.name).join(", "),
      duration: song.duration,
    };
  }
}

export default new LastFM();
