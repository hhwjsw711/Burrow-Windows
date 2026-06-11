import type { ReactNode } from "react";
import { useTheme } from "../context/ThemeContext";

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
}: ActionButtonProps): React.ReactElement {
  const { accent } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-30"
      style={{ background: accent, color: "#0B0B0D" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  disabled,
  children,
}: ActionButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-30"
      style={{
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.80)",
        border: "1px solid rgba(255,255,255,0.085)",
      }}
    >
      {children}
    </button>
  );
}
