export function flatToNest(flat) {
    const result = {};
    for (const [path, value] of Object.entries(flat)) {
        const keys = path.split('.');
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            current[key] ??= {};
            current = current[key];
        }
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
    }
    return result;
}
