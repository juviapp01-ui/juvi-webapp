import { api } from './client';

export interface PlaceSuggestion {
  placeId: string;
  city: string;
  state: string;
}

export interface AutocompleteResponse {
  success: boolean;
  results: PlaceSuggestion[];
}

// The city a 6-digit pincode belongs to, named the way artists' cities are
// stored (the same Places locality), so it can filter discovery directly.
export interface PincodeResponse {
  success: boolean;
  city: string | null;
  state: string | null;
}

export const placesApi = {
  autocomplete: (q: string) =>
    api.get<AutocompleteResponse>('/places/autocomplete', { params: { q } }),
  pincode: (code: string) =>
    api.get<PincodeResponse>('/places/pincode', { params: { code } }),
};
