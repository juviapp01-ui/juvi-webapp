import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api';

export function useArtistDashboard() {
  return useQuery({
    queryKey: ['artistDashboard'],
    queryFn: async () => {
      const { data } = await dashboardApi.getArtistDashboard();
      return data;
    },
  });
}
