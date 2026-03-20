/** Floor identifier — matches the building directory from VISION-SPEC.md */
export type FloorId = "PH" | "7" | "6" | "5" | "4" | "3" | "2" | "1" | "L";

/** Floor metadata */
export interface Floor {
  id: FloorId;
  name: string;
  route: string;
  label: string;
  phase: number; // Which phase builds this floor
  character?: string;
}

/** Complete floor directory */
export const FLOORS: Floor[] = [
  { id: "PH", name: "The Penthouse", route: "/penthouse", label: "Dashboard", phase: 0, character: "CEO" },
  { id: "7", name: "The War Room", route: "/war-room", label: "Applications", phase: 1, character: "CRO" },
  { id: "6", name: "The Rolodex Lounge", route: "/rolodex-lounge", label: "Contacts", phase: 3, character: "CNO" },
  { id: "5", name: "The Writing Room", route: "/writing-room", label: "Cover Letters", phase: 4, character: "CMO" },
  { id: "4", name: "The Situation Room", route: "/situation-room", label: "Follow-ups", phase: 2, character: "COO" },
  { id: "3", name: "The Briefing Room", route: "/briefing-room", label: "Interview Prep", phase: 4, character: "CPO" },
  { id: "2", name: "The Observatory", route: "/observatory", label: "Analytics", phase: 5, character: "CFO" },
  { id: "1", name: "The C-Suite", route: "/c-suite", label: "Agent Hub", phase: 5, character: "CEO" },
  { id: "L", name: "The Lobby", route: "/lobby", label: "Login", phase: 0, character: "Concierge" },
];

/** Time-of-day states for day/night cycle */
export type TimeState =
  | "dawn"       // 5-7am
  | "morning"    // 7-10am
  | "midday"     // 10am-2pm
  | "afternoon"  // 2-5pm
  | "golden_hour" // 5-7pm
  | "dusk"       // 7-9pm
  | "night";     // 9pm-5am

/** Elevator transition state */
export type ElevatorState =
  | "idle"
  | "doors-closing"
  | "moving"
  | "doors-opening";
