export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatShortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function formatDuration(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function describeFilters(labels) {
  if (!labels) return "Tous les sujets";
  const parts = [];
  if (labels.domains?.length) parts.push(labels.domains.join(", "));
  if (labels.themes?.length) parts.push(labels.themes.join(", "));
  if (labels.levels?.length) parts.push(labels.levels.join(", "));
  return parts.length ? parts.join(" · ") : "Tous les sujets";
}

export function scoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 60) return "success";
  if (score >= 40) return "pending";
  return "error";
}
