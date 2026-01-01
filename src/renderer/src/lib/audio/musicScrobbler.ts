import { settings, settingsService } from "$lib/utils/settings";
import type { Song, SongWithPosition } from "$shared/types/beApi";
import { type LastFmSong, type MbSong, nullSong } from "$shared/types/settings";
import {
  get,
  readonly,
  type Unsubscriber,
  type Writable,
  writable,
} from "svelte/store";
import { mediaSession, MediaSession } from "$lib/audio/mediaSession";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import { openUrl, sleep } from "$lib/utils/utils";
import {
  getRequestToken,
  getSessionKey,
  scrobble as lastFmScrobble,
  updateNowPlaying as lastFmUpdateNowPlaying,
} from "$lib/api/lastFm";
import {
  scrobble as mbScrobble,
  updateNowPlaying as mbUpdateNowPlaying,
} from "$lib/api/musicBrainz";
import { t } from "$lib/i18n/i18n";
import { MusicBrainzApi } from "musicbrainz-api";
import { version } from "$app/environment";

class MusicScrobbler {
  private logScope = {
    name: "MusicScrobbler",
    style: scopeStyle("#D32F2F"),
  };

  private mbApi = new MusicBrainzApi({
    appName: "synara",
    appVersion: "1.0",
    appContactInfo: "github@dertyp.dev",
  });

  private scrobbleQueue = settings.lastFmScrobbleQueue;
  private scrobblingQueue: boolean = false;
  private currentSong = writable<SongWithPosition>();

  private unsubscribers: Array<() => void> = [];
  private queueUnsubscribers: Array<Unsubscriber> = [];

  constructor() {
    const scrobbledBadgeColor = "#87f487";
    const neutralBadgeColor = "#b3b3b3";

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
      window.listenCustomEvent("replaySong", () => {
        this.resetScrobbler();
      }),
      this.scrobbled.subscribe((scrobbled) => {
        if (!get(settings.lastFm)) return;

        if (scrobbled) window.api?.setBadgeColor(scrobbledBadgeColor);
        else window.api?.setBadgeColor(neutralBadgeColor);
      }),
      mediaSession.paused.subscribe((paused) => {
        if (paused) window.api?.clearBadge();
        else
          window.api?.setBadgeColor(
            get(this.scrobbled) ? scrobbledBadgeColor : neutralBadgeColor,
          );
      }),
      settings.lastFm.subscribe((enabled) => {
        if (!enabled) window.api?.clearBadge();
        else
          window.api?.setBadgeColor(
            get(this.scrobbled) ? scrobbledBadgeColor : neutralBadgeColor,
          );
      }),
    );
  }

  private currentPlayingTimeout: NodeJS.Timeout | undefined;
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
      this.currentSong.subscribe(() => {
        if (this.currentPlayingTimeout)
          clearTimeout(this.currentPlayingTimeout);
        this.currentPlayingTimeout = setTimeout(() => {
          this.songTimeoutStartTime = Date.now();
          this.songTimeoutEndTime = this.songTimeoutStartTime;

          const song = get(this.currentSong);

          this.songTimer(song);
          void this.nowPlaying(song);
        }, 3000);
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

  private resetScrobbler() {
    this.songTimeoutStartTime = Date.now();
    this.songTimeoutEndTime = this.songTimeoutStartTime;

    this.songTimer(get(this.currentSong));
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

    openUrl(url.toString());

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

    const time = Date.now();

    const track = this.songToLastFmSong(song, false, time);
    const mbSong = await this.songToMbSong(song, time);

    scopedDebugLog("info", this.logScope, "nowPlaying", track, mbSong);

    const success = await Promise.all([
      lastFmUpdateNowPlaying
        .bind(this)(track)
        .catch((err) => {
          scopedDebugLog("error", this.logScope, err);
        }),
      mbUpdateNowPlaying
        .bind(this)(mbSong)
        .catch((err) => {
          scopedDebugLog("error", this.logScope, err);
        }),
    ]).then(([a, b]) => a && b);

    if (!success) setTimeout(this.nowPlaying.bind(this), 3000, song);
  }

  public async addSongToScrobbleQueue(
    song: Song & { lastFm?: boolean; listenBrainz?: boolean },
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
      const { lastFm, listenBrainz } = await this.scrobble(song);
      song.lastFm = lastFm;
      song.listenBrainz = listenBrainz;

      if (get(this.scrobbleQueue).length > 0 || !lastFm || !listenBrainz)
        this.scrobbleQueue.update((queue) => [...queue, song]);
    } catch (error) {
      scopedDebugLog("error", this.logScope, error, song);
    }
  }

  private songTimeout: NodeJS.Timeout | null = null;
  private songTimeoutStartTime: number = 0;
  private songTimeoutEndTime: number = 0;

  private scrobbled: Writable<boolean> = writable(false);
  private targetScrobbledTime: Writable<number> = writable(Date.now());

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
    this.scrobbled.set(false);
    this.targetScrobbledTime.set(Date.now() + runTime);
    this.songTimeout = setTimeout(
      (song) => {
        if (song.id === get(this.currentSong)?.id) {
          this.scrobbled.set(true);
          void this.addSongToScrobbleQueue(song);

          this.songTimeoutStartTime = Date.now();
          this.songTimeoutEndTime = Date.now();
        }
      },
      runTime,
      song,
    );
  }

  public hasScrobbled() {
    return readonly(this.scrobbled);
  }

  public targetScrobbledSysTime() {
    return readonly(this.targetScrobbledTime);
  }

  private async runScrobbleQueue() {
    if (!get(settings.lastFm)) return;

    this.scrobblingQueue = true;

    let hasQueue = get(this.scrobbleQueue).length > 0;
    while (hasQueue) {
      const song = get(this.scrobbleQueue)[0];

      const { lastFm, listenBrainz } = await this.scrobble(song);

      if (lastFm && listenBrainz)
        this.scrobbleQueue.update((queue) => [...queue.slice(1)]);
      else {
        this.scrobbleQueue.update((queue) => [
          {
            ...queue[0],
            lastFm,
            listenBrainz,
          },
          ...queue.slice(1),
        ]);
        await sleep(5000);
      }

      hasQueue = get(this.scrobbleQueue).length > 0;
    }

    this.scrobblingQueue = false;
  }

  private async scrobble(
    song: Song & { lastFm?: boolean; listenBrainz?: boolean },
  ): Promise<{ lastFm: boolean; listenBrainz: boolean }> {
    scopedDebugLog("info", this.logScope, "scrobbling", song);

    try {
      const time = Date.now();

      return await Promise.allSettled([
        !song.lastFm
          ? lastFmScrobble.bind(this)(this.songToLastFmSong(song, false, time))
          : true,
        !song.listenBrainz
          ? mbScrobble.bind(this)(await this.songToMbSong(song, time))
          : true,
      ]).then(([a, b]) => ({
        lastFm: a.status === "fulfilled" && a.value,
        listenBrainz: b.status === "fulfilled" && b.value,
      }));
    } catch (error) {
      scopedDebugLog("error", this.logScope, "scrobbling", error);
      return {
        lastFm: false,
        listenBrainz: false,
      };
    }
  }

  private songToLastFmSong(
    song: Song,
    chosenByUser: boolean,
    time: number = Date.now(),
  ): LastFmSong {
    const mainArtist =
      song.artists.find(({ name }) =>
        song.album?.artists.find((a) => a.name === name),
      )?.name ?? song.artists[0].name;

    return {
      artist: [mainArtist],
      track: song.title,
      timestamp: Math.floor(time / 1000),
      album: song.album?.name,
      chosenByUser: chosenByUser,
      trackNumber: song.trackNumber,
      albumArtist: song.album?.artists.map((a) => a.name),
      duration: song.duration,
    };
  }

  private cleanTitle<T extends string | undefined>(title: T): T {
    if (!title) return title;

    const regex =
      /\s*([([].*?(feat|ft|with|prod|live|remix|acoustic|radio\sedit|explicit|clean).*?[)\]])|\s+(feat|ft|with|prod)\.?\s+.*$/gi;

    return title.replace(regex, "").trimEnd() as T;
  }

  private async songToMbSong(
    song: Song,
    time: number = Date.now(),
  ): Promise<MbSong> {
    const response = await this.searchMb(song).then(
      (res) => res?.recordings?.[0],
    );

    if (!response) {
      return {
        listened_at: Math.floor(time / 1000),
        track_metadata: {
          additional_info: {
            media_player: "Synara",
            submission_client: "Synara Music Player",
            submission_client_version: version,
            tags: [],
            duration_ms: song.duration,
          },
          artist_name: song.artists.map((a) => a.name).join(" & "),
          track_name: song.title,
          release_name: song.album?.name ?? song.title,
        },
      };
    }

    const release =
      response.releases?.find(
        (r) => r.title === this.cleanTitle(song.album?.name),
      ) ?? response.releases?.[0];

    return {
      listened_at: Math.floor(time / 1000),
      track_metadata: {
        additional_info: {
          media_player: "Synara",
          submission_client: "Synara Music Player",
          submission_client_version: version,
          release_mbid: release?.id,
          artist_mbids: response["artist-credit"]?.map((a) => a.artist.id),
          recording_mbid: response.id,
          tags: [],
          duration_ms: response.length,
        },
        artist_name:
          response["artist-credit"]
            ?.map((a) => a.name + (a.joinphrase ?? ""))
            ?.join("") ?? song.artists.map((a) => a.name).join(" & "),
        track_name: response.title,
        release_name: release?.title ?? song.album?.name ?? song.title,
      },
    };
  }

  private async searchMb(song: Song) {
    const title = this.cleanTitle(song.title);
    const albumName = this.cleanTitle(song.album?.name);

    const query = [
      `recording:"${title}"`,
      ...song.artists.map((a) => `artist:"${a.name}"`),
      albumName !== title ? `release:"${albumName}"` : "",
      ...(song.album?.artists?.map((a) => `artistname:"${a.name}"`) ?? []),
    ]
      .filter(Boolean)
      .join(" AND ");

    return await this.mbApi
      .search("recording", {
        query: query,
        limit: 1,
      })
      .catch(() => undefined);
  }
}

export default new MusicScrobbler();
