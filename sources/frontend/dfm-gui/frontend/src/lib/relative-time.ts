export function relativeTime(unixSeconds: number, nowMs = Date.now()): string {
  const delta = Math.max(0, nowMs - unixSeconds * 1000);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (delta < hour) {
    return formatAgo(Math.max(1, Math.floor(delta / minute)), "minute");
  }
  if (delta < day) {
    return formatAgo(Math.floor(delta / hour), "hour");
  }
  if (delta < week) {
    return formatAgo(Math.floor(delta / day), "day");
  }
  if (delta < month) {
    return formatAgo(Math.floor(delta / week), "week");
  }
  if (delta < year) {
    return formatAgo(Math.floor(delta / month), "month");
  }
  return formatAgo(Math.floor(delta / year), "year");
}

function formatAgo(count: number, unit: string): string {
  return count === 1 ? `1 ${unit} ago` : `${count} ${unit}s ago`;
}
