import { persist } from './storage';

// Saved service addresses. Kept in this browser only — like the app keeps
// them on the phone: there's no address model on the backend.
export interface SavedAddress {
  id: string;
  label: string; // "Home", "Mum's place"…
  flat: string;
  area: string;
  landmark?: string;
  city: string;
  pincode: string;
}

const KEY = 'savedAddresses';

export const savedAddresses = {
  list: (): SavedAddress[] => persist.get<SavedAddress[]>(KEY) ?? [],
  save: (address: SavedAddress) => {
    const list = savedAddresses.list();
    const i = list.findIndex((a) => a.id === address.id);
    if (i >= 0) list[i] = address;
    else list.push(address);
    persist.set(KEY, list);
  },
  remove: (id: string) => persist.set(KEY, savedAddresses.list().filter((a) => a.id !== id)),
};

// One line, the way it's sent with a booking.
export const addressLine = (a: Pick<SavedAddress, 'flat' | 'area' | 'landmark' | 'city' | 'pincode'>) =>
  [a.flat, a.area, a.landmark ? `Landmark: ${a.landmark}` : '', a.city, a.pincode].map((s) => s?.trim()).filter(Boolean).join(', ');
