import { settings, settingsService } from "$lib/settings";
import type { Song, SongWithPosition } from "$shared/types/beApi";
import { type LastFmSong, nullSong } from "$shared/types/settings";
import { get, type Unsubscriber, writable } from "svelte/store";
import { mediaSession, MediaSession } from "$lib/audio/mediaSession";
import { scopedDebugLog, scopeStyle } from "$lib/logger";
import { sleep } from "$lib/utils";
import {
  getRequestToken,
  getSessionKey,
  scrobble,
  updateNowPlaying,
} from "$lib/api/lastFm";
import { t } from "$lib/i18n/i18n";
import { MusicBrainzApi } from "musicbrainz-api";

class LastFM {
  private logScope = {
    name: "LastFM",
    style: scopeStyle("#D32F2F"),
  };

  private mbApi = new MusicBrainzApi({
    appName: "synara-lastFm",
    appVersion: "1.0",
    appContactInfo: "github@dertyp.dev",
  });

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

        if (get(settings.lastFm)) void this.checkAuth();
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

        this.songTimer(song);
        void this.nowPlaying(song);
      }),
      mediaSession.paused.subscribe((paused) => {
        if (paused) {
          if (this.songTimeout) {
            clearTimeout(this.songTimeout);
            this.songTimeout = null;

            this.songTimeoutEndTime = Date.now();
          }
        } else {
          this.songTimer(get(this.currentSong), paused);
          void this.nowPlaying(get(this.currentSong), paused);
        }
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

  public async checkAuth() {
    const lastFmSession = get(settings.lastFmSession);
    const session = lastFmSession.key
      ? (lastFmSession as Required<typeof lastFmSession>)
      : await this.startAuthFlow();

    return !!session;
  }

  async startAuthFlow() {
    const { apiKey } = get(settings.lastFmTokens);

    if (!apiKey) return;

    const token = await getRequestToken();

    const url = new URL("/api/auth", "https://www.last.fm");

    url.searchParams.append("token", token);
    url.searchParams.append("api_key", apiKey);

    window.api?.openExternal(url.toString());

    confirm(get(t)("lastFm.confirmToken"));

    return await getSessionKey(token);
  }

  public async nowPlaying(
    song: Song,
    paused: boolean = get(mediaSession.paused),
  ) {
    if (!song || !get(settings.lastFm) || paused) {
      scopedDebugLog(
        "info",
        this.logScope,
        "skipping",
        `paused: ${paused}`,
        `lastFm: ${get(settings.lastFm)}`,
        "song:",
        song,
      );
      return;
    }

    const track = await this.songToLastFmSong(song, false);

    scopedDebugLog("info", this.logScope, "nowPlaying", track);

    await updateNowPlaying.bind(this)(track);
  }

  public async addSongToScrobbleQueue(
    song: Song,
    chosenByUser: boolean = false,
  ) {
    if (!get(settings.lastFm)) return;

    scopedDebugLog(
      "info",
      this.logScope,
      `Adding ${song.title} to scrobble queue`,
      song,
      chosenByUser,
    );

    try {
      const track = await this.songToLastFmSong(song, chosenByUser);
      this.scrobbleQueue.update((queue) => [...queue, track]);
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

    const minTime = Math.min(song.duration * 0.5, 1000 * 60 * 4);
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
          void this.addSongToScrobbleQueue(song);

          this.songTimeoutStartTime = Date.now();
          this.songTimeoutEndTime = Date.now();
        }
      },
      runTime,
      song,
    );
  }

  private async runScrobbleQueue() {
    if (!get(settings.lastFm)) return;

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

    try {
      return await scrobble.bind(this)(lastFmSong);
    } catch (error) {
      scopedDebugLog("error", this.logScope, "scrobbling", error);
      return false;
    }
  }

  private async songToLastFmSong(
    song: Song,
    chosenByUser: boolean,
  ): Promise<LastFmSong> {
    const mainArtist =
      song.artists.find(({ name }) =>
        song.album?.artists.find((a) => a.name === name),
      )?.name ?? song.artists[0].name;

    return {
      artist: [mainArtist],
      track: song.title,
      timestamp: Math.floor(Date.now() / 1000),
      album: song.album?.name,
      chosenByUser: chosenByUser,
      trackNumber: song.trackNumber,
      mbid: await this.getMbId(song),
      albumArtist: song.album?.artists.map((a) => a.name),
      duration: song.duration,
    };
  }

  private async getMbId(song: Song): Promise<string | undefined> {
    const queryString = [
      `query=recording:"${song.title}"`,
      `artist:"${song.artists[0].name}"`,
      `release:"${song.album?.name}"`,
      `artistname:"${song.album?.artists[0].name}"`,
    ].join(" AND ");

    const response = await this.mbApi
      .search("recording", {
        query: queryString,
        limit: 1,
      })
      .catch(() => undefined);

    return (response?.count ?? 0) > 0 ? response!.recordings[0].id : undefined;
  }
}

export default new LastFM();
