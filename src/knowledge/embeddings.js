import { OpenAIEmbeddings } from "@langchain/openai";
import { API_ENDPOINT } from "../configs/api.js";

const DEFAULT_EMBEDDING_BATCH_SIZE = 8;
const DEFAULT_EMBEDDING_TIMEOUT_MS = 10000;

export function createProxyEmbeddings() {
    const env = import.meta.env;
    const provider = "rag";
    const model = env.VITE_EMBEDDING_MODEL_NAME;
    const batchSize =
        Number.parseInt(env.VITE_EMBEDDING_BATCH_SIZE, 10) ||
        DEFAULT_EMBEDDING_BATCH_SIZE;
    const timeout =
        Number.parseInt(env.VITE_EMBEDDING_TIMEOUT_MS, 10) ||
        DEFAULT_EMBEDDING_TIMEOUT_MS;

    return new OpenAIEmbeddings({
        apiKey: "proxy",
        batchSize,
        maxRetries: 0,
        model,
        timeout,
        configuration: {
            baseURL: API_ENDPOINT.llmProxy(provider),
        },
    });
}
