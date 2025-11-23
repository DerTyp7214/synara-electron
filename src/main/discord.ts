import { Client, SetActivity } from "@xhayper/discord-rpc";
import { app, ipcMain, IpcMainInvokeEvent } from "electron";
import { store } from "./settings";
import { MediaInfo } from "../shared/models/mediaInfo";
import { PlaybackStatus } from "../shared/models/playbackStatus";

const clientId = "1435589125301600356";

export let rpc: Client | null;

const ACTIVITY_LISTENING = 2;
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;

const observer = (_: IpcMainInvokeEvent, mediaInfo: MediaInfo) => {
  if (rpc) updateActivity(mediaInfo);
};

const defaultPresence = {
  largeImage: "synara-icon",
  largeImageText: `Synara Desktop ${app.getVersion()}`,
  instance: false,
  type: ACTIVITY_LISTENING,
};

const updateActivity = (mediaInfo?: MediaInfo) => {
  const activity = getActivity(mediaInfo);
  if (mediaInfo?.player?.status !== PlaybackStatus.Playing)
    rpc?.user?.clearActivity();
  else if (activity) rpc?.user?.setActivity(activity);
};

const pad = (input: string) => input?.padEnd(2, " ");

const getActivity = (mediaInfo?: MediaInfo): SetActivity | null => {
  const presence: SetActivity = { ...defaultPresence };

  if (!mediaInfo) return null;

  const title = pad(mediaInfo.title);
  const album = pad(mediaInfo.album);
  const artists = pad(mediaInfo.artists.join(", "));

  presence.statusDisplayType = 1;
  presence.details = title;
  presence.state = artists;

  presence.largeImageKey = mediaInfo.image;
  if (album) presence.largeImageText = album;

  //presence.buttons = [{ label: "Play", url: mediaInfo.url }];

  const currentSeconds = Math.trunc(mediaInfo.current / 1000);
  const durationSeconds = Math.trunc(mediaInfo.duration / 1000);
  const now = Math.trunc((Date.now() + 500) / 1000);

  presence.startTimestamp = now - currentSeconds;
  presence.endTimestamp = presence.startTimestamp + durationSeconds;

  return presence;
};

const connectWithRetry = async (retryCount = 0) => {
  try {
    await rpc?.login();
    // eslint-disable-next-line no-console
    console.log("Connected to Discord");
    rpc?.on("ready", updateActivity);
    ipcMain.on("discord-rpc", observer);
    rpc?.on("disconnected", connectWithRetry);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (retryCount < MAX_RETRIES)
      setTimeout(() => connectWithRetry(retryCount + 1), RETRY_DELAY);
  }
};

export const initRPC = () => {
  if (!store.get("discordRpc")) return;

  rpc = new Client({ transport: { type: "ipc" }, clientId });
  void connectWithRetry();
};

store.onDidChange("discordRpc", (value) => {
  if (!value) void unRPC();
  else if (!rpc) initRPC();
});

export const unRPC = async () => {
  if (rpc) {
    rpc.user?.clearActivity();
    await rpc.destroy();
    rpc = null;
    ipcMain.removeListener("discord-rpc", observer);
  }
};
