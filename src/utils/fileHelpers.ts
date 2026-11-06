/**
 * Utility helpers for file reading and processing on the client side.
 */

/**
 * Reads a File into a Data URL (base64) for client-side avatar/image display
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
