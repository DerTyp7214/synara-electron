import { app, shell, Tray, BrowserWindow, ipcMain, components } from "electron";
import { join } from "path";
import { electronApp, optimizer, is, platform } from "@electron-toolkit/utils";
// @ts-expect-error works though
import icon from "../../resources/icon.png?asset";
import serve from "electron-serve";
import { setFlags } from "./utils";
import { addMPRIS, updateMpris } from "./mpris";
import { MediaInfo } from "../shared/models/mediaInfo";

const serveURL = serve({ directory: join(__dirname, "..", "renderer") });

setFlags(app);

addMPRIS();

let tray: Tray;
let mainWindow: BrowserWindow;
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    ...(platform.isLinux ? { icon, transparent: true } : {}),
    ...(platform.isMacOS
      ? {
          vibrancy: "fullscreen-ui",
          trafficLightPosition: {
            x: 20,
            y: 20,
          },
        }
      : {}),
    ...(platform.isWindows
      ? {
          backgroundMaterial: "mica",
          titleBarStyle: "default",
          frame: true,
          autoHideMenuBar: false,
          titleBarOverlay: true,
        }
      : {
          titleBarStyle: "hidden",
          frame: false,
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
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev) {
    loadVite();
  } else {
    void serveURL(mainWindow);
  }
}

function loadVite(): void {
  mainWindow
    // @ts-expect-error it exists
    .loadURL(import.meta.env.MAIN_VITE_ELECTRON_RENDERER_URL)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.log("Error loading URL, retrying", e);
      setTimeout(() => {
        loadVite();
      }, 200);
    });
}

function setupTray() {
  tray = new Tray(icon);
  tray.setTitle("Synara");
  tray.setToolTip("Synara");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await components.whenReady();
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  setupTray();
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle("media-info-update", async (_event, dataObject: MediaInfo) => {
  updateMpris(dataObject);

  return true;
});
