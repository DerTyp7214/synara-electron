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
