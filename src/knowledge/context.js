const MAX_CONTEXT_CHARS = 5000;
const MIN_CONTEXT_SCORE = 0.05;

function keepDocument(document) {
    const { score } = document.metadata;

    if (!Number.isFinite(score)) {
        return true;
    }

    return score >= MIN_CONTEXT_SCORE;
}

function formatDoc(document, index) {
    const { category, type, topic, title, score } = document.metadata;
    const source = [category, type, topic].filter(Boolean).join("/");
    const scoreText = Number.isFinite(score) ? ` score=${score.toFixed(3)}` : "";

    return [
        `[${index + 1}] ${source}${scoreText}`,
        `Title: ${title}`,
        document.pageContent,
    ].join("\n");
}

export function buildFilterContext(documents) {
    const filteredDocuments = documents.filter(keepDocument);

    if (!filteredDocuments.length) {
        return "No schema or glossary snippets were retrieved. Use only known whitelist fields.";
    }

    const context = filteredDocuments.map(formatDoc).join("\n\n");

    if (context.length <= MAX_CONTEXT_CHARS) {
        return context;
    }

    return `${context.slice(0, MAX_CONTEXT_CHARS)}\n[context truncated]`;
}
