const tools = [
  "Status",
  "Clean",
  "Purge",
  "Optimize",
  "Software",
  "Analyze",
  "History",
  "Activity",
  "Settings",
];

export default function TopNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (t: string) => void;
}): React.ReactElement {
  return (
    <nav className="flex items-center gap-1 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <span className="font-bold text-purple-400 mr-4 text-lg">Burrow</span>
      {tools.map((t) => (
        <button
          key={t}
          onClick={() => onNavigate(t)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            active === t
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          {t}
        </button>
      ))}
    </nav>
  );
}
