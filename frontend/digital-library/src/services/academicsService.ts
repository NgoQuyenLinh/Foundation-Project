import api from "./api";

export const academicsService = {
  getFaculties: () => api.get("/academics/faculties").then((r) => r.data),
  getClasses: () => api.get("/academics/classes").then((r) => r.data),
};