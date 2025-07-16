import { existsSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
export class LocaleTransaction {
    localePaths = new Map();
    removeActions = [];
    constructor() {
        const paths = glob.sync('src/lang/locale/**/flat.json');
        for (const localePath of paths) {
            const locale = path.basename(path.dirname(localePath));
            this.localePaths.set(locale, localePath);
        }
    }
    remove(action) {
        this.removeActions.push(action);
    }
    commit() {
        for (const [locale, path] of this.localePaths) {
            const localeData = this.loadLocale(path);
            this.removeActions.forEach((action) => action(localeData));
            this.saveLocale(path, localeData);
        }
    }
    loadLocale(path) {
        if (!existsSync(path)) {
            throw new Error('Locale not found');
        }
        return JSON.parse(readFileSync(path, 'utf8'));
    }
    saveLocale(path, locale) {
        writeFileSync(path, JSON.stringify(locale, null, 2));
    }
}
