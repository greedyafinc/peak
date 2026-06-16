import { PeakProvider, usePeak } from "./store";
import { StatusBar } from "./components/StatusBar";
import { BottomNav } from "./components/BottomNav";
import { Onboarding } from "./screens/Onboarding";
import { Score } from "./screens/Score";
import { Body } from "./screens/Body";
import { Log } from "./screens/Log";
import { Improve } from "./screens/Improve";
import { LogSheet, BenchmarkSheet, GoalSheet } from "./components/Sheets";
import { StartSheet } from "./components/SessionStart";
import { RoutineBuilder } from "./components/RoutineBuilder";
import { ActiveSession, MiniSessionBar } from "./components/ActiveSession";
import { ExerciseDetail } from "./components/ExerciseDetail";

function Screens() {
  const { tab, data } = usePeak();
  if (!data.onboarded) return <Onboarding />;
  switch (tab) {
    case "score":
      return <Score />;
    case "body":
      return <Body />;
    case "log":
      return <Log />;
    case "improve":
      return <Improve />;
  }
}

function Shell() {
  return (
    <div className="page">
      <div className="device">
        <div className="screen">
          <StatusBar />
          <Screens />
          <LogSheet />
          <BenchmarkSheet />
          <GoalSheet />
          <StartSheet />
          <RoutineBuilder />
          <MiniSessionBar />
          <BottomNav />
          <ActiveSession />
          <ExerciseDetail />
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
