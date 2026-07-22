import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
import type { GeminiAnalysisResult, OutfitGenerationResult, WardrobeItem } from '../types';

// ─── API Key resolution ───────────────────────────────────────
// Priority: 1) User-supplied key (from settings page, stored in localStorage)
//           2) VITE_GEMINI_API_KEY env var
//           3) Error state
export function getGeminiApiKey(): string | null {
  return (
    localStorage.getItem('wardrobe_ai_gemini_key') ||
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    null
  );
}

function getClient(): GoogleGenerativeAI {
  const key = getGeminiApiKey();
  if (!key) throw new GeminiApiKeyMissingError();
  return new GoogleGenerativeAI(key);
}

// ─── Custom error types ───────────────────────────────────────
export class GeminiApiKeyMissingError extends Error {
  constructor() {
    super('Gemini API key is not configured. Please add your key in Settings.');
    this.name = 'GeminiApiKeyMissingError';
  }
}

export class GeminiRateLimitError extends Error {
  constructor() {
    super('Gemini API rate limit reached. Please wait a moment and try again.');
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiGenerationError';
  }
}

// ─── Retry helper ─────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1500
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (retries > 0 && (message.includes('429') || message.includes('quota'))) {
      await new Promise((r) => setTimeout(r, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    if (message.includes('429') || message.includes('quota')) {
      throw new GeminiRateLimitError();
    }
    throw err;
  }
}

// ─── 1. Clothing Item Analysis (vision + JSON) ────────────────
const ANALYSIS_PROMPT = `You are a fashion expert AI. Analyze this clothing item image and return a JSON object with exactly these fields:
{
  "category": one of ["top", "bottom", "footwear", "accessory", "outerwear", "dress", "bag"],
  "color": array of 1-3 color names (e.g. ["navy blue", "white"]),
  "season": array of applicable seasons from ["spring", "summer", "autumn", "winter", "all"],
  "occasion": array from ["casual", "formal", "business", "sport", "evening", "beach", "outdoor"],
  "description": "one sentence describing the item",
  "tags": array of 3-6 descriptive tags (e.g. ["slim fit", "cotton", "v-neck"]),
  "brand": "brand name if visible, otherwise null"
}
Return ONLY the raw JSON, no markdown, no code blocks, no extra text.`;

export async function analyzeClothingItem(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<GeminiAnalysisResult> {
  return withRetry(async () => {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imagePart: Part = {
      inlineData: { data: imageBase64, mimeType },
    };

    const result = await model.generateContent([ANALYSIS_PROMPT, imagePart]);
    const text = result.response.text().trim();

    // Strip any accidental markdown code fences
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');

    try {
      return JSON.parse(jsonText) as GeminiAnalysisResult;
    } catch {
      throw new GeminiGenerationError(`Failed to parse clothing analysis: ${jsonText.slice(0, 200)}`);
    }
  });
}

// ─── 2. Outfit Composite Image Generation ─────────────────────

export async function generateOutfitImage(
  itemImages: Array<{ base64: string; mimeType: string; label: string }>,
  bodyPhotoBase64?: string
): Promise<OutfitGenerationResult> {
  return withRetry(async () => {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const parts: Part[] = [
      {
        text: `You are an elite celebrity fashion stylist. Analyze the provided clothing items and create a comprehensive styling recommendation.
Return ONLY a raw JSON object with these fields:
{
  "description": "A sophisticated 2-sentence breakdown of how these items harmonize together (color palette, silhouette, balance).",
  "stylingTips": ["Tip 1: footwear/accessory advice", "Tip 2: layering or tucking advice", "Tip 3: color contrast or occasion tip"],
  "occasion": "casual", // one of: ["casual", "formal", "business", "sport", "evening", "beach", "outdoor"]
  "season": "autumn" // one of: ["spring", "summer", "autumn", "winter", "all"]
}`
      }
    ];

    itemImages.forEach(({ base64, mimeType, label }) => {
      parts.push({ text: `[Clothing Item: ${label}]:` });
      parts.push({ inlineData: { data: base64, mimeType: (mimeType || 'image/png') as any } });
    });

    if (bodyPhotoBase64) {
      parts.push({ text: '[User body/on-model photo]:' });
      parts.push({ inlineData: { data: bodyPhotoBase64, mimeType: 'image/jpeg' } });
    }

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let description = 'A beautifully coordinated outfit setup.';
    let stylingTips: string[] = [
      'Pair with minimalist accessories to let key pieces shine.',
      'Ensure proper fit and proportion between top and bottom layers.',
      'Choose versatile footwear that complements the color palette.'
    ];
    let occasion: any = 'casual';
    let season: any = 'all';

    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.description) description = parsed.description;
      if (Array.isArray(parsed.stylingTips) && parsed.stylingTips.length > 0) stylingTips = parsed.stylingTips;
      if (parsed.occasion) occasion = parsed.occasion;
      if (parsed.season) season = parsed.season;
    } catch (e) {
      console.warn('[Gemini] JSON parsing error for outfit generation:', e);
    }

    return {
      generatedImageUrl: null,
      generatedImageBlob: null,
      description,
      stylingTips,
      occasion,
      season,
    };
  });
}

// ─── 3. Generate outfit description only (no image) ───────────
export async function generateOutfitDescription(
  items: Pick<WardrobeItem, 'category' | 'color' | 'description' | 'tags'>[]
): Promise<{ description: string; stylingTips: string[] }> {
  return withRetry(async () => {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const itemDescriptions = items
      .map((i) => `${i.category}: ${i.color.join('/')} — ${i.description}`)
      .join('\n');

    const prompt = `As a fashion stylist, analyze this outfit combination:
${itemDescriptions}

Respond with JSON only:
{
  "description": "2-sentence engaging style description",
  "stylingTips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    try {
      return JSON.parse(text);
    } catch {
      return {
        description: 'A stylish and cohesive outfit combination.',
        stylingTips: [
          'Accessorize with a minimal watch or bracelet.',
          'Choose footwear that complements the color palette.',
          'Layer with a light jacket for versatility.',
        ],
      };
    }
  });
}
