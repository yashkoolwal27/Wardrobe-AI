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
const OUTFIT_SYSTEM_PROMPT = `You are a professional fashion stylist AI. Given the clothing items shown, create a cohesive, stylish outfit image. 
Show the items arranged as a beautiful flat-lay on a clean off-white or marble surface, professionally lit, magazine-quality.
If a body/person photo is provided, show the complete outfit worn by that person with natural lighting.
Make the composition elegant and visually striking.`;

export async function generateOutfitImage(
  itemImages: Array<{ base64: string; mimeType: string; label: string }>,
  bodyPhotoBase64?: string
): Promise<OutfitGenerationResult> {
  return withRetry(async () => {
    const client = getClient();
    // Use gemini-2.0-flash-exp for image output capability
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp-image-generation',
      generationConfig: {
        // @ts-expect-error — responseModalities is valid but not yet in types
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts: Part[] = [{ text: OUTFIT_SYSTEM_PROMPT }];

    // Add all item images
    itemImages.forEach(({ base64, mimeType, label }) => {
      parts.push({ text: `[${label}]:` });
      parts.push({ inlineData: { data: base64, mimeType: mimeType as 'image/jpeg' } });
    });

    if (bodyPhotoBase64) {
      parts.push({ text: '[Person/body photo for on-body outfit composition]:' });
      parts.push({ inlineData: { data: bodyPhotoBase64, mimeType: 'image/jpeg' } });
    }

    parts.push({
      text: 'Generate a stunning outfit composition image. Also provide: a 2-sentence style description, 3 styling tips as a JSON array, the primary occasion (one word), and the primary season (one word). Format the text response as JSON: {"description": "...", "stylingTips": ["...", "...", "..."], "occasion": "...", "season": "..."}',
    });

    const result = await model.generateContent(parts);
    const response = result.response;

    let generatedImageBlob: Blob | null = null;
    let generatedImageUrl: string | null = null;
    let description = 'A beautifully composed outfit.';
    let stylingTips: string[] = [];
    let occasion: string = 'casual';
    let season: string = 'all';

    // Extract image and text from response parts
    const candidates = response.candidates ?? [];
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const byteString = atob(part.inlineData.data);
          const arr = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
          generatedImageBlob = new Blob([arr], { type: part.inlineData.mimeType });
          generatedImageUrl = URL.createObjectURL(generatedImageBlob);
        } else if (part.text) {
          const jsonText = part.text
            .replace(/^```(?:json)?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();
          try {
            const parsed = JSON.parse(jsonText);
            description = parsed.description ?? description;
            stylingTips = parsed.stylingTips ?? stylingTips;
            occasion = parsed.occasion ?? occasion;
            season = parsed.season ?? season;
          } catch {
            // Text might not be JSON — that's okay, use defaults
          }
        }
      }
    }

    // Fallback: if no image generated, create a text-based result card
    if (!generatedImageBlob) {
      // Generate a rich text description as fallback
      const fallbackModel = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const fallbackPrompt = `You are a fashion stylist. Describe this outfit combination in detail.
Items: ${itemImages.map((i) => i.label).join(', ')}.
Respond with JSON: {
  "description": "2-sentence style description",
  "stylingTips": ["tip1", "tip2", "tip3"],
  "occasion": "one word occasion",
  "season": "one word season"
}`;
      const fallbackResult = await fallbackModel.generateContent(fallbackPrompt);
      const fallbackText = fallbackResult.response
        .text()
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      try {
        const parsed = JSON.parse(fallbackText);
        description = parsed.description ?? description;
        stylingTips = parsed.stylingTips ?? stylingTips;
        occasion = parsed.occasion ?? occasion;
        season = parsed.season ?? season;
      } catch {
        // Use defaults
      }
    }

    return {
      generatedImageUrl,
      generatedImageBlob,
      description,
      stylingTips,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      occasion: occasion as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      season: season as any,
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
