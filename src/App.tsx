import { useEffect, useState } from "react";
import TopNav from "./components/TopNav";
import Status from "./pages/Status";
import Clean from "./pages/Clean";
import Purge from "./pages/Purge";
import Optimize from "./pages/Optimize";
import Software from "./pages/Software";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import { ThemeProvider } from "./context/ThemeContext";
import { toolAccents } from "./context/toolAccents";

function NotFound(): React.ReactElement {
  return <div className="p-8 text-gray-500">Not found</div>;
}

const pages: Record<string, React.FC> = {
  Status,
  Clean,
  Purge,
  Optimize,
  Software,
  Analyze,
  History,
  Activity,
  Settings,
};

function App(): React.ReactElement {
  const [active, setActive] = useState<string>("Status");
  const Page = pages[active] ?? NotFound;
  const scrim = (toolAccents[active] ?? toolAccents.Status).scrim;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive("Status");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ThemeProvider active={active}>
      <div
        className="min-h-screen text-white"
        style={{
          background: `linear-gradient(180deg, ${scrim} 0%, #0B0B0D 100%)`,
        }}
      >
        <TopNav active={active} onNavigate={setActive} />
        <main className="p-4">
          <Page />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
