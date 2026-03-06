const META_PREFIX = "__META__:";

export type ContentMeta = {
  text: string;
  hidden?: boolean;
  scale?: number;
};

export type ParsedContentValue = {
  text: string;
  hidden: boolean;
  scale?: number;
  raw: string;
  hasMeta: boolean;
};

export function parseContentValue(raw?: string | null): ParsedContentValue {
  const safeRaw = raw ?? "";
  if (safeRaw.startsWith(META_PREFIX)) {
    const payload = safeRaw.slice(META_PREFIX.length);
    try {
      const parsed = JSON.parse(payload) as ContentMeta | null;
      if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          hidden: Boolean(parsed.hidden),
          scale: typeof parsed.scale === "number" ? parsed.scale : undefined,
          raw: safeRaw,
          hasMeta: true,
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    text: safeRaw,
    hidden: false,
    scale: undefined,
    raw: safeRaw,
    hasMeta: false,
  };
}

export function serializeContentValue(meta: ContentMeta): string {
  const normalizedText = meta.text ?? "";
  const normalizedScale = typeof meta.scale === "number" ? meta.scale : undefined;
  const hasMeta = Boolean(meta.hidden) || (normalizedScale !== undefined && normalizedScale !== 1);
  if (!hasMeta) return normalizedText;
  const payload: ContentMeta = {
    text: normalizedText,
  };
  if (meta.hidden) payload.hidden = true;
  if (normalizedScale !== undefined && normalizedScale !== 1) {
    payload.scale = normalizedScale;
  }
  return `${META_PREFIX}${JSON.stringify(payload)}`;
}

export function coerceContentText(raw?: string | null) {
  return parseContentValue(raw).text;
}
