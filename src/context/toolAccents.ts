export const TOOLS = [
  "Status",
  "Clean",
  "Purge",
  "Optimize",
  "Software",
  "Analyze",
  "History",
  "Activity",
  "Settings",
] as const;

export type ToolName = (typeof TOOLS)[number];

export const toolAccents: Record<string, { accent: string; scrim: string }> = {
  Status: { accent: "#E6A93C", scrim: "#1A1A12" },
  Clean: { accent: "#35C2A5", scrim: "#0E2A27" },
  Purge: { accent: "#6FB06A", scrim: "#12241A" },
  Optimize: { accent: "#8E84F0", scrim: "#1A1A2E" },
  Software: { accent: "#F0714E", scrim: "#2A1A17" },
  Analyze: { accent: "#4FA3E3", scrim: "#15222E" },
  History: { accent: "#E6A93C", scrim: "#1A1A12" },
  Activity: { accent: "#E6A93C", scrim: "#1A1A12" },
  Settings: { accent: "#8F8F8F", scrim: "#1A1A1A" },
};
