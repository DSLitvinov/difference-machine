const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.34524, "week"],
  [12, "month"],
];

export function formatRelativeTime(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "—";
  let delta = Math.round(unixSeconds - Date.now() / 1000);
  const locale = document.documentElement.lang === "ru" ? "ru" : undefined;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [divisor, unit] of UNITS) {
    if (Math.abs(delta) < divisor) {
      return rtf.format(delta, unit);
    }
    delta = Math.round(delta / divisor);
  }
  return rtf.format(delta, "year");
}
