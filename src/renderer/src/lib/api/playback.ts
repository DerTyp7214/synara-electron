import { apiCall } from "$lib/api/utils";
import type { Song } from "$shared/types/beApi";
import { get } from "svelte/store";
import { mediaSession } from "$lib/audio/mediaSession";
import { settings } from "$lib/utils/settings";
import { RepeatMode } from "$shared/models/repeatMode";
import type { UUID } from "node:crypto";

export interface PlaybackState {
  queue: Array<QueueEntry>;
  currentIndex: number;
  isPlaying: boolean;
  positionMs: number;
  shuffleMode: boolean;
  repeatMode: "NONE" | "ONE" | "ALL";
  sourceId?: string;
}

export type QueueEntry = FromSourceQueueEntry | ExplicitQueueEntry;

export interface FromSourceQueueEntry {
  type: "FromSource";
  songId: string;
  queueId: number;
}

export interface ExplicitQueueEntry {
  type: "Explicit";
  song: Song;
  queueId: number;
}

export async function getPlaybackState(
  sessionId: UUID,
): Promise<PlaybackState> {
  const response = await apiCall<PlaybackState>({
    path: `/playback/${sessionId}`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}

export async function postPlaybackState(sessionId: UUID): Promise<void> {
  const queue = mediaSession.getUnshuffledQueue();
  const currentIndex = get(settings.currentIndex);
  const isPlaying = !get(mediaSession.paused);
  const positionMs = Math.round(get(mediaSession.currentPosition));
  const shuffleMode = get(settings.shuffle);
  const repeatMode = get(settings.repeatMode);
  const sourceId = get(settings.playingSourceId);

  const state: PlaybackState = {
    queue: queue.map((item, index) => ({
      type: "FromSource",
      songId: item.id,
      queueId: index,
    })),
    currentIndex,
    isPlaying,
    positionMs,
    shuffleMode,
    repeatMode:
      repeatMode === RepeatMode.None
        ? "NONE"
        : repeatMode === RepeatMode.Track
          ? "ONE"
          : "ALL",
    sourceId: sourceId || undefined,
  };

  await apiCall<void>({
    path: `/playback/${sessionId}`,
    method: "POST",
    body: state as unknown as Record<string, unknown>,
    auth: true,
  });
}
