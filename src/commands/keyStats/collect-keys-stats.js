import { getLangStatsData } from './get-keys-stats';
export async function collectKeysStats() {
    const gen = getLangStatsData();
    const out = {
        keys: {},
        missedKeys: 0,
        totalKeys: 0,
        keysUsages: 0,
        unusedKeys: 0,
    };
    for await (const item of gen) {
        const key = item.key;
        if (!out.keys[key]) {
            out.keys[key] = { occurrences: [], usage: 0, type: 'used' };
            out.totalKeys++;
        }
        if (!item.value) {
            out.missedKeys++;
            out.keys[key].type = 'missed';
            out.keys[key].occurrences.push(item);
        }
        else if (item.ctx) {
            out.keysUsages++;
            out.keys[key].occurrences.push(item);
            out.keys[key].usage++;
        }
        else {
            out.unusedKeys++;
            out.keys[key].type = 'unused';
            out.keys[key].occurrences.push(item);
        }
    }
    out.usedKeysCount = Object.values(out.keys).filter((k) => k.type === 'used').length;
    return out;
}
