import { existsSync, readdirSync, readFileSync } from 'fs';
import { from } from 'ix/iterable';
import { filter, map } from 'ix/iterable/operators';
import { join } from 'path';

import { LOCALE_DIR } from '../../../constants';
import { FlatObject } from '../../../types/definitions';
import { LocaleStats } from '../../../types/interfaces';
import { getLocaleStats } from './getLocaleStats';

export async function getData(locale?: string) {
    const enFlatPath = join(LOCALE_DIR, 'en', 'flat.json');
    if (!existsSync(enFlatPath)) {
        console.error('❌ Error: en/flat.json not found');
        process.exit(1);
    }

    const enFlat: FlatObject = JSON.parse(
        readFileSync(enFlatPath, 'utf8')
    ) as FlatObject;
    const enMap = new Map(Object.entries(enFlat));
    const totalKeys = enMap.size;

    const locales = locale
        ? from([locale])
        : from(readdirSync(LOCALE_DIR, { withFileTypes: true })).pipe(
              filter((dirent) => dirent.isDirectory() && dirent.name !== 'en'),
              map((dirent) => dirent.name)
          );

    const results = { locales: [], enFlat: enFlat } as LocaleStats;

    for (const locale of locales) {
        const stat = await getLocaleStats(locale, enFlat);
        results.locales.push(stat);
    }

    return results;
}
