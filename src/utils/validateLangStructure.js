import { existsSync } from 'fs';
import { LANG_DIR, LOCALE_DIR, SCHEMA_FILE, TYPES_DIR } from '../constants';
function validateLangStructure() {
    const errors = [];
    if (!existsSync(LANG_DIR)) {
        errors.push(`Missing directory: ${LANG_DIR}`);
    }
    if (!existsSync(TYPES_DIR)) {
        errors.push(`Missing directory: ${TYPES_DIR}`);
    }
    if (!existsSync(LOCALE_DIR)) {
        errors.push(`Missing directory: ${LOCALE_DIR}`);
    }
    if (!existsSync(SCHEMA_FILE)) {
        errors.push(`Missing file: ${SCHEMA_FILE}`);
    }
    if (errors.length > 0) {
        console.warn('Lang structure validation failed:');
        errors.forEach((error) => console.warn(`  - ${error}`));
        console.warn('\nExpected structure:');
        console.warn('  ./src/lang/');
        console.warn('  ├── types/');
        console.warn('  │   └── interfaces.ts');
        console.warn('  └── locale/');
        console.log('\nRun with "init" option to create the structure automatically.');
        return false;
    }
    return true;
}
