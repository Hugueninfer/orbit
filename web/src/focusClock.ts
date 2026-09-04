export function remainingSeconds(
  session: {
    status: string;
    deadline_at: string | null;
    remaining_seconds: number;
  },
  now: number,
): number {
  if (session.status === "completed") return 0;
  if (session.status !== "running" || !session.deadline_at)
    return session.remaining_seconds;
  return Math.max(0, Math.ceil((Date.parse(session.deadline_at) - now) / 1000));
}
export function growthStage(progress: number): 0 | 1 | 2 | 3 {
  return progress >= 1 ? 3 : progress >= 0.6 ? 2 : progress >= 0.2 ? 1 : 0;
}
export function formatTimer(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
