export function scanLineStyle(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("space freed") || lower.includes("freed")) {
    return "text-green-400 font-bold";
  }
  if (line.startsWith("[stderr]")) return "text-red-400";
  if (line.includes("✓") || line.includes("Success")) return "text-green-300";
  if (line.includes("Error") || line.startsWith("✗")) return "text-red-400";
  return "text-gray-400";
}

export function optimizeLineStyle(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("completed") || lower.includes("success")) {
    return "text-green-400 font-bold";
  }
  if (line.startsWith("[stderr]")) return "text-red-400";
  if (line.includes("✓")) return "text-green-300";
  if (line.includes("error") || line.startsWith("✗")) return "text-red-400";
  return "text-gray-400";
}
