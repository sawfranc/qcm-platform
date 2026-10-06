import apiClient from "./client";

export const startSession = (payload) => apiClient.post("/quiz-sessions", payload);
export const getSession = (sessionId) => apiClient.get(`/quiz-sessions/${sessionId}`);
export const submitAnswer = (sessionId, payload) => apiClient.post(`/quiz-sessions/${sessionId}/answers`, payload);
export const completeSession = (sessionId) => apiClient.post(`/quiz-sessions/${sessionId}/complete`);
export const getResult = (sessionId) => apiClient.get(`/quiz-sessions/${sessionId}/result`);
export const getHistory = () => apiClient.get("/quiz-sessions/history");
export const getDashboard = () => apiClient.get("/quiz-sessions/dashboard");
export const getAvailability = ({ domainIds = [], themeIds = [], levelIds = [] }) =>
  apiClient.get("/quiz-sessions/availability", {
    params: { domainIds: domainIds.join(","), themeIds: themeIds.join(","), levelIds: levelIds.join(",") },
  });
