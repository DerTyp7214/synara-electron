<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton-svelte";
  import { onNavigate } from "$app/navigation";
  import { copy, defaultNavigation, openUrl } from "$lib/utils/utils";
  import { Check, TriangleAlert, EyeOff } from "@jis3r/icons";
  import { Eye } from "@lucide/svelte";
  import { t } from "$lib/i18n/i18n";
  import { settings } from "$lib/utils/settings";
  import { get, type Writable, writable } from "svelte/store";
  import type { PartialRecord, TypedKeys } from "$lib/types";
  import { health } from "$lib/api/main";
  import cn from "classnames";
  import Spinner from "$lib/components/Spinner.svelte";
  import { onMount } from "svelte";
  import { getUserInfo } from "$lib/api/lastFm";
  import musicScrobbler from "$lib/audio/musicScrobbler";
  import { userInfo } from "$lib/api/auth";
  import { DEFAULT_SETTINGS } from "$shared/settings";
  import { objectPropertyStore } from "$lib/utils/storeUtils";
  import { checkTidalSyncAuth, tidalSyncAuth } from "$lib/api/sync";

  const stores = {
    apiBase: settings.apiBase,

    lastFmTokens: settings.lastFmTokens,
    lastFmSession: settings.lastFmSession,

    hideOnClose: settings.hideOnClose,
    discordRpc: settings.discordRpc,
    lastFm: settings.lastFm,
    cleanTitles: settings.cleanTitles,
    listenBrainzToken: settings.listenBrainzToken,

    downloadDir: settings.downloadDir,

    particleMultiplier: objectPropertyStore(
      settings.audioVisualizer,
      "particleMultiplier",
    ),
    velocityMultiplier: objectPropertyStore(
      settings.audioVisualizer,
      "velocityMultiplier",
    ),
  } as const;

  const apiBase = $derived(stores.apiBase);

  const lastFmTokens = $derived(stores.lastFmTokens);
  const lastFmSession = $derived(stores.lastFmSession);
  const listenBrainzToken = $derived(stores.listenBrainzToken);

  const hideOnClose = $derived(stores.hideOnClose);
  const discordRpc = $derived(stores.discordRpc);
  const lastFm = $derived(stores.lastFm);
  const cleanTitles = $derived(stores.cleanTitles);
  const downloadDir = $derived(stores.downloadDir);

  const particleMultiplier = $derived(stores.particleMultiplier);
  const velocityMultiplier = $derived(stores.velocityMultiplier);

  const originalData = $derived.by(() => ({
    apiBase: $apiBase,
    lastFmApiKey: $lastFmTokens.apiKey,
    lastFmSharedSecret: $lastFmTokens.sharedSecret,

    lastFmSession: $lastFmSession,

    hideOnClose: $hideOnClose,
    discordRpc: $discordRpc,
    lastFm: $lastFm,
    cleanTitles: $cleanTitles,
    listenBrainzToken: $listenBrainzToken,

    downloadDir: $downloadDir,

    particleMultiplier: $particleMultiplier,
    velocityMultiplier: $velocityMultiplier,
  }));

  // svelte-ignore state_referenced_locally
  const settingsValues = writable(copy(originalData));

  type SettingsType = typeof originalData;
  type SettingsKeys = keyof SettingsType;

  const applyEnabled: PartialRecord<SettingsKeys, boolean> = $state({});
  const loading: PartialRecord<SettingsKeys, boolean> = $state({});

  const showState: PartialRecord<SettingsKeys, boolean> = $state({});
  const checkState: PartialRecord<
    SettingsKeys,
    undefined | "success" | "failure"
  > = $state({});
  const applyState: PartialRecord<
    SettingsKeys,
    undefined | "success" | "failure"
  > = $state({});

  function handleCheck(key: SettingsKeys) {
    return async () => {
      const value = $settingsValues[key];

      loading[key] = true;

      switch (key) {
        case "apiBase": {
          const { available } = await health(value as SettingsType[typeof key]);

          checkState[key] = available ? "success" : "failure";
          applyEnabled[key] = available;

          break;
        }
      }

      loading[key] = false;
    };
  }

  function handleApply(key: SettingsKeys) {
    return async () => {
      const value = $settingsValues[key];

      loading[key] = true;

      switch (key) {
        case "apiBase": {
          if (value !== get(stores[key])) {
            const { available } = await health(
              value as SettingsType[typeof key],
            );

            stores[key].set(value as SettingsType[typeof key]);
            applyState[key] = available ? "success" : "failure";

            location.reload();
          }
          break;
        }
        case "lastFmApiKey":
        case "lastFmSharedSecret": {
          stores.lastFmTokens.set({
            apiKey: $settingsValues.lastFmApiKey,
            sharedSecret: $settingsValues.lastFmSharedSecret,
          });
          applyState[key] = "success";
          break;
        }
        default:
          (stores[key] as Writable<SettingsType[typeof key]>).set(
            value as SettingsType[typeof key],
          );
          applyState[key] = "success";

          break;
      }

      loading[key] = false;
    };
  }

  function handleKey(key: SettingsKeys) {
    return async (event: KeyboardEvent) => {
      delete checkState[key];
      delete applyState[key];

      if (event.key === "Enter") {
        await handleCheck(key)();
      }
    };
  }

  function resetValue(key: SettingsKeys) {
    $settingsValues[key] = originalData[key] as never;
  }

  let tidalAuthorized = $state(false);
  let tidalAuthorizedLoading = $state(true);

  async function checkTidalAuth() {
    tidalAuthorized = false;
    tidalAuthorizedLoading = true;

    tidalAuthorized = await checkTidalSyncAuth();
    tidalAuthorizedLoading = false;
  }

  async function authenticateTidalSync() {
    tidalAuthorizedLoading = true;
    const url = await tidalSyncAuth();

    openUrl(url);

    confirm($t("settings.tidalSync.confirm"));

    await checkTidalAuth();
  }

  onNavigate(defaultNavigation);

  onMount(() => {
    for (const [key, value] of Object.entries(copy(originalData)) as Array<
      [SettingsKeys, never]
    >) {
      $settingsValues[key] = value;
    }

    void checkTidalAuth();

    for (const state of [
      applyEnabled,
      loading,
      showState,
      checkState,
      applyState,
    ]) {
      for (const key of Object.keys(state) as Array<SettingsKeys>) {
        delete state[key];
      }
    }
  });

  type bool = boolean;
  type str = string;
  type num = number;
  type TypedStrKeys = TypedKeys<SettingsType, str | undefined>;
  type TypedBoolKeys = TypedKeys<SettingsType, bool>;
  type TypedNumKeys = TypedKeys<SettingsType, num>;
</script>

<svelte:head>
  <title>{$t("settings.title")}</title>
</svelte:head>

{#snippet textValue(
  key: TypedStrKeys,
  check: bool,
  hidden: bool = false,
  customType: str | undefined = undefined,
)}
  <div class="flex flex-col gap-3">
    <span class="h4">{$t(`settings.${key}`)}</span>
    <div class="flex flex-row gap-1">
      <input
        class="custom-input"
        type={customType ?? (!showState[key] && hidden ? "password" : "text")}
        placeholder={$t(`settings.${key}`)}
        bind:value={$settingsValues[key]}
        onkeyup={handleKey(key)}
      />
      {#if hidden}
        <button
          class="btn-icon"
          onclick={() => (showState[key] = !showState[key])}
        >
          {#if !showState[key]}
            <Eye size={18} />
          {:else}
            <EyeOff size={18} />
          {/if}
        </button>
      {/if}
    </div>
    <div class="flex flex-row gap-2">
      {#if check}
        <button
          disabled={loading[key] || checkState[key] === "success"}
          onclick={handleCheck(key)}
          class={cn("btn transition-colors", "flex", {
            "preset-filled-secondary-200-800": !checkState[key],
            "preset-filled-success-200-800": checkState[key] === "success",
            "preset-filled-error-200-800": checkState[key] === "failure",
          })}
        >
          {$t("settings.check")}
          {#if loading[key]}
            <Spinner />
          {:else if checkState[key] === "success"}
            <Check size={18} />
          {:else if checkState[key] === "failure"}
            <TriangleAlert size={18} />
          {/if}
        </button>
      {/if}
      <button
        disabled={!(applyEnabled[key] || !check) || loading[key]}
        onclick={handleApply(key)}
        class={cn("btn transition-colors", "flex", {
          "preset-filled-warning-200-800": !applyState[key],
          "preset-filled-success-200-800": applyState[key] === "success",
          "preset-filled-error-200-800": applyState[key] === "failure",
        })}
      >
        {$t("settings.apply")}
        {#if loading[key] && (checkState[key] === "success" || !check)}
          <Spinner />
        {:else if applyState[key] === "success"}
          <Check size={18} />
        {:else if applyState[key] === "failure"}
          <TriangleAlert size={18} />
        {/if}
      </button>
      <button
        onclick={() => resetValue(key)}
        class="btn preset-filled-warning-200-800 ms-auto">Reset</button
      >
    </div>
  </div>
{/snippet}

{#snippet booleanValue(key: TypedBoolKeys, label: str | undefined = undefined)}
  <div class="flex flex-col gap-2">
    {#if label}
      <label class="flex items-center gap-2">
        <input
          class="custom-checkbox"
          type="checkbox"
          bind:checked={$settingsValues[key]}
          onchange={handleApply(key)}
        />
        <p>{$t(`settings.${key}`)}</p>
      </label>
    {:else}
      <input
        class="custom-checkbox"
        type="checkbox"
        bind:checked={$settingsValues[key]}
        onchange={handleApply(key)}
      />
    {/if}
  </div>
{/snippet}

{#snippet rangeValue(
  key: TypedNumKeys,
  min: num = 0,
  max: num = 1,
  defaultValue: num = 0,
  label: str | undefined = undefined,
)}
  <div class="flex flex-col gap-2">
    {#if label}
      <label class="flex flex-col items-start">
        <span class="flex items-end gap-2">
          <p>
            {$t(`settings.${key}`)}: {$settingsValues[key].toFixed(2)}
          </p>
          <p class="text-xs opacity-50">
            ({$t(`settings.default`, { value: defaultValue.toString() })})
          </p>
        </span>
        <input
          class="custom-range"
          type="range"
          {min}
          {max}
          step={0.01}
          bind:value={$settingsValues[key]}
          onchange={handleApply(key)}
        />
      </label>
    {:else}
      <input
        class="custom-range"
        type="range"
        {min}
        {max}
        step={0.01}
        bind:value={$settingsValues[key]}
        onchange={handleApply(key)}
      />
    {/if}
  </div>
{/snippet}

<div class="flex max-h-full flex-col overflow-x-auto p-8">
  <div class="flex flex-col gap-3">
    <span class="h3">{$t("settings.synara.session")}</span>
    {#await userInfo() then userInfo}
      <div class="flex flex-row gap-2">
        <div class="flex flex-col gap-1">
          <span class="h4">{userInfo.username}</span>
          <span class="text-sm opacity-80">{userInfo.id}</span>
        </div>
      </div>
      <button
        onclick={() => settings.token.set({})}
        class="btn preset-filled-error-200-800 me-auto"
      >
        {$t("logout")}
      </button>
    {/await}
  </div>

  <div class="border-secondary-800-200 mt-6 w-full border-t-2"></div>

  <div class="mt-6 flex flex-col gap-3">
    <span class="h2">{$t("settings.main")}</span>
    {@render textValue("apiBase", true)}

    {@render booleanValue("hideOnClose", $t("settings.hideOnClose"))}
    {@render booleanValue("discordRpc", $t("settings.discordRpc"))}
    {@render booleanValue("cleanTitles", $t("settings.cleanTitles"))}

    {@render textValue("downloadDir", false, false, "directory")}
  </div>

  <div class="border-secondary-800-200 mt-6 w-full border-t-2"></div>

  <div class="mt-6 flex flex-col gap-3">
    <span class="h2">{$t("settings.tidalSync")}</span>
    {#if tidalAuthorized}
      <span>{$t("settings.tidalSync.authorized")}</span>
    {:else if tidalAuthorizedLoading}
      <div class="flex w-full flex-col items-center">
        <Spinner size={45} />
      </div>
    {:else}
      <button onclick={authenticateTidalSync} class="btn preset-filled">
        {$t("settings.tidalSync.login")}
      </button>
    {/if}
  </div>

  <div class="border-secondary-800-200 mt-6 w-full border-t-2"></div>

  <div class="mt-6 flex flex-col gap-3">
    <span class="h2">{$t("settings.audioVisualizer")}</span>
    {@render rangeValue(
      "particleMultiplier",
      0,
      3,
      DEFAULT_SETTINGS.audioVisualizer.particleMultiplier,
      $t("settings.particleMultiplier"),
    )}
    {@render rangeValue(
      "velocityMultiplier",
      0,
      5,
      DEFAULT_SETTINGS.audioVisualizer.velocityMultiplier,
      $t("settings.velocityMultiplier"),
    )}
  </div>

  <div class="border-secondary-800-200 mt-6 w-full border-t-2"></div>

  <div class="mt-6 flex flex-col gap-3">
    <div class="flex flex-row items-center gap-3">
      {@render booleanValue("lastFm")}
      <span class="h2">{$t("settings.lastFm")}</span>
    </div>

    {@render textValue("listenBrainzToken", false, true)}

    {#if $settingsValues["lastFm"]}
      {@render textValue("lastFmApiKey", false, true)}
      {@render textValue("lastFmSharedSecret", false, true)}

      <span class="h4 mt-5">{$t("settings.lastFmSession")}</span>
      {#if $lastFmSession.key}
        {#await getUserInfo() then userInfo}
          <div class="flex flex-row gap-2">
            <Avatar class="rounded-base h-16 w-16">
              <Avatar.Image src={userInfo.image.toReversed()[0]["#text"]} />
              <Avatar.Fallback class="bg-tertiary-100-900">
                {userInfo.name.toUpperCase().substring(0, 2)}
              </Avatar.Fallback>
            </Avatar>
            <div class="flex flex-col">
              <span class="h5">{userInfo.realname}</span>
              <span>
                {new Intl.NumberFormat().format(
                  Number(userInfo.playcount) || 0,
                )}
              </span>
            </div>
          </div>
          <button
            onclick={() => stores.lastFmSession.set({})}
            class="btn preset-filled-error-200-800 me-auto"
          >
            {$t("settings.lastFm.logout")}
          </button>
        {/await}
      {:else}
        <button
          onclick={() => musicScrobbler.startAuthFlow()}
          class="btn preset-filled-success-200-800 me-auto"
        >
          {$t("settings.lastFm.login")}
        </button>
      {/if}
    {/if}
  </div>
</div>
