import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { coachReply } from "./data";

export type Tab = "feed" | "body" | "coach" | "goals";
export type BodyView = "front" | "back";
export type CoachTab = "chat" | "live" | "drills";
export type ChatMsg = { role: "coach" | "me"; text: string };

export type PeakState = {
  tab: Tab;
  bodyView: BodyView;
  selMuscle: string | null;
  sheet: boolean;
  coachTab: CoachTab;
  sport: string;
  filter: string;
  added: Record<string, boolean>;
  draft: string;
  thinking: boolean;
  chat: ChatMsg[];
};

export type PeakStore = PeakState & {
  set: (patch: Partial<PeakState>) => void;
  go: (tab: Tab) => void;
  selectMuscle: (id: string) => void;
  toggleAdded: (id: string) => void;
  send: () => void;
  quick: (label: string) => void;
};

const INITIAL: PeakState = {
  tab: "body",
  bodyView: "front",
  selMuscle: "biceps",
  sheet: false,
  coachTab: "chat",
  sport: "Basketball",
  filter: "all",
  added: {},
  draft: "",
  thinking: false,
  chat: [
    {
      role: "coach",
      text: "Hey — I'm your Peak coach. I've looked at your body map: strong arms and quads, but mobility and posterior chain are lagging. What are we working toward?",
    },
  ],
};

const Ctx = createContext<PeakStore | null>(null);

export function PeakProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PeakState>(INITIAL);
  // Keep the latest state available to async callbacks (the coach reply timer).
  const ref = useRef(state);
  ref.current = state;

  const store = useMemo<PeakStore>(() => {
    const set = (patch: Partial<PeakState>) => setState((s) => ({ ...s, ...patch }));

    const sendText = (text: string) => {
      const t = text.trim();
      if (!t || ref.current.thinking) return;
      setState((s) => ({ ...s, chat: [...s.chat, { role: "me", text: t }], draft: "", thinking: true }));
      setTimeout(() => {
        setState((s) => ({ ...s, chat: [...s.chat, { role: "coach", text: coachReply(t) }], thinking: false }));
      }, 750);
    };

    return {
      ...state,
      set,
      go: (tab) => set({ tab }),
      selectMuscle: (id) => set({ selMuscle: id }),
      toggleAdded: (id) => setState((s) => ({ ...s, added: { ...s.added, [id]: !s.added[id] } })),
      send: () => sendText(ref.current.draft),
      quick: (label) => sendText(label),
    };
    // state is spread in, so recompute when it changes.
  }, [state]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePeak(): PeakStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePeak must be used within PeakProvider");
  return s;
}
