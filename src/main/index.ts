// @ts-expect-error works though
import icon from "../../resources/icon.png?asset";
// @ts-expect-error works though
import trayIcon from "../../resources/tray.png?asset";
// @ts-expect-error works though
import trayIconBlack from "../../resources/tray-black.png?asset";
// @ts-expect-error works though
import trayIconWhite from "../../resources/tray-white.png?asset";
import {
  app,
  shell,
  Tray,
  BrowserWindow,
  ipcMain,
  components,
  Menu,
  nativeImage,
  nativeTheme,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is, platform } from "@electron-toolkit/utils";
import serve from "electron-serve";
import { Bonjour } from "bonjour-service";
import path from "node:path";
import { setFlags } from "./utils";
import { addMPRIS, updateMpris } from "./mpris";
import { MediaInfo } from "../shared/models/mediaInfo";
import { MprisEventData, MprisEventName } from "../shared/types/api";
import { setupSettings, store } from "./settings";
import { initRPC } from "./discord";
import { registerProtocol } from "./protocol";
import { createCanvas, loadImage } from "canvas";

if (process.env.NODE_ENV === "development") {
  const devPath = path.join(app.getAppPath(), "dev-config");
  app.setPath("userData", devPath);

  // eslint-disable-next-line no-console
  console.log(`Using development userData path: ${devPath}`);
}

const serveURL = serve({ directory: join(__dirname, "..", "renderer") });

setFlags(app);

let tray: Tray;
let mainWindow: BrowserWindow;
let isQuitting = false;

addMPRIS((eventName: MprisEventName, data: MprisEventData<MprisEventName>) => {
  mainWindow?.webContents.send("mpris-event", { eventName, data });
});

setupSettings();

initRPC();

const bonjour = new Bonjour();

ipcMain.handle("bonjour-start", () => {
  bonjour.find({ type: "synara-api" }, (service) => {
    mainWindow?.webContents.send("bonjour-event", service);
  });
});

ipcMain.handle("get-is-fullscreen", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  return window?.isFullScreen() ?? false;
});

ipcMain.on("lastfm:open-external", (_, url: string) => {
  void shell.openExternal(url);
});

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    transparent: true,
    ...(platform.isLinux ? { icon } : {}),
    ...(platform.isMacOS
      ? {
          trafficLightPosition: {
            x: 20,
            y: 20,
          },
        }
      : {}),
    ...(platform.isWindows
      ? {
          frame: false,
          backgroundMaterial: "acrylic",
          backgroundColor: "#00000000",
          titleBarOverlay: true,
        }
      : {
          frame: false,
          titleBarStyle: "hidden",
          autoHideMenuBar: true,
          titleBarOverlay: false,
        }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools(); // FIXME: remove at some point
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && store.get("hideOnClose")) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("enter-full-screen", () => {
    mainWindow.webContents.send("fullscreen-status-changed", true);
  });

  mainWindow.on("leave-full-screen", () => {
    mainWindow.webContents.send("fullscreen-status-changed", false);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.webContents.once("did-finish-load", async () => {
    if (platform.isMacOS) {
      const liquidGlass = (await import("electron-liquid-glass")).default;
      const glassId = liquidGlass.addView(mainWindow.getNativeWindowHandle(), {
        cornerRadius: 16,
        tintColor: "#00000000",
        opaque: false,
      });

      liquidGlass.unstable_setVariant(glassId, 2);
    }
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local HTML file for production.
  if (is.dev) {
    loadVite();
  } else {
    void serveURL(mainWindow);
  }
}

function loadVite(): void {
  mainWindow
    .loadURL(import.meta.env.MAIN_VITE_ELECTRON_RENDERER_URL)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.log("Error loading URL, retrying", e);
      setTimeout(() => {
        loadVite();
      }, 200);
    });
}

function getTrayIcon() {
  const trayImage = nativeImage.createFromPath(
    platform.isMacOS
      ? nativeTheme.shouldUseDarkColors
        ? trayIconWhite
        : trayIconBlack
      : trayIcon,
  );
  trayImage.setTemplateImage(platform.isMacOS);
  return trayImage;
}

let currentBadgeColor: string | null = null;
async function getTrayIconWithBadge(badgeColor: string) {
  currentBadgeColor = badgeColor;

  const base = getTrayIcon();
  const { width, height } = base.getSize();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(base.toDataURL());
  ctx.drawImage(img, 0, 0, width, height);

  const dotRadius = width * 0.14;
  const centerX = width - dotRadius;
  const centerY = dotRadius;

  ctx.beginPath();
  ctx.arc(centerX, centerY, dotRadius, 0, 2 * Math.PI);
  ctx.fillStyle = badgeColor;
  ctx.fill();

  const image = nativeImage.createFromBuffer(canvas.toBuffer("image/png"));

  image.setTemplateImage(false);

  return image;
}

async function reloadTrayIcon() {
  const trayIcon = currentBadgeColor
    ? await getTrayIconWithBadge(currentBadgeColor)
    : getTrayIcon();

  tray.setImage(trayIcon);
}

function clearBadge() {
  currentBadgeColor = null;
  void reloadTrayIcon();
}

nativeTheme.on("updated", () => {
  void reloadTrayIcon();
});

ipcMain.on("set-badge-color", (_, color: string) => {
  currentBadgeColor = color;
  void reloadTrayIcon();
});

ipcMain.on("clear-badge", () => {
  clearBadge();
});

async function setupTray() {
  tray = new Tray(getTrayIcon());
  tray.setTitle("Synara");
  tray.setToolTip("Synara");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Synara",
      click: () => mainWindow.show(),
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow.show());
}

if (!registerProtocol(() => mainWindow)) app.quit();
else {
  app.whenReady().then(async () => {
    await components.whenReady();
    electronApp.setAppUserModelId("dev.dertyp.synara");

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    void setupTray();
    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  ipcMain.handle("media-info-update", async (_event, dataObject: MediaInfo) => {
    updateMpris(dataObject);

    return true;
  });
}
