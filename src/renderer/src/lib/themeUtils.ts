import { settings } from "$lib/settings";

settings.theme.subscribe((theme) => {
  document.documentElement.setAttribute("data-mode", theme);
});
