import { get } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import { ApiResponse, type TokenResponse } from "$lib/api/apiTypes";
import { debugLog } from "$lib/logger";
import { settings } from "$lib/settings";

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
    if (!token) return false;

    const response = await apiCall<TokenResponse>({
      path: "/refresh-token",
      method: "POST",
      body: { refreshToken: token },
    });

    if (response.isOk()) {
      const token = await response.getData();

      settings.token.set({
        jwt: token.token,
        refreshToken: token.refreshToken,
      });
    } else {
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
      return new ApiResponse<T>(response);
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
