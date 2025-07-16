import { FlatObject } from '../../types/definitions';
export declare class LocaleTransaction {
    localePaths: Map<string, string>;
    removeActions: Array<(locale: FlatObject) => void>;
    constructor();
    remove(action: (locale: FlatObject) => void): void;
    commit(): void;
    private loadLocale;
    private saveLocale;
}
