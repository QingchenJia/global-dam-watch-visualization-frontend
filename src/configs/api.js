const API_BASE_URL = "http://localhost:8100";

export const API_ENDPOINT = {
    llmProxy: (provider) => `${API_BASE_URL}/api/llm/${provider}`,
    position: {
        barrier: `${API_BASE_URL}/barrier/position`,
        reservoir: `${API_BASE_URL}/reservoir/position`,
    },
    filter: {
        barrier: `${API_BASE_URL}/barrier/filter`,
        reservoir: `${API_BASE_URL}/reservoir/filter`,
    },
    detail: {
        barrier: (id) => `${API_BASE_URL}/barrier/${id}`,
        reservoir: (id) => `${API_BASE_URL}/reservoir/${id}`,
    },
    location: {
        barrier: `${API_BASE_URL}/barrier/location`,
        reservoir: `${API_BASE_URL}/reservoir/location`,
    },
    stats: {
        barrier: `${API_BASE_URL}/barrier/stats`,
        reservoir: `${API_BASE_URL}/reservoir/stats`,
    },
    sync: {
        barrier: `${API_BASE_URL}/barrier/sync`,
        reservoir: `${API_BASE_URL}/reservoir/sync`,
    },
};
