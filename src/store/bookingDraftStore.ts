import { create } from 'zustand';

interface BookingDraft {
  artistId?: string;
  serviceIds: string[];
  startTime?: string;
  address?: string;
  setField: <K extends keyof Omit<BookingDraft, 'setField' | 'reset' | 'toggleService' | 'setServices'>>(
    key: K, value: BookingDraft[K]
  ) => void;
  toggleService: (id: string) => void;
  setServices: (ids: string[]) => void;
  reset: () => void;
}

export const useBookingDraft = create<BookingDraft>((set) => ({
  artistId: undefined,
  serviceIds: [],
  startTime: undefined,
  address: undefined,
  setField: (key, value) => set({ [key]: value } as Partial<BookingDraft>),
  toggleService: (id) => set((state) => ({
    serviceIds: state.serviceIds.includes(id)
      ? state.serviceIds.filter(s => s !== id)
      : [...state.serviceIds, id]
  })),
  setServices: (ids) => set({ serviceIds: ids }),
  reset: () => set({ artistId: undefined, serviceIds: [], startTime: undefined, address: undefined }),
}));
