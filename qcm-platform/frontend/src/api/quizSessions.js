import apiClient from "./client";

export const startSession = (payload) => apiClient.post("/quiz-sessions", payload);
export const submitAnswer = (sessionId, payload) => apiClient.post(`/quiz-sessions/${sessionId}/answers`, payload);
export const completeSession = (sessionId, payload) => apiClient.post(`/quiz-sessions/${sessionId}/complete`, payload);
