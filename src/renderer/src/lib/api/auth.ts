import { apiCall, jwtStore, refreshTokenStore } from "$lib/api/utils";
import { ApiResponse, type TokenResponse } from "$lib/api/apiTypes";
import { get, writable } from "svelte/store";
import { isJwtValid } from "$lib/api/jwt";
import { resolve } from "$app/paths";
import { goto } from "$app/navigation";

export const loggedIn = writable<boolean>(false);

export function checkLogin(): boolean {
  const isValid = isJwtValid(get(jwtStore));

  loggedIn.set(isValid);

  if (isValid) return true;
  else {
    void goto(resolve("/login"));
    return false;
  }
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

    jwtStore.set(token.token);
    refreshTokenStore.set(token.refreshToken);

    loggedIn.set(true);
  }

  return response;
}
