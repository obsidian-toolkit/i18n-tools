export function nestToFlat(nested) {
    const result = {};
    function traverse(obj, path = '') {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (Array.isArray(value)) {
                result[currentPath] = value;
            }
            else if (typeof value === 'object' && value !== null) {
                traverse(value, currentPath);
            }
            else if (typeof value === 'string') {
                result[currentPath] = value;
            }
        }
    }
    traverse(nested);
    return result;
}
