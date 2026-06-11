import type { CSSProperties, ReactNode } from "react";

export default function GlassCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}): React.ReactElement {
  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
      style={{
        background: "rgba(255,255,255,0.055)",
        borderColor: "rgba(255,255,255,0.085)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  icon,
  label,
  accent,
}: {
  icon?: string;
  label: string;
  accent?: string;
}): React.ReactElement {
  return (
    <div
      className="flex items-center gap-1.5 mb-3 font-mono text-[10px] font-bold uppercase tracking-eyebrow"
      style={{ color: accent ?? "rgba(255,255,255,0.40)" }}
    >
      {icon && <span className="text-[9px]">{icon}</span>}
      {label}
    </div>
  );
}
