export type ColumnSide = "left" | "right";

export const COLUMN_BOUNDS: Record<ColumnSide, { min: number; max: number }> = {
  left: { min: 240, max: 520 },
  right: { min: 300, max: 720 },
};

export function clampColumnWidth(side: ColumnSide, px: number): number {
  const { min, max } = COLUMN_BOUNDS[side];
  return Math.min(max, Math.max(min, Math.round(px)));
}

export function nextColumnWidth(side: ColumnSide, startPx: number, dxPx: number): number {
  const delta = side === "left" ? dxPx : -dxPx;
  return clampColumnWidth(side, startPx + delta);
}

export function parseColumnWidth(raw: string): number | null {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatColumnWidth(px: number): string {
  return `${px}px`;
}
