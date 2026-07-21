// ============================================================
// Client-side background removal utility
// ============================================================

/**
 * Clean up background of a clothing item photo by keying out uniform light backdrops
 * (common for fashion flat-lays and closet hanger photos).
 * Uses a Canvas-based flood-fill or threshold comparison.
 */
export async function removeBackground(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample the corner pixels (top-left, top-right) to determine background color
        const samples = [
          getPixelColor(data, 0, 0, canvas.width),
          getPixelColor(data, canvas.width - 1, 0, canvas.width),
          getPixelColor(data, 0, canvas.height - 1, 0),
          getPixelColor(data, canvas.width - 1, canvas.height - 1, canvas.width),
        ];

        // Find average background color
        let avgR = 0, avgG = 0, avgB = 0;
        samples.forEach(([r, g, b]) => {
          avgR += r;
          avgG += g;
          avgB += b;
        });
        avgR /= samples.length;
        avgG /= samples.length;
        avgB /= samples.length;

        // Remove pixels matching the background color within a threshold
        const threshold = 45; // adjustment tolerance
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean distance in RGB space
          const dist = Math.sqrt(
            Math.pow(r - avgR, 2) +
            Math.pow(g - avgG, 2) +
            Math.pow(b - avgB, 2)
          );

          if (dist < threshold) {
            data[i + 3] = 0; // set alpha to transparent
          }
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, 'image/png');
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function getPixelColor(data: Uint8ClampedArray, x: number, y: number, width: number): [number, number, number] {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2]];
}
