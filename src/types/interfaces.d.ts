import { LocaleTransaction } from '../commands/keyStats/locale-transaction';
import { FlatObject, Key } from './definitions';
export interface LocaleStat {
    locale: string;
    completed: number;
    missing: [string, string | string[]][];
    extra: [string, string | string[]][];
    untranslated: [string, string | string[]][];
    percentage: number;
}
export interface LocaleStats {
    locales: Array<LocaleStat>;
    enFlat: FlatObject;
}
export interface LocaleKeyData {
    key: string;
    value: string | string[];
    ctx: string | undefined;
    filePath: string | undefined;
    actions: {
        remove: (...args: any) => void;
    } | undefined;
    transaction: LocaleTransaction | undefined;
}
export interface CollectedKeyData {
    occurrences: Array<LocaleKeyData>;
    usage: number;
    type: Key;
}
export interface CollectedData {
    keys: {
        [key: LocaleKeyData['key']]: CollectedKeyData;
    };
    totalKeys: number;
    keysUsages: number;
    unusedKeys: number;
    usedKeysCount: number;
    missedKeys: number;
}
