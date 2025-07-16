import React from 'react';

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { render } from 'ink';
import { join } from 'path';

import { LANG_DIR, LOCALE_DIR, SCHEMA_FILE, TYPES_DIR } from '../constants';
import { Success } from '../shared-ui/Success';

export function init(): void {
    if (!existsSync(LANG_DIR)) {
        mkdirSync(LANG_DIR, { recursive: true });
    }

    if (!existsSync(TYPES_DIR)) {
        mkdirSync(TYPES_DIR, { recursive: true });
    }

    if (!existsSync(LOCALE_DIR)) {
        mkdirSync(LOCALE_DIR, { recursive: true });
        mkdirSync(join(LOCALE_DIR, 'en'));
        writeFileSync(join(LOCALE_DIR, 'en', 'flat.json'), '');
    }

    if (!existsSync(SCHEMA_FILE)) {
        const interfaceContent = ``;

        writeFileSync(SCHEMA_FILE, interfaceContent);
    }

    render(
        <Success
            message={[
                'Lang structure created successfully:',
                '  ./src/lang/',
                '  ├── types/',
                '  │   └── interfaces.ts',
                '  └── locale/',
                '      └── en/',
                '          └── flat.json',
            ]}
        />
    );
}
