import { join } from 'path';

export const LANG_DIR = './src/lang';
export const LOCALE_DIR = join(LANG_DIR, 'locale');
export const TYPES_DIR = join(LANG_DIR, 'types');
export const SCHEMA_FILE = join(TYPES_DIR, 'interfaces.ts');
