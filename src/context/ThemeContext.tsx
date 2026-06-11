/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";
import { toolAccents } from "./toolAccents";

interface ThemeCtx {
  active: string;
  accent: string;
  scrim: string;
}

const ThemeContext = createContext<ThemeCtx>({
  active: "Status",
  accent: "#E6A93C",
  scrim: "#1A1A12",
});

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

export function ThemeProvider({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}): React.ReactElement {
  const tool = toolAccents[active] ?? toolAccents.Status;
  return (
    <ThemeContext.Provider value={{ active, ...tool }}>
      {children}
    </ThemeContext.Provider>
  );
}
