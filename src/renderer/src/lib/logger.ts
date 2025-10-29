export type LogLevel =
  | "assert"
  | "debug"
  | "dirxml"
  | "error"
  | "group"
  | "groupCollapsed"
  | "info"
  | "log"
  | "trace"
  | "warn";

const levelMap: Record<LogLevel, number> = {
  log: 1,
  info: 2,
  warn: 3,
  trace: 3,
  debug: 3,
  group: 3,
  dirxml: 3,
  groupCollapsed: 3,
  assert: 4,
  error: 5,
};

const levelColors: Record<LogLevel, string> = {
  log: "color: black; background: #E0E0E0; padding: 2px 4px; border-radius: 2px;",
  info: "color: white; background: #007ACC; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
  warn: "color: black; background: #FFC107; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
  trace: "color: #909090; font-style: italic;",
  debug: "color: #008000;",
  error:
    "color: white; background: #D32F2F; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
  assert:
    "color: white; background: #B71C1C; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
  group: "color: #005A9C; font-weight: bold;",
  groupCollapsed: "color: #005A9C; font-weight: bold;",
  dirxml: "color: #6C7A89; font-style: italic;",
};

const shouldLog = localStorage.getItem("logDebug") === "true";
const logDebugLevel = (localStorage.getItem("logDebugLevel") ??
  "error") as LogLevel;

const csrdPrefix = (logLevel: LogLevel) => [
  `%c[SYNARA]%c %c[${logLevel}]`,
  "color: white; background: #068f3a; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
  "",
  levelColors[logLevel],
];

export function debugLog(
  logLevel: LogLevel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...logs: Array<{ promise: true; data: () => Promise<any> }> | Array<any>
) {
  (async () => {
    if (shouldLog && levelMap[logDebugLevel] <= levelMap[logLevel]) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        ...csrdPrefix(logLevel),
        ...(await Promise.all(logs.map((l) => (l?.promise ? l.data() : l)))),
      );
      // eslint-disable-next-line no-console
      console.trace();
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  })();
}

// @ts-expect-error it works
window.setLogLevel = function (level?: false | LogLevel) {
  if (level === undefined)
    return `Allowed levels: false (to disable), ${Object.entries(levelMap)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ")}`;
  if (!level) return localStorage.setItem("logDebug", "false");
  localStorage.setItem("logDebug", "true");
  localStorage.setItem("logDebugLevel", level);
};
