import type {
  OcrConfidence,
  OcrDetectedCover,
  OcrLineRole,
  OcrParsedFields,
  OcrTextLine,
} from "./types";

const editionKeywords = [
  "edizione",
  "ed.",
  "ristampa",
  "volume",
  "vol.",
  "edition",
  "paperback",
  "hardcover",
] as const;

function normalizeText(value: string) {
  return value.trim();
}

function getLineArea(line: OcrTextLine) {
  return line.boundingBox.width * line.boundingBox.height;
}

function getLineCenterY(line: OcrTextLine) {
  return line.boundingBox.y + line.boundingBox.height / 2;
}

function isMostlyUppercase(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, "");

  if (!letters) {
    return false;
  }

  return letters === letters.toUpperCase();
}

function looksLikeEdition(text: string) {
  const normalized = text.trim().toLowerCase();
  return editionKeywords.some((keyword) => normalized.includes(keyword));
}

function looksLikeAuthor(text: string) {
  const normalized = text.trim();

  if (!normalized || looksLikeEdition(normalized)) {
    return false;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length < 2 || tokens.length > 5) {
    return false;
  }

  return tokens.every((token) => /^[A-Z][A-Za-z.'-]*$/.test(token));
}

function classifyLineRole(line: OcrTextLine, titleLineId: string | null): OcrLineRole {
  if (looksLikeEdition(line.text)) {
    return "edition";
  }

  if (looksLikeAuthor(line.text) && line.id !== titleLineId) {
    return "author";
  }

  return "other";
}

function getBestTitleLine(lines: OcrTextLine[]) {
  const sorted = [...lines].sort((left, right) => {
    const leftScore =
      getLineArea(left) + (isMostlyUppercase(left.text) ? 3000 : 0) - getLineCenterY(left) * 2;
    const rightScore =
      getLineArea(right) + (isMostlyUppercase(right.text) ? 3000 : 0) - getLineCenterY(right) * 2;

    return rightScore - leftScore;
  });

  return sorted[0] ?? null;
}

function getBestAuthorLine(lines: OcrTextLine[], titleLine: OcrTextLine | null) {
  const candidates = lines.filter((line) => line.id !== titleLine?.id && looksLikeAuthor(line.text));

  if (candidates.length === 0) {
    return null;
  }

  if (!titleLine) {
    return candidates[0];
  }

  return [...candidates].sort((left, right) => {
    const leftDistance = Math.abs(getLineCenterY(left) - getLineCenterY(titleLine));
    const rightDistance = Math.abs(getLineCenterY(right) - getLineCenterY(titleLine));

    return leftDistance - rightDistance;
  })[0];
}

function getBestEditionLine(lines: OcrTextLine[], excludedLineIds: string[]) {
  return (
    lines.find(
      (line) => !excludedLineIds.includes(line.id) && looksLikeEdition(normalizeText(line.text))
    ) ?? null
  );
}

function mergeConfidence(confidences: OcrConfidence[]) {
  if (confidences.includes("low")) {
    return "low";
  }

  if (confidences.includes("medium")) {
    return "medium";
  }

  return "high";
}

export function parseCoverText(cover: OcrDetectedCover): OcrParsedFields {
  const lines = cover.lines.filter((line) => normalizeText(line.text));
  const titleLine = getBestTitleLine(lines);
  const authorLine = getBestAuthorLine(lines, titleLine);
  const editionLine = getBestEditionLine(
    lines,
    [titleLine?.id, authorLine?.id].filter(Boolean) as string[]
  );

  const assignedRoles = lines.map((line) => {
    if (line.id === titleLine?.id) {
      return { lineId: line.id, role: "title" as const };
    }

    if (line.id === authorLine?.id) {
      return { lineId: line.id, role: "author" as const };
    }

    if (line.id === editionLine?.id) {
      return { lineId: line.id, role: "edition" as const };
    }

    return {
      lineId: line.id,
      role: classifyLineRole(line, titleLine?.id ?? null),
    };
  });

  return {
    title: normalizeText(titleLine?.text ?? ""),
    author: normalizeText(authorLine?.text ?? ""),
    edition: normalizeText(editionLine?.text ?? ""),
    genre: "",
    confidence: mergeConfidence([
      cover.confidence,
      ...(titleLine ? [titleLine.confidence] : []),
      ...(authorLine ? [authorLine.confidence] : []),
      ...(editionLine ? [editionLine.confidence] : []),
    ]),
    rawText: lines.map((line) => normalizeText(line.text)).join(" "),
    assignedRoles,
  };
}
