import { jsx as _jsx } from "react/jsx-runtime";
import { render } from 'ink';
import { LocaleView } from './ui/LocaleView';
import { getData } from './utils/getData';
export async function checkOneLocale(locale = 'ru') {
    const data = await getData(locale);
    render(_jsx(LocaleView, { data: data }));
}
