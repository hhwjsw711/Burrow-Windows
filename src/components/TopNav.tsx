import { TOOLS, toolAccents } from "../context/toolAccents";

export default function TopNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (t: string) => void;
}): React.ReactElement {
  const accent = (toolAccents[active] ?? toolAccents.Status).accent;

  return (
    <nav
      className="flex items-center gap-1 px-4 py-2.5"
      style={{
        background: "rgba(0,0,0,0.24)",
        borderBottom: "1px solid rgba(255,255,255,0.085)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        className="font-bold text-lg tracking-tight mr-3"
        style={{ color: accent }}
      >
        Burrow
      </span>
      <div
        className="flex items-center gap-1 rounded-full px-1 py-1"
        style={{
          background: "rgba(0,0,0,0.22)",
          border: "1px solid rgba(255,255,255,0.085)",
        }}
      >
        {TOOLS.map((t) => {
          const toolAccent = (toolAccents[t] ?? toolAccents.Status).accent;
          const isActive = active === t;
          return (
            <button
              key={t}
              onClick={() => onNavigate(t)}
              className="px-3 py-1 rounded-full text-xs font-medium font-mono transition-all duration-150"
              style={{
                background: isActive ? "white" : "transparent",
                color: isActive ? "#0B0B0D" : "rgba(255,255,255,0.40)",
                ...(isActive && !["Status", "History", "Activity"].includes(t)
                  ? { boxShadow: `0 0 12px ${toolAccent}40` }
                  : {}),
              }}
            >
              {t.toLowerCase()}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
