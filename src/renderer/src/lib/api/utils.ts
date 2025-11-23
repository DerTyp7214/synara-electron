import { get } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import {
  ApiResponse,
  type PagedResponse,
  type TokenResponse,
} from "$lib/api/apiTypes";
import { debugLog } from "$lib/logger";
import { settings } from "$lib/settings";
import type { Album, Artist, Playlist, Song } from "$shared/types/beApi";
import { checkLogin } from "$lib/api/auth";

async function getHeaders(
  auth?: boolean,
  headers?: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (headers) {
    Object.keys(headers).forEach((key) => {
      result[key] = headers[key];
    });
  }

  const jwt = get(settings.token!)?.jwt;

  if (auth && jwt) {
    if (!isJwtValid(jwt)) await refreshJwt();
    result["Authorization"] = "Bearer " + get(settings.token!)?.jwt;
  }

  return result;
}

export async function refreshJwt() {
  try {
    const token = get(settings.token!)?.refreshToken;

    debugLog("info", "refreshJwt.token", token);

    if (!token) return false;

    const response = await apiCall<TokenResponse>({
      path: "/refresh-token",
      method: "POST",
      body: { refreshToken: token },
    });

    if (response.isOk()) {
      const token = await response.getData();

      debugLog("info", "refreshJwt.newToken", token);

      settings.token.set({
        jwt: token.token,
        refreshToken: token.refreshToken,
      });
    } else {
      debugLog("error", "refreshJwt.response.isNotOk", response);
      settings.token.set({
        jwt: undefined,
        refreshToken: undefined,
      });
    }

    return response.isOk();
  } catch (error) {
    settings.token.set({
      jwt: undefined,
      refreshToken: undefined,
    });
    debugLog("error", "refreshJwt", error);
    return false;
  }
}

function buildUrl(
  path: string,
  query: Record<string, PropertyKey | undefined>,
  host?: string | null,
): URL {
  const url = new URL(path, getApiUrl(host));

  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.append(key, value.toString());
  }

  return url;
}

type SearchType<T> = T extends Song
  ? "song"
  : T extends Album
    ? "album"
    : T extends Artist
      ? "artist"
      : T extends Playlist
        ? "playlist"
        : never;

export async function queryApi<T>(
  type: SearchType<T>,
  query: string,
  page?: number,
  pageSize?: number,
) {
  const response = await apiCall<PagedResponse<T>>({
    path: `/${type}/search/${encodeURIComponent(query)}`,
    method: "GET",
    query: { page, pageSize, explicit: "true" },
    auth: true,
  });

  return response.getData();
}

export async function apiCall<T>(options: {
  path: string;
  method: string;
  auth?: boolean;
  host?: string | null;
  headers?: Record<string, string>;
  query?: Record<string, PropertyKey | undefined>;
  body?: Record<string, unknown>;
  expectedStatus?: number;
  expectedErrorStatus?: number;
}): Promise<ApiResponse<T>> {
  const {
    path,
    method,
    auth,
    query,
    body,
    host,
    expectedStatus,
    expectedErrorStatus,
    headers,
  } = Object.assign(
    {
      query: {},
      expectedStatus: 200,
    },
    options,
  );

  debugLog("info", ">", path, method, query, body, expectedStatus);

  const response = await fetch(buildUrl(path, query, host), {
    method: method,
    headers: await getHeaders(auth, headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  debugLog("info", "<", path, method, response);

  switch (response.status) {
    case expectedStatus: {
      return new ApiResponse<T>(response);
    }
    case expectedErrorStatus: {
      return new ApiResponse<T>(response);
    }
    case 401: {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (path === "/refresh-token") return new ApiResponse<T>(response);
      if (await refreshJwt()) return apiCall(options);
      if (await checkLogin()) return apiCall(options);
      throw new Error("Unauthorized");
    }
    default: {
      throw new Error(
        `Unexpected status ${response.status} ${await response.text()}`,
      );
    }
  }
}

export function getApiUrl(host?: string | null) {
  const base = host ?? get(settings.apiBase) ?? "http://localhost/";
  // noinspection HttpUrlsUsage
  return base.startsWith("http") ? base : `http://${base}`;
}
