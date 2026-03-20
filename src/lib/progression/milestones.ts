/**
 * Progression milestones for The Tower.
 * Each milestone maps to a user action threshold and unlocks a floor visual state.
 */

export type MilestoneMetric =
  | "applications"
  | "contacts"
  | "gmail_connected"
  | "documents"
  | "interviews"
  | "bell_rings";

export type VisualUpgrade =
  | "war-room-renovated"
  | "penthouse-gold"
  | "tower-platinum";

export interface Milestone {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly floor: string;
  readonly threshold: number;
  readonly metric: MilestoneMetric;
  readonly visualUpgrade?: VisualUpgrade;
}

export const MILESTONES: readonly Milestone[] = [
  {
    id: "first_app",
    label: "First Application",
    description: "Create your first application",
    floor: "7",
    threshold: 1,
    metric: "applications",
  },
  {
    id: "ten_apps",
    label: "Pipeline Builder",
    description: "Add 10 applications",
    floor: "7",
    threshold: 10,
    metric: "applications",
    visualUpgrade: "war-room-renovated",
  },
  {
    id: "first_contact",
    label: "First Connection",
    description: "Add your first contact",
    floor: "6",
    threshold: 1,
    metric: "contacts",
  },
  {
    id: "gmail_connected",
    label: "Inbox Connected",
    description: "Connect your Gmail",
    floor: "4",
    threshold: 1,
    metric: "gmail_connected",
  },
  {
    id: "first_cover_letter",
    label: "First Draft",
    description: "Generate a cover letter",
    floor: "5",
    threshold: 1,
    metric: "documents",
  },
  {
    id: "first_interview",
    label: "Interview Scheduled",
    description: "Schedule an interview",
    floor: "3",
    threshold: 1,
    metric: "interviews",
  },
  {
    id: "ring_the_bell",
    label: "Bell Ringer",
    description: "Use Ring the Bell",
    floor: "1",
    threshold: 1,
    metric: "bell_rings",
  },
  {
    id: "fifty_apps",
    label: "Power Applicant",
    description: "Reach 50 applications",
    floor: "PH",
    threshold: 50,
    metric: "applications",
    visualUpgrade: "penthouse-gold",
  },
  {
    id: "hundred_apps",
    label: "Century Club",
    description: "100 applications",
    floor: "ALL",
    threshold: 100,
    metric: "applications",
    visualUpgrade: "tower-platinum",
  },
] as const;
