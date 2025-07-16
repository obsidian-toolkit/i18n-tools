export function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
        return obj;
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj)
            .sort()
            .forEach((key) => {
            sorted[key] = sortObjectKeys(obj[key]);
        });
        return sorted;
    }
    return obj;
}
