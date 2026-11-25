import { useMutation } from '@tanstack/react-query';
import { reportsApi, CreateReportPayload } from '@/api';

export function useCreateReport() {
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
  });
}
