import { render } from 'ink';

import { LocaleView } from './ui/LocaleView';
import { getData } from './utils/getData';

export async function checkOneLocale(locale: string = 'ru') {
    const data = await getData(locale);
    render(<LocaleView data={data} />);
}
