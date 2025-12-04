import {
  derived,
  get,
  type Readable,
  writable,
  type Writable,
} from "svelte/store";
import { type Song, songById } from "$lib/api/songs";
import { RepeatMode } from "$shared/models/repeatMode";
import { nullSong } from "$shared/types/settings";
import { settings } from "$lib/settings";
import type { UUID } from "node:crypto";
import { audioSession } from "$lib/audio/audioSession";
import { mediaSession } from "$lib/audio/mediaSession";
import { copy, invertArray } from "$lib/utils";
import type { SongWithPosition } from "$shared/types/beApi";
import { scopeStyle } from "$lib/logger";

export interface SongLikedEventData {
  songId: Song["id"];
  isFavourite: boolean;
}

export type QueueCallbackData = {
  queue: Array<SongWithPosition>;
  index: number;
};
type ShuffleMap = Array<number>;

// noinspection JSUnusedGlobalSymbols
export class Queue implements Readable<QueueCallbackData> {
  private readonly logScope = {
    name: "Queue",
    style: scopeStyle("#66d32f", "black"),
  };

  public readonly id: UUID | string;
  public readonly name: string;

  private readonly queueStore: Writable<Array<SongWithPosition>>;
  private readonly shuffledMapStore: Writable<ShuffleMap>;
  private readonly currentIndexStore: Writable<number>;

  private readonly unsubscribers: Array<() => void> = [];

  public readonly queue: Readable<Array<SongWithPosition>>;
  public readonly duration: Readable<number>;
  public readonly durationLeft: Readable<number>;
  public readonly currentSong: Readable<SongWithPosition>;
  public readonly currentIndex: Readable<number>;

  private writeToSettings = false;

  public readonly subscribe: (
    this: void,
    run: (value: QueueCallbackData) => void,
    invalidate?: (value?: QueueCallbackData) => void,
  ) => () => void;

  constructor({
    id,
    name,
    initialQueue = [],
    initialIndex = 0,
    initialShuffledMap = [],
    shuffled = get(settings.shuffle),
    writeToSettings = false,
  }: {
    id: string;
    name?: string;
    initialIndex?: number;
    initialQueue?: Array<Song>;
    initialShuffledMap?: Array<number>;
    shuffled?: boolean;
    writeToSettings?: boolean;
  }) {
    this.id = id;
    this.name = name ?? "";

    this.writeToSettings = writeToSettings;

    this.queueStore = writable(
      copy(initialQueue).map((value, index) => ({ ...value, position: index })),
    );
    this.currentIndexStore = writable(initialIndex);
    this.shuffledMapStore = writable(copy(initialShuffledMap));

    this.unsubscribers.push(
      this.queueStore.subscribe((queue) => {
        if (this.writeToSettings) settings.queue.set(copy(queue));
      }),
    );

    this.unsubscribers.push(
      this.shuffledMapStore.subscribe((map) => {
        if (this.writeToSettings) settings.shuffleMap.set(map);
      }),
    );

    this.unsubscribers.push(
      this.currentIndexStore.subscribe((index) => {
        if (this.writeToSettings) settings.currentIndex.set(index);
      }),
    );

    if (this.writeToSettings) this.setShuffled(shuffled);

    if (initialShuffledMap.length === 0) this.shuffle(shuffled);

    this.unsubscribers.push(
      settings.shuffle.subscribe((shuffled) => {
        this.setShuffled(shuffled);
      }),
    );

    this.unsubscribers.push(
      (() => {
        const handler = ({
          detail: { songId, isFavourite },
        }: CustomEvent<SongLikedEventData>) => {
          const queue = get(this.queueStore);

          const index = queue.findIndex((song) => song.id === songId);

          if (index >= 0) queue[index].isFavourite = isFavourite;
        };
        return window.listenCustomEvent("songLiked", handler);
      })(),
    );

    this.queue = derived(
      [this.queueStore, this.shuffledMapStore],
      ([$queue, $shuffledMap]) => {
        return (
          $queue
            .map((s, i) => ({
              ...s,
              sortKey: $shuffledMap[i] ?? i,
            }))
            .toSorted((a, b) => a.sortKey - b.sortKey)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ sortKey, ...item }) => item)
        );
      },
      get(this.queueStore),
    ) as Readable<Array<SongWithPosition>>;

    this.duration = derived(this.queueStore, ($queue) =>
      $queue.reduce((acc, cur) => acc + cur.duration, 0),
    );

    this.durationLeft = derived(
      [this.queue, this.currentIndexStore],
      ([$queue, $currentIndex]) => {
        const startIndex = Math.max(0, Math.min($currentIndex, $queue.length));

        return $queue
          .slice(startIndex)
          .reduce((acc, cur) => acc + cur.duration, 0);
      },
    );

    this.currentIndex = derived(
      [this.currentIndexStore],
      ([$index]) => {
        return $index;
      },
      -1,
    );

    this.currentSong = derived(
      [this.queueStore, this.currentIndexStore],
      ([$queue, $currentIndex], set) => {
        const song = $queue[$currentIndex];
        if (!song) return;
        else
          songById
            .bind(this)(song.id)
            .then((s) => set({ ...s, position: song.position }))
            .catch(() => set(nullSong));
      },
      get(this.queue)?.[get(this.currentIndex)] ?? nullSong,
    );

    const mainStore = derived(
      [this.queue, this.currentIndexStore],
      ([$queue, $currentIndex]) => ({
        queue: $queue,
        index: $currentIndex,
      }),
    );
    this.subscribe = mainStore.subscribe;
  }

  public addToQueue(...songs: Array<Song>) {
    this.queueStore.update((q) => [
      ...q,
      ...copy(songs).map((s: Song, i) => ({
        ...s,
        position: q.length + i,
      })),
    ]);

    if (get(settings.shuffle)) {
      this.shuffledMapStore.update((shuffleMap) => {
        const newShuffleMap = [...shuffleMap];
        const songsLength = songs.length;

        const newIndices = Array.from(
          { length: songsLength },
          (_, i) => newShuffleMap.length + i,
        );

        return [...newShuffleMap, ...newIndices];
      });
    }
  }

  public updateSong(song: SongWithPosition, refresh: boolean = false) {
    const q = get(this.queueStore);
    const index = q.findIndex(
      (s) => s.id === song.id && s.position === song.position,
    );

    if (index !== -1) {
      q[index] = song;
      if (refresh) this.queueStore.set(q);
      else if (this.writeToSettings) settings.queue.set(copy(q));
    }
  }

  public removeFromQueue(...songs: Array<Song>) {
    const idsToRemove = new Set(songs.map((song) => song.id));
    this.queueStore.update((q) =>
      q.filter((song) => !idsToRemove.has(song.id)),
    );
    this.maybeReshuffle();
  }

  public playNext(...songs: Array<Song>) {
    this.queueStore.update((q) => {
      const currentSongIndex = get(this.currentIndex);
      const newQueue: Array<Song> = [...q];
      newQueue.splice(currentSongIndex + 1, 0, ...copy(songs));
      return newQueue.map((song, index) => ({ ...song, position: index }));
    });

    if (get(settings.shuffle)) {
      this.shuffledMapStore.update((shuffleMap) => {
        const newShuffleMap = [...shuffleMap];
        const currentIndex = get(this.currentIndex);
        const currentShuffleIndex = newShuffleMap[currentIndex];
        const songsLength = songs.length;

        for (let i = 0; i < newShuffleMap.length; i++) {
          if (newShuffleMap[i] > currentShuffleIndex) {
            newShuffleMap[i] += songsLength;
          }
        }

        const newIndices = Array.from(
          { length: songsLength },
          (_, i) => currentShuffleIndex + 1 + i,
        );

        newShuffleMap.splice(currentIndex + 1, 0, ...newIndices);

        return newShuffleMap;
      });
    }
  }

  public removeIndicesFromQueue(...indices: Array<number>) {
    const indicesToRemove = new Set(indices);
    this.queueStore.update((q) => q.filter((_, i) => !indicesToRemove.has(i)));
    this.maybeReshuffle();
  }

  public setShuffled(shuffled: boolean) {
    const currentShuffle = get(settings.shuffle);
    if (currentShuffle === shuffled) return;

    this.shuffle(shuffled);
    settings.shuffle.set(shuffled);
  }

  public shuffle(shuffled: boolean = get(settings.shuffle)) {
    if (shuffled) {
      const shuffleMap = this.generateShuffleMap(get(this.queueStore).length);
      this.shuffledMapStore.set(shuffleMap);
    } else {
      this.shuffledMapStore.set([]);
    }
  }

  public setIndex(index: number) {
    const sameIndex = index === get(this.currentIndexStore);
    const maxIndex = get(this.queueStore).length - 1;
    if (!sameIndex)
      this.currentIndexStore.set(Math.max(0, Math.min(index, maxIndex)));

    return sameIndex;
  }

  public nextSong() {
    const maxIndex = get(this.queueStore).length - 1;
    let index = get(this.currentIndex);
    if (get(settings.shuffle)) {
      const map = get(this.shuffledMapStore);
      index = map[index] + 1;
      index = Number(invertArray(map)[index] ?? invertArray(map)[0] ?? NaN);
    } else index += 1;
    if (index > maxIndex && get(settings.repeatMode) === RepeatMode.List)
      this.setIndex(0);
    else if (index > maxIndex) {
      audioSession.seekToSeconds(audioSession.getDurationInSeconds());
      mediaSession.pause();
      mediaSession.paused.set(true);
    } else if (!isNaN(index)) this.setIndex(index);
    return get(this.currentIndex);
  }

  public previousSong() {
    const maxIndex = get(this.queueStore).length - 1;
    let index = get(this.currentIndex);
    if (get(settings.shuffle)) {
      const map = get(this.shuffledMapStore);
      index = map[index] - 1;
      index = Number(
        invertArray(map)[index] ?? invertArray(map)[maxIndex] ?? NaN,
      );
    } else index -= 1;
    if (index < 0 && get(settings.repeatMode) === RepeatMode.List)
      this.setIndex(maxIndex);
    else if (!isNaN(index)) this.setIndex(index);
    return get(this.currentIndex);
  }

  public length(): number {
    return get(this.queueStore).length;
  }

  public get(): QueueCallbackData {
    return {
      queue: get(this.queue),
      index: get(this.currentIndex),
    };
  }

  public getPage(pageSize: number) {
    let index = get(this.currentIndex);
    if (get(settings.shuffle)) index = get(this.shuffledMapStore)[index];
    return Math.max(0, Math.ceil(index / pageSize) - 1);
  }

  public getCurrentSong() {
    return get(this.currentSong);
  }

  public getSongByIndex(index: number) {
    return get(this.queueStore)[index];
  }

  public getSongById(songId: Song["id"]) {
    return get(this.queueStore).find((s) => s.id === songId);
  }

  public getIndexById(songId: Song["id"]) {
    return get(this.queueStore).findIndex((s) => s.id === songId);
  }

  public getIndexByIdAndPosition(songId: Song["id"], position: number) {
    return get(this.queueStore).findIndex(
      (s) => s.id === songId && s.position === position,
    );
  }

  public setWriteToSettings(writeToSettings: boolean) {
    this.writeToSettings = writeToSettings;

    if (writeToSettings) {
      settings.queue.set(get(this.queueStore));
      settings.shuffleMap.set(get(this.shuffledMapStore));
    }
  }

  private maybeReshuffle() {
    if (
      get(settings.shuffle) &&
      get(this.queueStore).length !==
        Object.keys(get(this.shuffledMapStore)).length
    ) {
      this.shuffledMapStore.set(
        this.generateShuffleMap(get(this.queueStore).length),
      );
    }
  }

  private generateShuffleMap(listLength: number): ShuffleMap {
    const indices = Array.from({ length: listLength }, (_, i) => i);

    for (let i = listLength - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i) + 1;

      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const indexWhereStartIndexIs = indices.indexOf(get(this.currentIndex));

    [indices[0], indices[indexWhereStartIndexIs]] = [
      indices[indexWhereStartIndexIs],
      indices[0],
    ];

    const shuffleMap: ShuffleMap = [];
    for (let i = 0; i < listLength; i++) {
      shuffleMap[i] = indices[i];
    }
    return shuffleMap;
  }

  public disconnect() {
    for (const unsubscriber of this.unsubscribers) {
      unsubscriber?.();
    }
  }
}
