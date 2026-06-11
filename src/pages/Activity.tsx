import { useEffect, useState } from "react";
import { getActivities, type ActivityRecord } from "../lib/api";

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

  useEffect(() => {
    getActivities()
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-gray-500">Loading activities...</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-200">Activity Log</h2>

      {activities.length === 0 ? (
        <div className="text-gray-600 text-sm">
          No operations recorded yet. Run a Clean, Purge, or Optimize to see
          them here.
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase">
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
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm border-b border-gray-800/50 hover:bg-gray-800/50"
              >
                <div className="col-span-3 font-mono text-gray-400 text-xs">
                  {formatDate(a.created_at)}
                </div>
                <div className="col-span-2 text-gray-300 capitalize">
                  {a.command}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      a.dry_run
                        ? "bg-blue-900/50 text-blue-400"
                        : "bg-purple-900/50 text-purple-400"
                    }`}
                  >
                    {a.dry_run ? "dry" : "run"}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={`text-xs ${
                      a.exit_code === 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {a.exit_code === 0 ? "OK" : `ERR ${a.exit_code}`}
                  </span>
                </div>
                <div className="col-span-5 text-gray-500 text-xs truncate">
                  {a.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
