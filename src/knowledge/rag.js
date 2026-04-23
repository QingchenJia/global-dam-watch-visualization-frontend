import { buildFilterContext } from "./context.js";
import { retrieveFilterDocuments } from "./retriever.js";

export async function retrieveFilterContext(query, options) {
    const documents = await retrieveFilterDocuments(query, options);

    return buildFilterContext(documents);
}
