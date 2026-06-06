import type { ProductionStatus } from "@/types";

export const PRODUCTION_STATUS_ORDER: ProductionStatus[] = [
  "not_started",
  "shoot_done",
  "editing",
  "ready",
  "delivered",
];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  not_started: "Not started",
  shoot_done: "Shoot done",
  editing: "Editing",
  ready: "Ready",
  delivered: "Delivered",
};

export const PRODUCTION_STATUS_SHORT_LABELS: Record<ProductionStatus, string> = {
  not_started: "New",
  shoot_done: "Shot",
  editing: "Edit",
  ready: "Ready",
  delivered: "Sent",
};

export const PRODUCTION_STATUS_STYLES: Record<ProductionStatus, string> = {
  not_started: "border-charcoal-700 bg-charcoal-800/70 text-charcoal-300",
  shoot_done: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  editing: "border-brand-500/30 bg-brand-500/10 text-brand-300",
  ready: "border-green-500/30 bg-green-500/10 text-green-300",
  delivered: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

export function normalizeProductionStatus(status: ProductionStatus | null | undefined): ProductionStatus {
  return status ?? "not_started";
}
