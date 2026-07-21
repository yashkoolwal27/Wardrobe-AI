// ============================================================
// Storage abstraction: Cloudinary (wardrobe items) + Firebase (generated outfits)
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Firebase setup ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

let firebaseStorage: ReturnType<typeof getStorage> | null = null;

function getFirebaseStorage() {
  if (firebaseStorage) return firebaseStorage;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[Firebase] Missing config — outfit image uploads will be skipped.');
    return null;
  }
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  firebaseStorage = getStorage(app);
  return firebaseStorage;
}

// ─── Cloudinary setup ────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

// ─── Wardrobe Item Upload → Cloudinary ───────────────────────
export async function uploadClothingItem(file: File): Promise<{ url: string; thumbnailUrl: string }> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn('[Cloudinary] Missing config — falling back to local object URL (no persistence).');
    const localUrl = URL.createObjectURL(file);
    return { url: localUrl, thumbnailUrl: localUrl };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'wardrobe-ai/items');
  // Auto-background removal transformation
  formData.append('transformation', 'e_background_removal');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${err.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const baseUrl: string = data.secure_url;

  // Build a thumbnail URL using Cloudinary transforms (200px wide, auto-quality, auto-format)
  const thumbnailUrl = baseUrl.replace(
    '/upload/',
    '/upload/w_200,h_200,c_pad,q_auto,f_auto/'
  );

  return { url: baseUrl, thumbnailUrl };
}

// ─── Generated Outfit Upload → Firebase Storage ───────────────
export async function uploadGeneratedOutfit(
  blob: Blob,
  outfitId: string
): Promise<string | null> {
  const storage = getFirebaseStorage();
  if (!storage) return null;

  const storageRef = ref(storage, `generated-outfits/${outfitId}.png`);
  await uploadBytes(storageRef, blob, { contentType: 'image/png' });
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

// ─── Utility: Convert base64 data URL → Blob ─────────────────
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const byteString = atob(data);
  const arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ─── Utility: File → base64 string ───────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Utility: URL → base64 (for Gemini vision calls) ─────────
export async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
