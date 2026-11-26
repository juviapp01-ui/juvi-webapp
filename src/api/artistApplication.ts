import { api } from './client';
import { ArtistApplicationStatus } from '@/types';

export interface ArtistApplicationPayload {
  bio?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  maxTravelDistance?: number;
  experienceYears?: number;
}

export interface ArtistApplicationResponse {
  success: boolean;
  message: string;
  status: ArtistApplicationStatus;
  artistProfile: unknown;
}

export const artistApplicationApi = {
  applyAsArtist: (data: ArtistApplicationPayload) =>
    api.post<ArtistApplicationResponse>('/artist/apply', data),
  getApplicationStatus: () =>
    api.get<ArtistApplicationResponse>('/artist/apply/status'),
};
