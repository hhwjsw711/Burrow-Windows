import { useState } from "react";
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
  const Page = pages[active] ?? (() => <div>Not found</div>);
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TopNav active={active} onNavigate={setActive} />
      <main className="p-4">
        <Page />
      </main>
    </div>
  );
}

export default App;
