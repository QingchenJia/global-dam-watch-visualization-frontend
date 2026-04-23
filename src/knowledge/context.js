const MAX_CONTEXT_CHARS = 5000;

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
    if (!documents.length) {
        return "No schema or glossary snippets were retrieved. Use only known whitelist fields.";
    }

    const context = documents.map(formatDoc).join("\n\n");

    if (context.length <= MAX_CONTEXT_CHARS) {
        return context;
    }

    return `${context.slice(0, MAX_CONTEXT_CHARS)}\n[context truncated]`;
}
