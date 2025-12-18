// noinspection DuplicatedCode

import { get } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import {
  ApiResponse,
  type PagedResponse,
  type TokenResponse,
} from "$lib/api/apiTypes";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import { settings } from "$lib/utils/settings";
import type { Album, Artist, Playlist, Song } from "$shared/types/beApi";
import { checkLogin } from "$lib/api/auth";

export const apiLogScope = { name: "Api", style: scopeStyle("#0a22b2") };

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

    scopedDebugLog("info", apiLogScope, "refreshJwt.token", token);

    if (!token) return false;

    const response = await apiCall<TokenResponse>({
      path: "/refresh-token",
      method: "POST",
      body: { refreshToken: token },
    });

    if (response.isOk()) {
      const token = await response.getData();

      scopedDebugLog("info", apiLogScope, "refreshJwt.newToken", token);

      settings.token.set({
        jwt: token.token,
        refreshToken: token.refreshToken,
      });
    } else {
      scopedDebugLog(
        "error",
        apiLogScope,
        "refreshJwt.response.isNotOk",
        response,
      );
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
    scopedDebugLog("error", apiLogScope, "refreshJwt", error);
    return false;
  }
}

function buildUrl(
  path: string,
  query: Record<string, PropertyKey | boolean | undefined>,
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
  path?: string;
  method: string;
  auth?: boolean;
  host?: string | null;
  headers?: Record<string, string>;
  query?: Record<string, PropertyKey | boolean | undefined>;
  body?: Record<string, unknown> | Array<unknown>;
  formBody?: URLSearchParams;
  expectedStatus?: number;
  expectedErrorStatus?: number;
}): Promise<ApiResponse<T>> {
  const {
    path,
    method,
    auth,
    query,
    body,
    formBody,
    host,
    expectedStatus,
    expectedErrorStatus,
    headers,
  } = Object.assign(
    {
      path: "",
      query: {},
      expectedStatus: 200,
    },
    options,
  );

  // @ts-expect-error in case of binding the function
  const logScope = this?.logScope ?? apiLogScope;

  scopedDebugLog(
    "info",
    logScope,
    ">",
    formBody?.get("method") ?? path,
    method,
    query,
    formBody ? Object.fromEntries([...formBody]) : body,
    expectedStatus,
  );

  const response = await fetch(buildUrl(path, query, host), {
    method: method,
    headers: await getHeaders(auth, headers),
    body: formBody?.toString() ?? (body ? JSON.stringify(body) : undefined),
  });

  scopedDebugLog("info", logScope, "<", path, method, response);

  switch (response.status) {
    case expectedStatus: {
      return new ApiResponse<T>(response, logScope);
    }
    case expectedErrorStatus: {
      return new ApiResponse<T>(response, logScope);
    }
    case 401: {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (path === "/refresh-token")
        return new ApiResponse<T>(response, logScope);
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

export async function apiStream<T>(
  options: {
    path?: string;
    method: string;
    auth?: boolean;
    host?: string | null;
    headers?: Record<string, string>;
    query?: Record<string, PropertyKey | undefined>;
    body?: Record<string, unknown>;
    formBody?: URLSearchParams;
    expectedStatus?: number;
    expectedErrorStatus?: number;
  },
  callback: (line: string) => void,
): Promise<ApiResponse<T>> {
  const {
    path,
    method,
    auth,
    query,
    body,
    formBody,
    host,
    expectedStatus,
    expectedErrorStatus,
    headers,
  } = Object.assign(
    {
      path: "",
      query: {},
      expectedStatus: 200,
    },
    options,
  );

  // @ts-expect-error in case of binding the function
  const logScope = this?.logScope ?? apiLogScope;

  scopedDebugLog(
    "info",
    logScope,
    ">",
    formBody?.get("method") ?? path,
    method,
    query,
    formBody ? Object.fromEntries([...formBody]) : body,
    expectedStatus,
  );

  const response = await fetch(buildUrl(path, query, host), {
    method: method,
    headers: await getHeaders(auth, headers),
    body: formBody?.toString() ?? (body ? JSON.stringify(body) : undefined),
  });

  switch (response.status) {
    case expectedStatus: {
      const reader = response.body
        ?.pipeThrough(new TextDecoderStream())
        .getReader();

      if (!reader) return new ApiResponse<T>(response, logScope);

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          scopedDebugLog("info", logScope, "Stream finished.");
          break;
        }

        const events = value?.split("\n\n");
        for (const event of events) {
          let fullLine = "";
          for (const line of event.split("\n")) {
            if (line.startsWith("event:")) {
              fullLine += line.slice(6).trim() + " ";
            } else if (line.startsWith("data:")) {
              fullLine += line.slice(5).trim() + " ";
            }
          }
          if (fullLine.trim().length) callback(fullLine.trim());
        }
      }

      return new ApiResponse<T>(response, logScope);
    }
    case expectedErrorStatus: {
      return new ApiResponse<T>(response, logScope);
    }
    case 401: {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (path === "/refresh-token")
        return new ApiResponse<T>(response, logScope);
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
