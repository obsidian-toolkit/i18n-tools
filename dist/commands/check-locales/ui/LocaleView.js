import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text, Box } from 'ink';
export const LocaleView = ({ data }) => {
    const { locales, enFlat } = data;
    const totalKeys = Object.keys(enFlat).length;
    if (locales.length === 0) {
        return _jsx(Text, { color: 'red', children: "\u274C No locale data found" });
    }
    const locale = locales[0];
    const statusIcon = locale.percentage >= 80 ? '✅' : locale.percentage >= 50 ? '🟡' : '🔴';
    return (_jsxs(Box, { flexDirection: 'column', children: [_jsxs(Text, { children: [statusIcon, " Locale ", locale.locale, ": ", locale.completed, "/", totalKeys, " keys (", locale.percentage, "%) ", statusIcon] }), locale.missing.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginTop: 1, children: [_jsxs(Text, { color: 'red', children: ["\u274C Missing keys (", locale.missing.length, "):"] }), locale.missing.slice(0, 10).map(([key]) => (_jsxs(Text, { color: 'gray', children: [' ', "- ", key] }, key))), locale.missing.length > 10 && (_jsxs(Text, { color: 'gray', children: [' ', "... and ", locale.missing.length - 10, " more"] }))] })), locale.untranslated.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginTop: 1, children: [_jsxs(Text, { color: 'yellow', children: ["\uD83D\uDD04 Untranslated values (", locale.untranslated.length, "):"] }), locale.untranslated.slice(0, 5).map(([key]) => (_jsxs(Text, { color: 'gray', children: [' ', "- ", key, ": \"", enFlat[key], "\""] }, key))), locale.untranslated.length > 5 && (_jsxs(Text, { color: 'gray', children: [' ', "... and ", locale.untranslated.length - 5, " more"] }))] })), locale.extra.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginTop: 1, children: [_jsxs(Text, { color: 'cyan', children: ["\u26A0\uFE0F Extra keys (", locale.extra.length, "):"] }), _jsxs(Text, { color: 'gray', children: [' ', locale.extra.map(([k]) => k).join(', ')] })] })), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { children: ["\uD83D\uDCCA Summary: ", locale.locale, ": ", locale.completed, "/", totalKeys, ' ', "(", locale.percentage, "%)"] }) })] }));
};
