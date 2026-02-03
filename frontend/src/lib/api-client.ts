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

export const userAPI = {
  me: () => {
    return apiClient.get("/api/v1/accounts/users/me/");
  },
  list: (params?: any) => {
    return apiClient.get("/api/v1/accounts/users/", { params });
  },
  create: (data: any) => {
    return apiClient.post("/api/v1/accounts/users/", data);
  },
  update: (id: string, data: any) => {
    return apiClient.put(`/api/v1/accounts/users/${id}/`, data);
  },
  delete: (id: string) => {
    return apiClient.delete(`/api/v1/accounts/users/${id}/`);
  },
  detail: (id: string) => {
    return apiClient.get(`/api/v1/accounts/users/${id}/`);
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
  changeStage: (id: string, stage: string) => {
    return apiClient.post(`/opportunities/${id}/change_stage/`, { stage });
  },
  markWon: (id: string) => {
    return apiClient.post(`/opportunities/${id}/mark_won/`);
  },
  markLost: (id: string) => {
    return apiClient.post(`/opportunities/${id}/mark_lost/`);
  },
};

export const contactAPI = {
  list: (params?: any) => {
    return apiClient.get("/customers/contacts/", { params });
  },
  create: (data: any) => {
    return apiClient.post("/customers/contacts/", data);
  },
  update: (id: string, data: any) => {
    return apiClient.put(`/customers/contacts/${id}/`, data);
  },
  delete: (id: string) => {
    return apiClient.delete(`/customers/contacts/${id}/`);
  },
  detail: (id: string) => {
    return apiClient.get(`/customers/contacts/${id}/`);
  },
};

export const leadAPI = {
  list: (params?: any) => {
    return apiClient.get("/api/v1/customers/leads/", { params });
  },
  create: (data: any) => {
    return apiClient.post("/api/v1/customers/leads/", data);
  },
  update: (id: string, data: any) => {
    return apiClient.put(`/api/v1/customers/leads/${id}/`, data);
  },
  delete: (id: string) => {
    return apiClient.delete(`/api/v1/customers/leads/${id}/`);
  },
  detail: (id: string) => {
    return apiClient.get(`/api/v1/customers/leads/${id}/`);
  },
  convertToCustomer: (id: string, data: any) => {
    return apiClient.post(`/api/v1/customers/leads/${id}/convert_to_customer/`, data);
  },
  batchDelete: (ids: string[]) => {
    return apiClient.post("/api/v1/customers/leads/batch_delete/", { ids });
  },
  batchAssign: (ids: string[], ownerId: string) => {
    return apiClient.post("/api/v1/customers/leads/batch_assign/", { ids, owner: ownerId });
  },
};

export const reportAPI = {
  getPipelineSummary: (params?: any) => {
    return apiClient.get("/api/v1/opportunities/opportunities/pipeline_summary/", { params });
  },
  getCustomerGrowth: (params?: any) => {
    return apiClient.get("/api/v1/reports/customer_growth/", { params });
  },
  getSalesRanking: (params?: any) => {
    return apiClient.get("/api/v1/reports/sales_ranking/", { params });
  },
  getLeadConversion: (params?: any) => {
    return apiClient.get("/api/v1/reports/lead_conversion/", { params });
  },
  getSalesTrend: (params?: any) => {
    return apiClient.get("/api/v1/reports/sales_trend/", { params });
  },
};
