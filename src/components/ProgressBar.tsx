import { useTheme } from "../context/ThemeContext";

export default function ProgressBar(): React.ReactElement {
  const { accent } = useTheme();

  return (
    <div
      className="w-full rounded-full h-1.5 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.10)" }}
    >
      <div
        className="h-full rounded-full animate-progress-indeterminate"
        style={{ background: accent }}
      />
    </div>
  );
}
