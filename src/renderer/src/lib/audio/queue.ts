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
import { invertObject } from "$lib/utils";

export type QueueCallbackData = {
  queue: Array<Song>;
  index: number;
};
type ShuffleMap = Record<number, number>;

// noinspection JSUnusedGlobalSymbols
export class Queue implements Readable<QueueCallbackData> {
  public readonly id: UUID | string;
  public readonly name: string;

  private readonly queueStore: Writable<Array<Song>>;
  private readonly shuffledMapStore: Writable<ShuffleMap>;
  private readonly currentIndexStore: Writable<number>;

  public readonly queue: Readable<Array<Song>>;
  public readonly duration: Readable<number>;
  public readonly durationLeft: Readable<number>;
  public readonly currentSong: Readable<Song>;
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
    initialShuffledMap = {},
    shuffled = false,
    writeToSettings = false,
  }: {
    id: string;
    name?: string;
    initialIndex?: number;
    initialQueue?: Array<Song>;
    initialShuffledMap?: Record<number, number>;
    shuffled?: boolean;
    writeToSettings?: boolean;
  }) {
    this.id = id;
    this.name = name ?? "";

    this.writeToSettings = writeToSettings;

    this.queueStore = writable(JSON.parse(JSON.stringify(initialQueue)));
    this.currentIndexStore = writable(initialIndex);
    this.shuffledMapStore = writable(
      JSON.parse(JSON.stringify(initialShuffledMap)),
    );

    this.queueStore.subscribe((queue) => {
      if (this.writeToSettings) settings.queue.set(queue);
    });

    this.shuffledMapStore.subscribe((map) => {
      if (this.writeToSettings) settings.shuffleMap.set(map);
    });

    this.currentIndexStore.subscribe((index) => {
      if (this.writeToSettings) settings.currentIndex.set(index);
    });

    if (this.writeToSettings) this.setShuffled(shuffled);

    settings.shuffle.subscribe((shuffled) => {
      this.setShuffled(shuffled);
    });

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
      [],
    ) as Readable<Array<Song>>;

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
          songById(song.id)
            .then((song) => set(song))
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
    this.queueStore.update((q) => [...q, ...JSON.parse(JSON.stringify(songs))]);
    this.maybeReshuffle();
  }

  public removeFromQueue(...songs: Array<Song>) {
    const idsToRemove = new Set(songs.map((song) => song.id));
    this.queueStore.update((q) =>
      q.filter((song) => !idsToRemove.has(song.id)),
    );
    this.maybeReshuffle();
  }

  public removeIndicesFromQueue(...indices: Array<number>) {
    const indicesToRemove = new Set(indices);
    this.queueStore.update((q) => q.filter((_, i) => !indicesToRemove.has(i)));
    this.maybeReshuffle();
  }

  public setShuffled(shuffled: boolean) {
    const currentShuffle = get(settings.shuffle);
    if (currentShuffle === shuffled) return;

    if (shuffled) {
      const shuffleMap = this.generateShuffleMap(get(this.queueStore).length);
      this.shuffledMapStore.set(shuffleMap);
    } else {
      this.shuffledMapStore.set({});
    }
    settings.shuffle.set(shuffled);
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
      index = Number(invertObject(map)[index] ?? NaN);
    } else index += 1;
    if (index > maxIndex && get(settings.repeatMode) === RepeatMode.List)
      this.setIndex(0);
    else if (index > maxIndex) {
      audioSession.seekToSeconds(audioSession.getDurationInSeconds());
      mediaSession.pause();
      mediaSession.paused.set(true);
    } else this.setIndex(index);
    return get(this.currentIndex);
  }

  public previousSong() {
    const maxIndex = get(this.queueStore).length - 1;
    let index = get(this.currentIndex);
    if (get(settings.shuffle)) {
      const map = get(this.shuffledMapStore);
      index = map[index] - 1;
      index = Number(invertObject(map)[index] ?? NaN);
    } else index -= 1;
    if (index < 0 && get(settings.repeatMode) === RepeatMode.List)
      this.setIndex(maxIndex);
    else this.setIndex(index);
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
    return Math.max(0, Math.ceil(get(this.currentIndex) / pageSize) - 1);
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

    const shuffleMap: ShuffleMap = {};
    for (let i = 0; i < listLength; i++) {
      shuffleMap[i] = indices[i];
    }
    return shuffleMap;
  }
}
