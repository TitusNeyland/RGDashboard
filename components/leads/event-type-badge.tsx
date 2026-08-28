import { Badge } from "@/components/ui/badge";
import type { PipelineEventType } from "@/lib/pipeline-events/classify";

const EVENT_STYLES: Record<PipelineEventType, string> = {
  stage_change: "border-transparent bg-secondary text-secondary-foreground",
  offer: "border-transparent bg-stage-3/18 text-stage-5",
  contract: "border-transparent bg-green-500/14 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  lost: "border-transparent bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  reactivation: "border-transparent bg-violet-500/12 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
};

const EVENT_LABELS: Record<PipelineEventType, string> = {
  stage_change: "Stage change",
  offer: "Offer",
  contract: "Contract",
  lost: "Lost",
  reactivation: "Reactivation",
};

export function EventTypeBadge({ type }: { type: PipelineEventType }) {
  return <Badge className={EVENT_STYLES[type]}>{EVENT_LABELS[type]}</Badge>;
}
