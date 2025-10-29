import type { UUID } from "node:crypto";
import type { Artist } from "$lib/api/artists";

export interface Album {
  id: UUID;
  name: string;
  coverId?: UUID;
  releaseDate?: number;
  songCount: number;
  totalDuration: number;
  totalSize: number;
  artists: Array<Artist>;
}
