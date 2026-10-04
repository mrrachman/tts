/**
 * Utility for counting words, parsing SSML, and splitting long text into cohesive chunks.
 * Ensures chunks do not break in the middle of sentences and stay within the safe limit.
 * Supports automatic sentence-aware splitting, explicit section markers, and SSML tags.
 */

export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Detects if the text contains SSML tags like <speak>, <emphasis>, <break>, etc.
 */
export function isSsmlText(text: string): boolean {
  if (!text) return false;
  return /<\s*(speak|emphasis|break|prosody|say-as|voice|p|s)[\s>]/i.test(text);
}

/**
 * Converts SSML tags into natural punctuation and directive formatting that Gemini TTS excels at:
 * - <emphasis level="strong"> -> UPPERCASE / *italic*
 * - <break strength="strong"> -> ellipsis + paragraph break
 * - <break strength="medium"> -> period
 * - <break strength="weak"> -> comma
 */
export function convertSsmlToNaturalText(ssml: string): string {
  if (!ssml || (!ssml.includes('<') && !ssml.includes('>'))) {
    return ssml;
  }

  let text = ssml;

  // 1. Remove <speak> and </speak>
  text = text.replace(/<\/?speak[^>]*>/gi, '');

  // 2. Convert <emphasis level="strong">text</emphasis> -> UPPERCASE for natural Gemini emphasis
  text = text.replace(/<emphasis\s+level=["']strong["'][^>]*>(.*?)<\/emphasis>/gis, (_, content) => {
    return content.trim().toUpperCase();
  });

  // 3. Convert <emphasis level="moderate">text</emphasis> or other emphasis -> *text*
  text = text.replace(/<emphasis[^>]*>(.*?)<\/emphasis>/gis, (_, content) => {
    return `*${content.trim()}*`;
  });

  // 4. Convert <break strength="strong" /> or <break strength="x-strong" /> -> ...\n\n
  text = text.replace(/<break\s+[^>]*strength=["'](strong|x-strong)["'][^>]*\/?>/gi, '...\n\n');

  // 5. Convert <break strength="medium" /> -> .\n
  text = text.replace(/<break\s+[^>]*strength=["']medium["'][^>]*\/?>/gi, '.\n');

  // 6. Convert <break strength="weak" /> or <break strength="x-weak" /> -> , 
  text = text.replace(/<break\s+[^>]*strength=["'](weak|x-weak)["'][^>]*\/?>/gi, ', ');

  // 7. Generic <break ... /> -> ... 
  text = text.replace(/<break[^>]*\/?>/gi, '... ');

  // 8. Strip any remaining XML / HTML tags (e.g. <p>, </p>, <s>, </s>, <prosody>, etc.)
  text = text.replace(/<[^>]+>/g, '');

  // 9. Clean up redundant punctuation (e.g. ", .", "..", " .")
  text = text
    .replace(/\s+([.,!?—])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '...')
    .replace(/\.{4,}/g, '...')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Splits a text into clean sentence units.
 */
function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Match sentences ending with ., !, ?, ellipsis (...), or newlines
  const regex = /[^.!?\n]+(?:[.!?…]+|\n+|$)/g;
  const matches = text.match(regex);
  if (!matches) {
    return [text.trim()];
  }

  return matches.map((s) => s.trim()).filter(Boolean);
}

/**
 * If a single sentence exceeds maxWords, split it at commas, semicolons, or word boundaries.
 */
function splitLongSentence(sentence: string, maxWords: number): string[] {
  const words = sentence.trim().split(/\s+/);
  if (words.length <= maxWords) return [sentence.trim()];

  // Try splitting by clauses first (; or , or —)
  const clauses = sentence.split(/(?<=[;,—])\s+/);
  const result: string[] = [];
  let currentClause = '';

  for (const clause of clauses) {
    const clauseWords = countWords(clause);
    if (clauseWords > maxWords) {
      // Split strictly by words
      const subWords = clause.trim().split(/\s+/);
      for (let i = 0; i < subWords.length; i += maxWords) {
        result.push(subWords.slice(i, i + maxWords).join(' '));
      }
    } else if (countWords(currentClause + ' ' + clause) <= maxWords) {
      currentClause = currentClause ? `${currentClause} ${clause}` : clause;
    } else {
      if (currentClause) result.push(currentClause.trim());
      currentClause = clause;
    }
  }

  if (currentClause.trim()) {
    result.push(currentClause.trim());
  }

  return result.length > 0 ? result : [sentence.trim()];
}

/**
 * Splits a single section of text into chunks <= maxWords.
 */
function splitSingleSectionIntoChunks(text: string, maxWords: number): string[] {
  const totalWords = countWords(text);
  if (totalWords <= maxWords) {
    return [text.trim()];
  }

  // Split text by paragraphs first to respect structure
  const paragraphs = text.split(/\n{2,}/);
  const rawSentences: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    const sentencesInPara = splitIntoSentences(trimmedPara);
    for (const s of sentencesInPara) {
      if (countWords(s) > maxWords) {
        rawSentences.push(...splitLongSentence(s, maxWords));
      } else {
        rawSentences.push(s);
      }
    }
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentChunkWords = 0;

  for (const sentence of rawSentences) {
    const sWords = countWords(sentence);

    if (currentChunkWords + sWords <= maxWords) {
      currentChunk.push(sentence);
      currentChunkWords += sWords;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' ').trim());
      }
      currentChunk = [sentence];
      currentChunkWords = sWords;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ').trim());
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Detects if text contains explicit delimiters like:
 * - Markdown hr / separator lines: `---`, `===`, `***`
 * - Section tags: `[Bagian 1]`, `[Part 1]`, `[Segmen 1]`, `[Scene 1]`
 * - Explicit headers on new lines: `BAGIAN 1:`, `PART 1:`, `SEGMEN 1:`
 * - Chapter keywords like `Next.` on their own sentence
 */
function splitByExplicitMarkers(text: string): string[] | null {
  // Check for horizontal dividers: ---, ===, ***, ___ on their own lines
  if (/^[ \t]*[-=*_]{3,}[ \t]*$/m.test(text)) {
    const parts = text.split(/^[ \t]*[-=*_]{3,}[ \t]*$/m);
    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length > 1) return cleaned;
  }

  // Check for bracket tags like [Bagian 1], [Part 1], [Segmen 1], [1], etc.
  const bracketRegex = /(?=^\[(?:bagian|part|segmen|scene|\d+)[^\]]*\])/gim;
  if (bracketRegex.test(text)) {
    const parts = text.split(bracketRegex);
    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length > 1) return cleaned;
  }

  // Check for line starters like "Bagian 1:", "Part 1:", "Segmen 1:"
  const headerRegex = /(?=^(?:bagian|part|segmen)\s+\d+[:.-])/gim;
  if (headerRegex.test(text)) {
    const parts = text.split(headerRegex);
    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length > 1) return cleaned;
  }

  // Check for section transitions like "\nNext.\n" or "\nNext,"
  const nextRegex = /(?=\n(?:Next\.|Next,)\s+)/gi;
  if (nextRegex.test(text)) {
    const parts = text.split(nextRegex);
    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length > 1) return cleaned;
  }

  return null;
}

/**
 * Main function: Splits text into chunks.
 * 1. If text is SSML, converts to natural text first (with CAPSLOCK emphasis & punctuation).
 * 2. If explicit section markers are present, splits by those markers first.
 * 3. If any resulting section is > maxWords (200), splits that section sentence-by-sentence.
 * 4. If no markers, splits entire text sentence-by-sentence with maxWords limit.
 */
export function splitTextIntoChunks(text: string, maxWords: number = 200): string[] {
  if (!text || !text.trim()) return [];

  // Convert SSML if detected so XML tags are not counted as words and not read verbatim
  const cleanText = isSsmlText(text) ? convertSsmlToNaturalText(text) : text;

  // Check for explicit format markers first
  const explicitSections = splitByExplicitMarkers(cleanText);

  if (explicitSections && explicitSections.length > 1) {
    const finalChunks: string[] = [];
    for (const section of explicitSections) {
      if (countWords(section) > maxWords) {
        finalChunks.push(...splitSingleSectionIntoChunks(section, maxWords));
      } else {
        finalChunks.push(section.trim());
      }
    }
    return finalChunks.filter((c) => c.length > 0);
  }

  // Standard sentence-aware splitting
  return splitSingleSectionIntoChunks(cleanText, maxWords);
}
