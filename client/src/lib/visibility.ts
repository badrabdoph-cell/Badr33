export function isExplicitlyHidden(value: unknown) {
  return value === false || value === 0 || value === "0";
}

export function isExplicitlyVisible(value: unknown) {
  return !isExplicitlyHidden(value);
}
