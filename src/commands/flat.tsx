import { existsSync, writeFileSync } from 'fs';
import { render } from 'ink';
import { join } from 'path';

import { LOCALE_DIR } from '../constants';
import { Error } from '../shared-ui/Error';
import { Success } from '../shared-ui/Success';
import { getObjectFromTs } from '../utils/getObjectFromTs';
import { nestToFlat } from '../utils/nestToFlat';
import { sortObjectKeys } from '../utils/sortObjKeys';

export async function flat(locale: string) {
    const tsPath = join(LOCALE_DIR, `${locale}/index.ts`);
    const jsonPath = join(LOCALE_DIR, `${locale}/flat.json`);

    if (!existsSync(tsPath)) {
        await render(<Error message={`${tsPath} not found`} />).waitUntilExit();
    }

    try {
        const nested = await getObjectFromTs(tsPath);
        const sortedFlat = sortObjectKeys(nestToFlat(nested));

        writeFileSync(jsonPath, JSON.stringify(sortedFlat, null, 4));

        render(<Success message={`Generated ${jsonPath}`} />);
    } catch (error: any) {
        render(
            <Error message={`Failed to process ${locale}: ${error.message}`} />
        );
    }
}
