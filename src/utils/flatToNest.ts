import { FlatObject, NestedObject } from '../types/definitions';

export function flatToNest(flat: FlatObject): NestedObject {
    const result: NestedObject = {};

    for (const [path, value] of Object.entries(flat)) {
        const keys = path.split('.');
        let current: any = result;

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
