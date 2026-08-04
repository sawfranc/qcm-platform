import apiClient from "./client";

export const register = (payload) => apiClient.post("/auth/register", payload);
export const login = (identifier, password) => apiClient.post("/auth/login", { identifier, password });
