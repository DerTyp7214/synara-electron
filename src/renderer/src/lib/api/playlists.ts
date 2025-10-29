import { apiCall } from "$lib/api/utils";
import type { PagedResponse } from "$lib/api/apiTypes";
import type { UUID } from "node:crypto";

export interface Playlist {
  id: UUID;
  imageId: UUID;
  name: string;
  songs: Array<string>;
  totalDuration: number;
}

export async function listPlaylists(
  page?: number,
  pageSize?: number,
): Promise<PagedResponse<Playlist>> {
  const response = await apiCall<PagedResponse<Playlist>>({
    path: "/playlist/list",
    method: "GET",
    query: { page, pageSize },
    auth: true,
  });

  return response.getData();
}
