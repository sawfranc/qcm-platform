import apiClient from "./client";

export const listStudents = () => apiClient.get("/users/students");
// quota = nombre entier, ou null pour "illimité"
export const updateQuota = (id, quota, resetUsed = false) => apiClient.put(`/users/${id}/quota`, { quota, resetUsed });
