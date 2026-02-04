<script lang="ts">
  import { onMount } from "svelte";
  import { deleteSession, getSessions, type Session } from "$lib/api/sessions";
  import { postPlaybackState } from "$lib/api/playback";
  import { decodeJwt } from "$lib/api/jwt";
  import { settings } from "$lib/utils/settings";
  import { get } from "svelte/store";
  import { CloudUpload, Trash2 } from "@jis3r/icons";
  import { Monitor, Smartphone, Laptop } from "@lucide/svelte";
  import cn from "classnames";
  import { t } from "$lib/i18n/i18n";
  import Spinner from "$lib/components/Spinner.svelte";
  import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
  import type { UUID } from "node:crypto";
  import Marquee from "$lib/components/Marquee.svelte";

  const logScope = {
    name: "Sessions",
    style: scopeStyle("#ff00ff"),
  };

  let sessions: Array<Session> = $state([]);
  let loading = $state(true);
  let currentSessionId: string | undefined = $state(undefined);

  async function loadSessions() {
    loading = true;
    try {
      sessions = await getSessions();
      const token = get(settings.token)?.jwt;
      if (token) {
        const payload = decodeJwt(token);
        currentSessionId = payload?.ses;
      }
    } catch (e) {
      scopedDebugLog("error", logScope, e);
    } finally {
      loading = false;
    }
  }

  async function handleDelete(sessionId: UUID) {
    if (!confirm($t("sessions.confirmDelete"))) return;
    try {
      await deleteSession(sessionId);
      await loadSessions();
    } catch (e) {
      scopedDebugLog("error", logScope, e);
    }
  }

  async function handleSync(sessionId: UUID) {
    try {
      await postPlaybackState(sessionId);
      alert($t("sessions.syncSuccess"));
    } catch (e) {
      scopedDebugLog("error", logScope, e);
      alert($t("sessions.syncError"));
    }
  }

  function isMobile(userAgent: string) {
    return (
      userAgent.toLowerCase().includes("android") ||
      userAgent.toLowerCase().includes("iphone")
    );
  }

  function isDesktop(userAgent: string) {
    const ua = userAgent.toLowerCase();
    return (
      ua.includes("electron") ||
      ua.includes("windows") ||
      ua.includes("macintosh") ||
      (ua.includes("linux") && !ua.includes("android"))
    );
  }

  function getIcon(userAgent: string) {
    if (isMobile(userAgent)) return Smartphone;
    if (isDesktop(userAgent)) return Monitor;
    return Laptop;
  }

  function formatLastActive(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  let sortedSessions = $derived.by(() => {
    const own = sessions.filter((s) => s.id === currentSessionId);
    const others = sessions.filter((s) => s.id !== currentSessionId);

    const active = others
      .filter((s) => s.isActive)
      .sort((a, b) => b.lastActive - a.lastActive);
    const inactive = others
      .filter((s) => !s.isActive)
      .sort((a, b) => b.lastActive - a.lastActive);

    return [...own, ...active, ...inactive];
  });

  onMount(() => {
    loadSessions();
  });
</script>

<div class="flex h-full w-full flex-col overflow-y-auto p-4">
  <h1 class="text-surface-900-50 mb-4 text-2xl font-bold">
    {$t("sessions.title")}
  </h1>

  {#if loading}
    <div class="flex h-full items-center justify-center">
      <Spinner />
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each sortedSessions as session (session.id)}
        {@const Icon = getIcon(session.userAgent)}
        {@const isOwn = session.id === currentSessionId}
        {@const mobile = isMobile(session.userAgent)}

        <div
          class={cn(
            "bg-surface-100-800 flex items-center justify-between rounded-lg p-4 shadow-sm",
            {
              "border-primary-500 border-2": isOwn,
              "opacity-60": !session.isActive,
            },
          )}
        >
          <div class="flex items-center gap-4 overflow-hidden">
            <div class="bg-surface-200-700 shrink-0 rounded-full p-2">
              <Icon size={24} />
            </div>
            <div class="flex w-full flex-col overflow-hidden">
              <span class="font-semibold">
                {isOwn ? $t("sessions.currentSession") : session.ipAddress}
              </span>
              <span class="text-surface-600-300 text-sm">
                {formatLastActive(session.lastActive)}
                {#if !session.isActive}
                  ({$t("sessions.inactive")})
                {/if}
              </span>
              <Marquee
                text={session.userAgent}
                class="text-surface-500-400 w-full text-xs"
              />
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            {#if !isOwn && session.isActive}
              {#if mobile}
                <button
                  class="hover:bg-surface-200-700 flex aspect-square items-center justify-center rounded-md p-2 transition-colors"
                  onclick={() => handleSync(session.id)}
                  title={$t("sessions.sync")}
                >
                  <CloudUpload size={20} />
                </button>
              {/if}
              <button
                class="hover:bg-error-500/20 text-error-500 flex aspect-square items-center justify-center rounded-md p-2 transition-colors"
                onclick={() => handleDelete(session.id)}
                title={$t("sessions.delete")}
              >
                <Trash2 size={20} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
