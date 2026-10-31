import apiClient from "./client";

export const createUser = (payload) => apiClient.post("/users", payload);
export const listUsers = () => apiClient.get("/users");
export const suspendUser = (id) => apiClient.post(`/users/${id}/suspend`);
export const setTeacherAssignments = (id, assignments) => apiClient.put(`/users/${id}/assignments`, { assignments });
