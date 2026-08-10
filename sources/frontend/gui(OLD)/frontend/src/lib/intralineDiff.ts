export interface TextSegment {
  text: string;
  highlight: boolean;
}

interface Range {
  location: number;
  length: number;
}

function rangeMax(range: Range): number {
  return range.location + range.length;
}

function commonLength(
  stringA: string,
  rangeA: Range,
  stringB: string,
  rangeB: Range,
  reverse: boolean,
): number {
  const max = Math.min(rangeA.length, rangeB.length);
  const startA = reverse ? rangeMax(rangeA) - 1 : rangeA.location;
  const startB = reverse ? rangeMax(rangeB) - 1 : rangeB.location;
  const stride = reverse ? -1 : 1;

  let length = 0;
  while (Math.abs(length) < max) {
    if (stringA[startA + length] !== stringB[startB + length]) {
      break;
    }
    length += stride;
  }
  return Math.abs(length);
}

/** GitHub Desktop-style relative character change ranges. */
export function relativeChanges(
  stringA: string,
  stringB: string,
): { stringARange: Range; stringBRange: Range } {
  let bRange: Range = { location: 0, length: stringB.length };
  let aRange: Range = { location: 0, length: stringA.length };

  const prefixLength = commonLength(stringB, bRange, stringA, aRange, false);
  bRange = { location: bRange.location + prefixLength, length: bRange.length - prefixLength };
  aRange = { location: aRange.location + prefixLength, length: aRange.length - prefixLength };

  const suffixLength = commonLength(stringB, bRange, stringA, aRange, true);
  bRange = { ...bRange, length: bRange.length - suffixLength };
  aRange = { ...aRange, length: aRange.length - suffixLength };

  return { stringARange: aRange, stringBRange: bRange };
}

function segmentsFromRange(text: string, changed: Range): TextSegment[] {
  const segments: TextSegment[] = [];
  const { location, length } = changed;

  if (location > 0) {
    segments.push({ text: text.slice(0, location), highlight: false });
  }
  if (length > 0) {
    segments.push({ text: text.slice(location, location + length), highlight: true });
  }
  const tailStart = location + length;
  if (tailStart < text.length) {
    segments.push({ text: text.slice(tailStart), highlight: false });
  }

  if (segments.length === 0) {
    return plainSegments(text);
  }
  return segments;
}

export const maxIntralineDiffLength = 1024;

/** Character-level intraline diff (GitHub Desktop getDiffTokens). */
export function computeIntralinePair(
  oldText: string,
  newText: string,
): { oldSegments: TextSegment[]; newSegments: TextSegment[] } {
  if (
    oldText.length > maxIntralineDiffLength ||
    newText.length > maxIntralineDiffLength
  ) {
    return {
      oldSegments: plainSegments(oldText),
      newSegments: plainSegments(newText),
    };
  }

  const { stringARange, stringBRange } = relativeChanges(oldText, newText);
  return {
    oldSegments: segmentsFromRange(oldText, stringARange),
    newSegments: segmentsFromRange(newText, stringBRange),
  };
}

export function plainSegments(text: string): TextSegment[] {
  return text.length > 0 ? [{ text, highlight: false }] : [{ text: " ", highlight: false }];
}
