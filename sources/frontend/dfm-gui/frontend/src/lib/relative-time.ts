import type { Locale } from "@/lib/i18n";

export function relativeTime(unixSeconds: number, locale: Locale = "en", nowMs = Date.now()): string {
  const delta = Math.max(0, nowMs - unixSeconds * 1000);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  const rtf = new Intl.RelativeTimeFormat(locale === "ru" ? "ru" : "en", { numeric: "always" });
  if (delta < hour) {
    return rtf.format(-Math.max(1, Math.floor(delta / minute)), "minute");
  }
  if (delta < day) {
    return rtf.format(-Math.floor(delta / hour), "hour");
  }
  if (delta < week) {
    return rtf.format(-Math.floor(delta / day), "day");
  }
  if (delta < month) {
    return rtf.format(-Math.floor(delta / week), "week");
  }
  if (delta < year) {
    return rtf.format(-Math.floor(delta / month), "month");
  }
  return rtf.format(-Math.floor(delta / year), "year");
}
