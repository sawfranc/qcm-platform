import apiClient from "./client";

export const register = (payload) => apiClient.post("/auth/register", payload);
export const login = (identifier, password) => apiClient.post("/auth/login", { identifier, password });
export const changePassword = (currentPassword, newPassword) => apiClient.post("/auth/change-password", { currentPassword, newPassword });
