import apiClient from "./client";

export const listDomains = () => apiClient.get("/domains");
export const myDomains = () => apiClient.get("/domains/mine");
export const createTheme = (domainId, name) => apiClient.post(`/domains/${domainId}/themes`, { name });
