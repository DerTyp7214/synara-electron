import { get, writable } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import { ApiResponse, type TokenResponse } from "$lib/api/apiTypes";
import { debugLog } from "$lib/logger";

const { jwt, refreshToken } = JSON.parse(localStorage.getItem("token") ?? "{}");
const { apiBase } = JSON.parse(localStorage.getItem("settings") ?? "{}");

export const apiBaseStore = writable<string | null>(apiBase);
export const jwtStore = writable<string | null>(jwt);
export const refreshTokenStore = writable<string | null>(refreshToken);

function updateLocalStorage(key: string, value: Record<string, unknown>) {
  localStorage.setItem(
    key,
    JSON.stringify({
      ...JSON.parse(localStorage.getItem(key) ?? "{}"),
      ...value,
    }),
  );
}

apiBaseStore.subscribe((apiBase) => {
  updateLocalStorage("settings", { apiBase });
});

jwtStore.subscribe((jwt) => {
  updateLocalStorage("token", { jwt });
});

refreshTokenStore.subscribe((refreshToken) => {
  updateLocalStorage("token", { refreshToken });
});

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

  const jwt = get(jwtStore);

  if (auth && jwt) {
    if (!isJwtValid(jwt)) await refreshJwt();
    result["Authorization"] = "Bearer " + get(jwtStore);
  }

  return result;
}

export async function refreshJwt() {
  try {
    const token = get(refreshTokenStore);
    if (!token) return false;

    const response = await apiCall<TokenResponse>({
      path: "/refresh-token",
      method: "POST",
      body: { refreshToken: token },
    });

    if (response.isOk()) {
      const token = await response.getData();

      jwtStore.set(token.token);
      refreshTokenStore.set(token.refreshToken);
    } else {
      jwtStore.set(null);
      refreshTokenStore.set(null);
    }

    return response.isOk();
  } catch (error) {
    jwtStore.set(null);
    refreshTokenStore.set(null);
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
  const base = host ?? get(apiBaseStore) ?? "http://localhost:8080/";
  // noinspection HttpUrlsUsage
  return base.startsWith("http") ? base : `http://${base}`;
}
