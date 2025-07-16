import { CollectedKeyData } from './interfaces';

export type NestedObject = {
    [key: string]: string | string[] | NestedObject;
};

export type FlatObject = Record<string, string | string[]>;

export type Key = 'missed' | 'used' | 'unused';

export type KeyTypeData = Array<[string, CollectedKeyData]>;
