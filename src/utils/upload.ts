// Uploads a file straight to storage with a signed URL from the backend (the
// same presign flow the app uses). Uses XHR so the caller can show progress.
// The storage bucket must allow PUT from the website's origin (CORS) — see
// the README.
export function putToSignedUrl(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
    xhr.send(body);
  });
}

// The content type the backend's presign endpoints accept for photos.
export const imageContentType = (f: File) => (f.type === 'image/png' ? 'image/png' : 'image/jpeg');
