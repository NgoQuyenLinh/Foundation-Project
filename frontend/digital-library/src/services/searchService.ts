import api from "./api";

export const searchService = {
  quickSearch: (query: string) =>
    api.get(`/search/quick?q=${encodeURIComponent(query)}`).then((r) => r.data),
  fullTextSearch: (query: string, page = 1, pageSize = 20) =>
    api.get(`/search/full?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`).then((r) => r.data),
};