export function getOffsetStyle(offsetX?: number | null, offsetY?: number | null) {
  const x = typeof offsetX === "number" ? offsetX : 0;
  const y = typeof offsetY === "number" ? offsetY : 0;
  if (!x && !y) return undefined;
  return { transform: `translate(${x}px, ${y}px)` };
}

