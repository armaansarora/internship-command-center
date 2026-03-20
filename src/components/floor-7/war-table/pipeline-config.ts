// Pipeline column configuration for the War Table Kanban board

export const PIPELINE_COLUMNS = [
  {
    id: "discovered",
    tacticalName: "RECON",
    color: "#4A7A9B",
    statuses: ["discovered"],
    collapsed: false,
  },
  {
    id: "applied",
    tacticalName: "OPS SUBMITTED",
    color: "#1E90FF",
    statuses: ["applied"],
    collapsed: false,
  },
  {
    id: "screening",
    tacticalName: "FIRST CONTACT",
    color: "#00D4FF",
    statuses: ["screening"],
    collapsed: false,
  },
  {
    id: "active",
    tacticalName: "ACTIVE ENGAGEMENT",
    color: "#F59E0B",
    statuses: ["interview_scheduled", "interviewing"],
    collapsed: false,
  },
  {
    id: "review",
    tacticalName: "INTEL REVIEW",
    color: "#F59E0B",
    statuses: ["under_review"],
    collapsed: false,
  },
  {
    id: "offer",
    tacticalName: "MISSION SUCCESS",
    color: "#00FF87",
    statuses: ["offer"],
    collapsed: false,
  },
  {
    id: "completed",
    tacticalName: "COMPLETED",
    color: "#4A7A9B",
    statuses: ["accepted", "rejected", "withdrawn"],
    collapsed: true,
  },
] as const;

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

export function getColumnForStatus(status: string): PipelineColumnId {
  for (const col of PIPELINE_COLUMNS) {
    if ((col.statuses as readonly string[]).includes(status)) {
      return col.id;
    }
  }
  return "discovered";
}

export function getPrimaryStatusForColumn(columnId: PipelineColumnId): string {
  const col = PIPELINE_COLUMNS.find((c) => c.id === columnId);
  if (!col) return "discovered";
  return col.statuses[0];
}
