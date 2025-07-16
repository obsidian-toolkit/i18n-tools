import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { LOCALE_DIR } from '../../../constants';
import { FlatObject } from '../../../types/definitions';
import { LocaleStat } from '../../../types/interfaces';

export async function getLocaleStats(
    locale: string,
    enFlat: FlatObject
): Promise<LocaleStat> {
    const localeDir = join(LOCALE_DIR, locale);

    const jsonPath = join(localeDir, 'flat.json');

    if (!existsSync(jsonPath)) {
        console.warn(`⚠️ Warning: ${jsonPath} not found\n`);
        process.exit(1);
    }

    const enMap = new Map(Object.entries(enFlat));
    const totalKeys = enMap.size;

    try {
        const localeFlatData: FlatObject = JSON.parse(
            readFileSync(jsonPath, 'utf8')
        ) as FlatObject;
        const localeFlatMap = new Map(Object.entries(localeFlatData));

        const missingData = Array.from(enMap).filter(
            ([key, _]) => !localeFlatMap.has(key)
        );

        const extraData = Array.from(localeFlatMap).filter(
            ([key, _]) => !enMap.has(key)
        );

        const localeActualMap = Array.from(localeFlatMap).filter(([key, _]) =>
            enMap.has(key)
        );

        const untranslatedEntries = Array.from(localeActualMap).filter(
            ([key, value]) =>
                value === enFlat[key] ||
                ([value, enFlat[key]].every(Array.isArray) &&
                    JSON.stringify(value) === JSON.stringify(enFlat[key]))
        );

        const completed =
            totalKeys - missingData.length - untranslatedEntries.length;

        const percentage = Math.round((completed / totalKeys) * 100 * 10) / 10;

        return {
            locale,
            completed,
            missing: missingData,
            extra: extraData,
            untranslated: untranslatedEntries,
            percentage,
        };
    } catch (error) {
        console.error(`❌ Error validating ${jsonPath}:`, error);
        process.exit(1);
    }
}
