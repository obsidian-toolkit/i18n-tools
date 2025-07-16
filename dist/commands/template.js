import { jsx as _jsx } from "react/jsx-runtime";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { render } from 'ink';
import { join } from 'path';
import { LOCALE_DIR } from '../constants';
import { Error } from '../shared-ui/Error';
import { Success } from '../shared-ui/Success';
export async function template(locale) {
    const enLocaleDir = join(LOCALE_DIR, 'en');
    const enJsonPath = join(enLocaleDir, 'flat.json');
    if (!existsSync(enJsonPath)) {
        await render(_jsx(Error, { message: 'en/flat.json not found. Run "flat en" first.' })).waitUntilExit();
    }
    const newLocaleDir = join(LOCALE_DIR, locale);
    if (existsSync(newLocaleDir)) {
        await render(_jsx(Error, { message: `Locale "${locale}" already exists` })).waitUntilExit();
    }
    try {
        mkdirSync(newLocaleDir, { recursive: true });
        const enFlatData = JSON.parse(readFileSync(enJsonPath, 'utf8'));
        const newJsonPath = join(newLocaleDir, 'flat.json');
        writeFileSync(newJsonPath, JSON.stringify(enFlatData, null, 4));
        render(_jsx(Success, { message: [
                `Created locale template: ${newLocaleDir}/`,
                `📄 Files created:`,
                `   - flat.json (copy from en, ready for translation)`,
                `\n🚀 Next steps:`,
                `   1. Edit ${locale}/flat.json - translate the values`,
                `   2. Run: npm run locale nest ${locale}`,
                `   3. Test your translation in the app`,
            ] }));
    }
    catch (error) {
        render(_jsx(Error, { message: `${error.message}` }));
    }
}
