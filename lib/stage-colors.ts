// Ordinal ramp: index 0 = earliest/first. A 6th+ item reuses the darkest
// step rather than repeating from the top, since re-cycling would make a
// late item look like an early one. See app/globals.css for the validated
// underlying --stage-1..5 values (dataviz skill, ordinal-mode palette check).
const STAGE_COLOR_CLASSES = ["bg-stage-1", "bg-stage-2", "bg-stage-3", "bg-stage-4", "bg-stage-5"];

export function stageColorClass(index: number) {
  return STAGE_COLOR_CLASSES[Math.min(index, STAGE_COLOR_CLASSES.length - 1)];
}
