import apiClient from "./api";

export const authAPI = {
  login: (username: string, password: string) => {
    return apiClient.post("/auth/login/", { username, password });
  },
  logout: () => {
    return apiClient.post("/auth/logout/");
  },
  getUser: () => {
    return apiClient.get("/auth/user/");
  },
};

export const customerAPI = {
  list: (params?: any) => {
    return apiClient.get("/customers/", { params });
  },
  create: (data: any) => {
    return apiClient.post("/customers/", data);
  },
  update: (id: string, data: any) => {
    return apiClient.put(`/customers/${id}/`, data);
  },
  delete: (id: string) => {
    return apiClient.delete(`/customers/${id}/`);
  },
  detail: (id: string) => {
    return apiClient.get(`/customers/${id}/`);
  },
};

export const opportunityAPI = {
  list: (params?: any) => {
    return apiClient.get("/opportunities/", { params });
  },
  create: (data: any) => {
    return apiClient.post("/opportunities/", data);
  },
  update: (id: string, data: any) => {
    return apiClient.put(`/opportunities/${id}/`, data);
  },
  delete: (id: string) => {
    return apiClient.delete(`/opportunities/${id}/`);
  },
  detail: (id: string) => {
    return apiClient.get(`/opportunities/${id}/`);
  },
};
