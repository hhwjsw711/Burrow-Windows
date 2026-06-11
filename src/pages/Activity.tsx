import { useEffect, useState } from "react";
import { getActivities, type ActivityRecord } from "../lib/api";
import GlassCard from "../components/GlassCard";
import PageTitle from "../components/PageTitle";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Activity(): React.ReactElement {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivities()
      .then(setActivities)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load activities"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4" style={{ color: "rgba(255,255,255,0.40)" }}>
        Loading activities...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <PageTitle>Activity Log</PageTitle>
        <div className="text-sm" style={{ color: "#F0604E" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle>Activity Log</PageTitle>

      {activities.length === 0 ? (
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
          No operations recorded yet. Run a Clean, Purge, or Optimize to see
          them here.
        </div>
      ) : (
        <GlassCard className="!p-0 overflow-hidden">
          <div
            className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-label"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.085)",
              color: "rgba(255,255,255,0.40)",
            }}
          >
            <div className="col-span-3">Time</div>
            <div className="col-span-2">Command</div>
            <div className="col-span-1 text-center">Mode</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-5">Summary</div>
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {activities.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="col-span-3 font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {formatDate(a.created_at)}
                </div>
                <div className="col-span-2 capitalize font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.80)" }}>
                  {a.command}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: a.dry_run
                        ? "rgba(79,163,227,0.15)"
                        : "rgba(142,132,240,0.15)",
                      color: a.dry_run ? "#4FA3E3" : "#8E84F0",
                    }}
                  >
                    {a.dry_run ? "dry" : "run"}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className="text-[10px] font-mono font-medium"
                    style={{
                      color: a.exit_code === 0 ? "#57D58E" : "#F0604E",
                    }}
                  >
                    {a.exit_code === 0 ? "OK" : `ERR ${a.exit_code}`}
                  </span>
                </div>
                <div className="col-span-5 text-[11px] font-mono truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {a.summary}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
