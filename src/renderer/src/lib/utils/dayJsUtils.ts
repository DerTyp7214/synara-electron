import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { debugLog } from "$lib/utils/logger";

const localeModules = import.meta.glob("/node_modules/dayjs/locale/*.js");

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const fullBrowserLocale = new Intl.DateTimeFormat().resolvedOptions().locale;

const languageCode = fullBrowserLocale.substring(0, 2);

const localeKey = `/node_modules/dayjs/locale/${languageCode}.js`;

try {
  if (localeModules[localeKey]) {
    void localeModules[localeKey]().then(() => {
      dayjs.locale(languageCode);

      debugLog("info", `Day.js locale set to: ${languageCode}`);
    });
  } else {
    // noinspection ExceptionCaughtLocallyJS
    throw new Error(`Unknown locale locale: ${languageCode}`);
  }
} catch (error) {
  debugLog(
    "error",
    `Could not load Day.js locale for ${languageCode}. Falling back to 'en'.`,
    error,
  );
  dayjs.locale("en");
}

dayjs().format("LL");

export default dayjs;
