import { removeBackground as imglyRemove } from '@imgly/background-removal';

/**
 * Crop image to Gemini's 2D bounding box (box_2d: [ymin, xmin, ymax, xmax] normalized 0-1000)
 */
export async function cropToBoundingBox(
  input: Blob | File,
  box2d?: [number, number, number, number]
): Promise<Blob> {
  if (!box2d || box2d.length !== 4) return input;
  const [ymin, xmin, ymax, xmax] = box2d;
  if (ymin >= ymax || xmin >= xmax) return input;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(input);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(input);

      // Add a slight 3% padding around the bounding box
      const padY = (ymax - ymin) * 0.03;
      const padX = (xmax - xmin) * 0.03;
      const realYmin = Math.max(0, ymin - padY);
      const realXmin = Math.max(0, xmin - padX);
      const realYmax = Math.min(1000, ymax + padY);
      const realXmax = Math.min(1000, xmax + padX);

      const cropX = (realXmin / 1000) * img.width;
      const cropY = (realYmin / 1000) * img.height;
      const cropWidth = ((realXmax - realXmin) / 1000) * img.width;
      const cropHeight = ((realYmax - realYmin) / 1000) * img.height;

      canvas.width = Math.max(1, cropWidth);
      canvas.height = Math.max(1, cropHeight);

      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((blob) => resolve(blob || input), 'image/png');
    };
    img.onerror = () => resolve(input);
    img.src = url;
  });
}

/**
 * High-precision clothing extraction:
 * 1. Optional Bounding Box crop around ONLY the cloth
 * 2. ML Neural Background Removal (@imgly/background-removal)
 * 3. Skin-tone keying & Canvas backdrop transparency refinement
 */
export async function removeBackground(
  file: File | Blob,
  box2d?: [number, number, number, number]
): Promise<Blob> {
  // Step 1: Crop to clothing bounding box if detected
  let croppedBlob = file;
  if (box2d) {
    try {
      croppedBlob = await cropToBoundingBox(file, box2d);
    } catch (e) {
      console.warn('[bgRemoval] Bounding box crop skipped:', e);
    }
  }

  // Step 2: Try @imgly/background-removal neural ML model
  try {
    const mlCleaned = await imglyRemove(croppedBlob, {
      output: { format: 'image/png' },
    });
    if (mlCleaned && mlCleaned.size > 0) {
      return mlCleaned;
    }
  } catch (mlErr) {
    console.warn('[bgRemoval] Neural BG removal fallback to canvas refinement:', mlErr);
  }

  // Step 3: Canvas Skin-Tone & Corner Backdrop Keying Fallback
  return refineCanvasClothingExtraction(croppedBlob);
}

function refineCanvasClothingExtraction(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(blob);

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Detect background colors from 4 outer edges
      const edgeColors: [number, number, number][] = [];
      const step = Math.max(1, Math.floor(canvas.width / 20));
      for (let x = 0; x < canvas.width; x += step) {
        edgeColors.push(getPixelColor(data, x, 0, canvas.width));
        edgeColors.push(getPixelColor(data, x, canvas.height - 1, canvas.width));
      }
      for (let y = 0; y < canvas.height; y += step) {
        edgeColors.push(getPixelColor(data, 0, y, canvas.width));
        edgeColors.push(getPixelColor(data, canvas.width - 1, y, canvas.width));
      }

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check 1: Is pixel matching edge backdrop color?
        const isBackdrop = edgeColors.some(([br, bg, bb]) => {
          const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
          return dist < 42;
        });

        // Check 2: Is pixel skin tone? (human skin color profile)
        const isSkin = isSkinColor(r, g, b);

        if (isBackdrop || isSkin) {
          data[i + 3] = 0; // Make transparent
        }
      }

      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob((result) => resolve(result || blob), 'image/png');
    };
    img.onerror = () => resolve(blob);
    img.src = url;
  });
}

function isSkinColor(r: number, g: number, b: number): boolean {
  // Standard RGB skin detection rule
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );
}

function getPixelColor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): [number, number, number] {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2]];
}
