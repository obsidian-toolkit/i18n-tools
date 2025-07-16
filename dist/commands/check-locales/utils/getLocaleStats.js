import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { LOCALE_DIR } from '../../../constants';
export async function getLocaleStats(locale, enFlat) {
    const localeDir = join(LOCALE_DIR, locale);
    const jsonPath = join(localeDir, 'flat.json');
    if (!existsSync(jsonPath)) {
        console.warn(`⚠️ Warning: ${jsonPath} not found\n`);
        process.exit(1);
    }
    const enMap = new Map(Object.entries(enFlat));
    const totalKeys = enMap.size;
    try {
        const localeFlatData = JSON.parse(readFileSync(jsonPath, 'utf8'));
        const localeFlatMap = new Map(Object.entries(localeFlatData));
        const missingData = Array.from(enMap).filter(([key, _]) => !localeFlatMap.has(key));
        const extraData = Array.from(localeFlatMap).filter(([key, _]) => !enMap.has(key));
        const localeActualMap = Array.from(localeFlatMap).filter(([key, _]) => enMap.has(key));
        const untranslatedEntries = Array.from(localeActualMap).filter(([key, value]) => value === enFlat[key] ||
            ([value, enFlat[key]].every(Array.isArray) &&
                JSON.stringify(value) === JSON.stringify(enFlat[key])));
        const completed = totalKeys - missingData.length - untranslatedEntries.length;
        const percentage = Math.round((completed / totalKeys) * 100 * 10) / 10;
        return {
            locale,
            completed,
            missing: missingData,
            extra: extraData,
            untranslated: untranslatedEntries,
            percentage,
        };
    }
    catch (error) {
        console.error(`❌ Error validating ${jsonPath}:`, error);
        process.exit(1);
    }
}
