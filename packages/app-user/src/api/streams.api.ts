import client from './client';
import type { ApiResponse, LiveStream, LiveCountry } from '../types';

export interface FeedParams {
  tab?: string;
  type?: string;
  category?: string;
  page?: number;
  limit?: number;
  /**
   * Requirement #1 — ISO alpha-2 codes. An empty array (or omitting it)
   * means "All countries"; the helper below serialises it to `BD,IN,PK`.
   */
  countries?: string[];
}

/** Turn FeedParams into the query the API expects. */
const toQuery = ({ countries, ...rest }: FeedParams = {}) => ({
  ...rest,
  ...(countries && countries.length > 0 ? { country: countries.join(',') } : {}),
});

export const streamsApi = {
  getFeed: (params?: FeedParams) =>
    client.get<ApiResponse<LiveStream[]>>('/streams/feed', { params: toQuery(params) }),

  /** Countries that have at least one live host right now — fills the filter bar. */
  getCountries: () => client.get<ApiResponse<LiveCountry[]>>('/streams/countries'),

  getStream: (id: string) => client.get<ApiResponse<LiveStream>>(`/streams/${id}`),

  createStream: (data: { title: string; type: string; category?: string; cover?: string }) =>
    client.post<ApiResponse<LiveStream>>('/streams', data),

  joinStream: (id: string) =>
    client.post<ApiResponse<{ token: string; channel: string; isHost: boolean; uid: number }>>(
      `/streams/${id}/join`
    ),

  leaveStream: (id: string) => client.post(`/streams/${id}/leave`),

  endStream: (id: string) => client.post(`/streams/${id}/end`),

  getMyActiveStream: () => client.get<ApiResponse<LiveStream | null>>('/streams/my-active'),

  getViewers: (id: string) => client.get<ApiResponse<any[]>>(`/streams/${id}/viewers`),

  heartbeat: (id: string) => client.post(`/streams/${id}/heartbeat`),
};
