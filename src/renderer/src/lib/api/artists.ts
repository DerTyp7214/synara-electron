import type { UUID } from "node:crypto";

export interface Artist {
  id: UUID;
  name: string;
  imageId?: UUID;
  about: string;
  isGroup: boolean;
  artists: Array<Artist>;
}
