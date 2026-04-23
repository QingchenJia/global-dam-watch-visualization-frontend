import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { FILTER_RAG_DOCUMENTS } from "./docs.js";
import { HashEmbeddings } from "./embeddings.js";

let filterVectorStorePromise = null;

export function initFilterVectorStore() {
    if (!filterVectorStorePromise) {
        const documents = FILTER_RAG_DOCUMENTS.map(
            ({ content, ...metadata }) =>
                new Document({
                    pageContent: content,
                    metadata,
                    id: metadata.id,
                }),
        );

        filterVectorStorePromise = MemoryVectorStore.fromDocuments(
            documents,
            new HashEmbeddings(),
        );
    }

    return filterVectorStorePromise;
}
