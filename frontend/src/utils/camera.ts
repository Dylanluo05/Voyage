import { isNative } from './native';

/**
 * Native photo capture. In the Capacitor app this shows the system sheet
 * ("Take Photo" / "Choose from Library") and returns the picked image as a File,
 * already downscaled and orientation-corrected. Returns null if the user backs out.
 *
 * On the web it always returns null and callers should use their <input type="file">,
 * which browsers already handle well (including the camera on phones).
 */
export async function pickNativePhoto(): Promise<File | null> {
  if (!isNative) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.Uri,
      quality: 90,
      width: 1600,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    return new File([blob], `quest-proof-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
  } catch (err) {
    // Dismissing the sheet rejects with a "cancelled" error; that's not a failure.
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes('cancel')) return null;
    throw err;
  }
}
