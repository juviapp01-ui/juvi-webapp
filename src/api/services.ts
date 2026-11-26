import { api } from './client';

export interface ServiceInput {
  name: string;
  description?: string;
  price: number | string;
  duration: number | string;
  category?: string;
  visibleTo?: 'MALE' | 'FEMALE' | 'ALL';
}

export const servicesApi = {
  create: (input: ServiceInput) => api.post<{ success: boolean; service: any }>('/services', input),
  update: (id: string, input: Partial<ServiceInput>) =>
    api.put<{ success: boolean; service: any }>(`/services/${id}`, input),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/services/${id}`),
};
