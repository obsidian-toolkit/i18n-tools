import { existsSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

import { FlatObject } from '../../types/definitions';

export class LocaleTransaction {
    localePaths = new Map<string, string>(); // en = ./src/lang/locale/en/flat.json. and etc
    removeActions: Array<(locale: FlatObject) => void> = [];

    constructor() {
        const paths = glob.sync('src/lang/locale/**/flat.json');
        for (const localePath of paths) {
            const locale = path.basename(path.dirname(localePath));
            this.localePaths.set(locale, localePath);
        }
    }

    remove(action: (locale: FlatObject) => void) {
        this.removeActions.push(action);
    }

    commit() {
        for (const [locale, path] of this.localePaths) {
            const localeData = this.loadLocale(path);
            this.removeActions.forEach((action) => action(localeData));
            this.saveLocale(path, localeData);
        }
    }

    private loadLocale(path: string) {
        if (!existsSync(path)) {
            throw new Error('Locale not found');
        }
        return JSON.parse(readFileSync(path, 'utf8')) as FlatObject;
    }

    private saveLocale(path: string, locale: FlatObject) {
        writeFileSync(path, JSON.stringify(locale, null, 2));
    }
}
