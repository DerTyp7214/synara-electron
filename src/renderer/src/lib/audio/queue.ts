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
    this.shuffledMapStore = writable(structuredClone(initialShuffledMap));

    this.queueStore.subscribe((queue) => {
      if (this.writeToSettings) settings.queue.set(queue);
    });

    this.shuffledMapStore.subscribe((map) => {
      if (this.writeToSettings) settings.shuffleMap.set(map);
    });

    this.setShuffled(shuffled);

    settings.shuffle.subscribe((shuffled) => {
      this.setShuffled(shuffled);
    });

    this.queue = derived(
      [this.queueStore, settings.shuffle, this.shuffledMapStore],
      ([$queue, $shuffled, $shuffledMap]) => {
        if (!$shuffled) return Array.from($queue);

        return (
          $queue
            .map((s, i) => ({
              ...s,
              sortKey: $shuffledMap[i],
            }))
            .toSorted((a, b) => a.sortKey - b.sortKey)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ sortKey, ...item }) => item)
        );
      },
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

    this.currentSong = derived(
      [this.queue, this.currentIndexStore],
      ([$queue, $currentIndex], set) => {
        const song = $queue[$currentIndex];
        if (!song) set(nullSong);
        else
          songById(song.id)
            .then((song) => set(song))
            .catch(() => set(nullSong));
      },
      get(this.queue)?.[get(this.currentIndexStore)] ?? nullSong,
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
    settings.shuffle.set(shuffled);
    if (shuffled) {
      this.shuffledMapStore.set(
        this.generateShuffleMap(get(this.queueStore).length),
      );
    } else {
      this.shuffledMapStore.set({});
    }
  }

  public setIndex(index: number) {
    const maxIndex = get(this.queueStore).length - 1;
    this.currentIndexStore.set(Math.max(0, Math.min(index, maxIndex)));
  }

  public nextSong() {
    const maxIndex = get(this.queueStore).length - 1;
    const index = get(this.currentIndexStore) + 1;
    if (index > maxIndex && get(settings.repeatMode) === RepeatMode.List)
      this.currentIndexStore.set(0);
    else this.currentIndexStore.set(Math.max(0, Math.min(index, maxIndex)));
  }

  public previousSong() {
    const maxIndex = get(this.queueStore).length - 1;
    const index = get(this.currentIndexStore) - 1;
    if (index < 0 && get(settings.repeatMode) === RepeatMode.List)
      this.currentIndexStore.set(maxIndex);
    else this.currentIndexStore.set(Math.max(0, Math.min(index, maxIndex)));
  }

  public length(): number {
    return get(this.queueStore).length;
  }

  public get(): QueueCallbackData {
    return {
      queue: get(this.queue),
      index: get(this.currentIndexStore),
    };
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
    const targetIndex = get(this.currentIndexStore);

    [indices[0], indices[targetIndex]] = [indices[targetIndex], indices[0]];

    for (let i = listLength - 1; i > 1; i--) {
      const j = Math.floor(Math.random() * i) + 1;

      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const shuffleMap: ShuffleMap = {};
    for (let i = 0; i < listLength; i++) {
      shuffleMap[i] = indices[i];
    }
    return shuffleMap;
  }
}
