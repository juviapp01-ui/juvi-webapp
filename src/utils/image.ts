// Same pass-through as the app (frontend/src/utils/image.ts): the backend
// serves one URL per image with no resize option yet, so this returns the URL
// unchanged. Kept so a future resize param only needs filling in here.
export function getSizedImageUri(uri: string, width: number): string;
export function getSizedImageUri(uri: string | undefined | null, width: number): string | undefined;
export function getSizedImageUri(uri: string | undefined | null, _width: number): string | undefined {
  return uri ?? undefined;
}
