import apiClient from "./client";

export const createQuestion = (payload) => apiClient.post("/questions", payload);
export const listQuestions = (params) => apiClient.get("/questions", { params });
export const validateQuestion = (id) => apiClient.post(`/questions/${id}/validate`);
export const rejectQuestion = (id, reason) => apiClient.post(`/questions/${id}/reject`, { reason });
export const importQuestions = (rows, { dryRun, createMissingLevels }) =>
  apiClient.post("/questions/import", { rows, dryRun, createMissingLevels });
