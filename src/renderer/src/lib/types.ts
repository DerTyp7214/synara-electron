import type { RGBColor } from "colorthief";
import type {
  SvelteVirtualListProps,
  SvelteVirtualListScrollOptions,
} from "@humanspeak/svelte-virtual-list";
import type { SvelteComponent } from "svelte";

export type PartialRecord<K extends PropertyKey, T> = {
  [P in K]?: T;
};

type Segment8 =
  `${string}${string}${string}${string}${string}${string}${string}${string}`;
type Segment4 = `${string}${string}${string}${string}`;
type Segment12 =
  `${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}`;

export type FormatGuid<S extends string> =
  S extends `${infer P1 extends Segment8}${infer P2 extends Segment4}${infer P3 extends Segment4}${infer P4 extends Segment4}${infer P5 extends Segment12}`
    ? `${P1}-${P2}-${P3}-${P4}-${P5}`
    : S;

export type MaybePromise<T> = T | Promise<T>;

export type TypedKeys<T, O> = {
  [K in keyof T]: T[K] extends O ? K : never;
}[keyof T];

export type ParticleState = {
  velocityMultiplier: number;
  currentVelocityMultiplier: number;
  emissionRate: number;
  xOffset: number;
  yOffset: number;
  startOffset: number;
  color: RGBColor;
};

export type SvelteVirtualListRefType<T> = SvelteComponent<
  SvelteVirtualListProps<T>,
  object,
  object
> & {
  $$bindings?: "" | undefined;
} & {
  scrollToIndex: (
    index: number,
    smoothScroll?: boolean | undefined,
    shouldThrowOnBounds?: boolean | undefined,
  ) => void;
  scroll: (options: SvelteVirtualListScrollOptions) => Promise<unknown>;
};
