import { PeakProvider, usePeak } from "./store";
import { StatusBar } from "./components/StatusBar";
import { BottomNav } from "./components/BottomNav";
import { ActionSheet } from "./components/ActionSheet";
import { Feed } from "./screens/Feed";
import { Body } from "./screens/Body";
import { Coach } from "./screens/Coach";
import { Goals } from "./screens/Goals";

function Screens() {
  const { tab } = usePeak();
  switch (tab) {
    case "feed":
      return <Feed />;
    case "body":
      return <Body />;
    case "coach":
      return <Coach />;
    case "goals":
      return <Goals />;
  }
}

function Shell() {
  return (
    <div className="page">
      <div className="device">
        <div className="screen">
          <StatusBar />
          <Screens />
          <ActionSheet />
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PeakProvider>
      <Shell />
    </PeakProvider>
  );
}
