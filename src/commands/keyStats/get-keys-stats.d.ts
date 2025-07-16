import { FlatObject } from '../../types/definitions';
import { LocaleTransaction } from './locale-transaction';
export declare function getLangStatsData(): AsyncGenerator<{
    key: string;
    value: string | string[];
    ctx: string;
    filePath: string;
    actions: {
        remove: () => void;
    };
    transaction: undefined;
} | {
    key: string;
    value: string | string[];
    ctx: undefined;
    filePath: undefined;
    actions: {
        remove: (localeData: FlatObject) => void;
    };
    transaction: LocaleTransaction;
}, void, any>;
