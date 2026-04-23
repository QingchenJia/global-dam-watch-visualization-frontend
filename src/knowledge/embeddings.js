const VECTOR_SIZE = 256;

function hashToken(token) {
    let hash = 2166136261;

    for (let i = 0; i < token.length; i += 1) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function pushCjkTokens(tokens, text) {
    const segments = text.match(/[\u3400-\u9fff]+/g) || [];

    segments.forEach((segment) => {
        const chars = [...segment];
        tokens.push(...chars);

        for (let i = 0; i < chars.length - 1; i += 1) {
            tokens.push(`${chars[i]}${chars[i + 1]}`);
        }
    });
}

function tokenize(text) {
    const normalized = text.toLowerCase().replace(/[_-]/g, " ");
    const tokens = normalized.match(/[a-z0-9]+/g) || [];

    pushCjkTokens(tokens, normalized);
    return tokens;
}

function embedText(text) {
    const vector = new Array(VECTOR_SIZE).fill(0);
    const tokens = tokenize(text);

    tokens.forEach((token) => {
        const hash = hashToken(token);
        const index = hash % VECTOR_SIZE;
        const sign = hash & 1 ? 1 : -1;
        vector[index] += sign;
    });

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));

    if (norm === 0) {
        vector[0] = 1;
        return vector;
    }

    return vector.map((value) => value / norm);
}

export class HashEmbeddings {
    async embedDocuments(documents) {
        return documents.map((document) => embedText(document));
    }

    async embedQuery(document) {
        return embedText(document);
    }
}
