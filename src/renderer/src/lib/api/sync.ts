import { apiCall } from "$lib/api/utils";

export async function checkTidalSyncAuth(): Promise<boolean> {
  const response = await apiCall<boolean>({
    path: `/sync/tidal/authenticated`,
    method: "GET",
    auth: true,
  });

  return response.getData();
}

export async function tidalSyncAuth(): Promise<string> {
  const response = await apiCall<string>({
    path: `/sync/tidal/auth`,
    method: "GET",
    auth: true,
  });

  return response.getRawText();
}
