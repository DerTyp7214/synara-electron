import { apiCall } from "$lib/api/utils";
import { debugLog } from "$lib/logger";

export async function health(
  customHost?: string | null,
): Promise<{ available: boolean }> {
  try {
    const response = await apiCall<{ available: boolean }>({
      path: "/health",
      method: "GET",
      expectedStatus: 202,
      host: customHost,
    });

    if (response.isOk()) return response.getData();

    return { available: false };
  } catch (error) {
    debugLog("error", "/health", error);
    return { available: false };
  }
}
