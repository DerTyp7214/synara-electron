import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { debugLog } from "$lib/logger";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const fullBrowserLocale = new Intl.DateTimeFormat().resolvedOptions().locale;

const languageCode = fullBrowserLocale.substring(0, 2);

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(`dayjs/locale/${languageCode}`);
  dayjs.locale(languageCode);

  debugLog("info", `Day.js locale set to: ${languageCode}`);

  dayjs().format("LL");
} catch (_) {
  debugLog(
    "error",
    `Could not load Day.js locale for ${languageCode}. Falling back to 'en'.`,
  );
  dayjs.locale("en");
}

export default dayjs;
