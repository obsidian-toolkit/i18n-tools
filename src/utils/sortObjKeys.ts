export function sortObjectKeys<T>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj;
    }

    if (obj !== null && typeof obj === 'object') {
        const sorted = {} as Record<string, any>;
        Object.keys(obj as Record<string, any>)
            .sort()
            .forEach((key) => {
                sorted[key] = sortObjectKeys((obj as Record<string, any>)[key]);
            });
        return sorted as T;
    }

    return obj;
}
