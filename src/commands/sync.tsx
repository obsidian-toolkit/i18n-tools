import { existsSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { render } from 'ink';
import { basename, dirname, join } from 'path';

import { LOCALE_DIR } from '../constants';
import { Error } from '../shared-ui/Error';
import { Success } from '../shared-ui/Success';
import { FlatObject } from '../types/definitions';

function processLocale(
    base: FlatObject,
    other: FlatObject,
    options: { dryRun?: boolean }
) {
    const baseKeys = new Set(Object.keys(base));
    const otherKeys = Object.keys(other);

    for (const key of baseKeys) {
        if (!other[key]) {
            if (options.dryRun) {
                console.log(`DRY RUN: found missed key ${key}. Adding...`);
            } else {
                other[key] = base[key];
            }
        }
    }

    for (const key of otherKeys) {
        if (!baseKeys.has(key)) {
            if (options.dryRun) {
                console.log(`DRY RUN: found mismatch key ${key}. Removing...`);
            } else {
                delete other[key];
            }
        }
    }
}

export async function sync(options: { dryRun?: boolean }) {
    const enPath = join(LOCALE_DIR, 'en');

    if (!existsSync(enPath)) {
        render(<Error message='En path is not exist!' />);
    }

    const enJsonPath = join(enPath, 'flat.json');

    if (!existsSync(enJsonPath)) {
        render(<Error message='En json path is not exist!' />);
    }

    const enLocale = JSON.parse(readFileSync(enJsonPath, 'utf8')) as FlatObject;

    const otherLocales = glob.sync('./src/lang/locale/!(en)/flat.json');

    let synced = 0;
    let errors = 0;

    if (options.dryRun) {
        console.log('DRY RUN: Would sync locales...');
    }

    for (const localePath of otherLocales) {
        const localeName = basename(dirname(localePath));

        try {
            const locale = JSON.parse(
                readFileSync(localePath, 'utf8')
            ) as FlatObject;

            if (options.dryRun) {
                console.log(`DRY RUN: processing locale ${localeName}...`);
            }

            processLocale(enLocale, locale, options);
            if (!options.dryRun) {
                writeFileSync(localePath, JSON.stringify(locale, null, 2));
            }
            synced++;
        } catch (err: any) {
            render(
                <Error
                    message={`Locale ${localeName} is not a valid json: ${err.message}`}
                />
            );
            errors++;
        }
    }

    if (errors === 0) {
        const message = options.dryRun
            ? `DRY RUN: Would sync ${synced} locales`
            : `Synced ${synced} locales`;
        render(<Success message={message} />);
    } else {
        render(<Error message={`${synced} synced, ${errors} failed`} />);
    }
}
