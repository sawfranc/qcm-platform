import apiClient from "./client";

export const listLevels = () => apiClient.get("/levels");
