import { app, BrowserWindow, protocol, dialog } from "electron";
import path from "node:path";
import offlineHandler from "./offlineHandler";

const PROTOCOL_SCHEME = "synara";

export function registerProtocol(mainWindowHandler: () => BrowserWindow) {
  const lock = app.requestSingleInstanceLock();

  if (!lock) return false;

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);

  protocol.registerSchemesAsPrivileged([
    {
      scheme: PROTOCOL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);

  app.on("second-instance", (_event, commandLine) => {
    const mainWindow = mainWindowHandler();

    if (mainWindow) {
      if (mainWindow.isMinimizable()) mainWindow.restore();
      mainWindow.focus();
    }

    dialog.showErrorBox(
      "Welcome Back",
      `You arrived from: ${commandLine.pop()}`,
    );
  });

  app.on("open-url", (_event, url) => {
    dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`);
  });

  app.whenReady().then(() => {
    protocol.handle(PROTOCOL_SCHEME, async (request) => {
      switch (new URL(request.url).host) {
        case "search":
          // TODO: handle search in the ui
          return new Response();
        default:
          return await offlineApiHandler(request);
      }
    });
  });

  return true;
}

async function offlineApiHandler(request: Request): Promise<Response> {
  const { host, pathname } = new URL(request.url);

  // eslint-disable-next-line no-console
  console.log(host, pathname, offlineHandler);
  if (host === "stream") {
    return new Response("<h1>Yay</h1>", {
      headers: { "content-type": "text/html" },
    });
  }

  return new Response();
}
