import { api } from './client';

export interface BlockedUser {
  id: string;
  name?: string;
  photoUrl?: string;
}

// The backend contract says GET /blocks "returns blocked user ids", but
// following the same defensive shape-handling used elsewhere in this app
// (see reelsApi/bookingsApi) in case it ends up sending richer user objects
// instead of/alongside bare id strings.
function normalizeBlockedUser(raw: any): BlockedUser {
  if (typeof raw === 'string') return { id: raw };
  return {
    id: raw?.id ?? raw?.userId ?? String(raw),
    name: raw?.name ?? raw?.user?.name ?? undefined,
    photoUrl: raw?.photoUrl ?? raw?.profileImage ?? raw?.user?.profileImage ?? undefined,
  };
}

export const blocksApi = {
  block: (userId: string) => api.post('/blocks', { userId }),
  unblock: (userId: string) => api.delete(`/blocks/${userId}`),
  list: async () => {
    const res = await api.get<any>('/blocks');
    const raw = res.data;
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.blockedUserIds)
            ? raw.blockedUserIds
            : [];
    res.data = items.map(normalizeBlockedUser);
    return res as { data: BlockedUser[] };
  },
};
