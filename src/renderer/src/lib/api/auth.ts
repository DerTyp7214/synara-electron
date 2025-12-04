import { apiCall, refreshJwt } from "$lib/api/utils";
import {
  ApiResponse,
  type TokenResponse,
  type UserInfo,
} from "$lib/api/apiTypes";
import { get, writable } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import { resolve } from "$app/paths";
import { goto } from "$app/navigation";
import { health } from "$lib/api/main";
import { settings } from "$lib/settings";

export const loggedIn = writable<boolean>(false);

export async function checkLogin(): Promise<boolean> {
  let isValid = isJwtValid(get(settings.token)?.jwt);

  if (isValid) {
    isValid = await health().then((r) => r.available);
  } else {
    if (await refreshJwt()) return checkLogin();
    else {
      void goto(resolve("/login"));
      isValid = false;
    }
  }

  loggedIn.set(isValid);

  return isValid;
}

export async function login(
  username: string,
  password: string,
): Promise<ApiResponse<TokenResponse>> {
  const response = await apiCall<TokenResponse>({
    path: "/authenticate",
    method: "POST",
    body: {
      username,
      password,
    },
    expectedStatus: 200,
    expectedErrorStatus: 401,
  });

  if (response.isOk()) {
    const token = await response.getData();

    settings.token.set({
      jwt: token.token,
      refreshToken: token.refreshToken,
    });

    loggedIn.set(true);
  }

  return response;
}

export async function userInfo(): Promise<UserInfo> {
  const response = await apiCall<UserInfo>({
    path: "/userInfo",
    method: "GET",
    auth: true,
    expectedStatus: 200,
    expectedErrorStatus: 401,
  });

  return response.getData();
}
