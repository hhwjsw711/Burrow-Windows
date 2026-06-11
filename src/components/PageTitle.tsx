import type { ReactNode } from "react";
import { useTheme } from "../context/ThemeContext";

export default function PageTitle({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const { accent } = useTheme();
  return (
    <h1
      className="font-serif text-2xl font-medium mb-1"
      style={{ color: accent }}
    >
      {children}
    </h1>
  );
}
