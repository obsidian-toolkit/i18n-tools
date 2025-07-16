import { readdirSync } from 'fs';
import { LOCALE_DIR } from '../constants';
import { nest } from './nest';
export async function updateAllNested() {
    const locales = readdirSync(LOCALE_DIR, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== '_types')
        .map((dirent) => dirent.name);
    for (const locale of locales) {
        try {
            await nest(locale);
            console.log(`✅ Updated nested structure for locale: ${locale}\n`);
        }
        catch (error) {
            console.error(`❌ Error updating locale ${locale}:`, error);
        }
    }
}
