import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text, Box } from 'ink';
export const AllLocalesView = ({ data }) => {
    const { locales, enFlat } = data;
    const totalKeys = Object.keys(enFlat).length;
    const sortedLocales = [...locales].sort((a, b) => b.percentage - a.percentage);
    return (_jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "\uD83D\uDCCA Translation Progress Summary:" }), _jsxs(Text, { color: 'green', children: [' ', "English: ", totalKeys, "/", totalKeys, " (100%) \u2705"] }), sortedLocales.map((locale) => {
                const statusIcon = locale.percentage >= 80
                    ? '✅'
                    : locale.percentage >= 50
                        ? '🟡'
                        : '🔴';
                const padding = ' '.repeat(Math.max(0, 8 - locale.locale.length));
                const issues = [];
                if (locale.missing.length > 0)
                    issues.push(`${locale.missing.length} missing`);
                if (locale.untranslated.length > 0)
                    issues.push(`${locale.untranslated.length} untranslated`);
                const issuesNote = issues.length > 0 ? ` (${issues.join(', ')})` : '';
                return (_jsx(Text, { children: `  ${locale.locale}:${padding}${locale.completed}/${totalKeys} (${locale.percentage}%) ${statusIcon}${issuesNote}` }, locale.locale));
            }), _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "\uD83D\uDCCA Translation Stats:" }), _jsx(Text, { children: '═'.repeat(40) })] }), sortedLocales.map((locale) => (_jsx(LocaleDetailView, { locale: locale, totalKeys: totalKeys, enFlat: enFlat }, locale.locale)))] }));
};
const LocaleDetailView = ({ locale, totalKeys, enFlat, }) => {
    const statusIcon = locale.percentage >= 80 ? '✅' : locale.percentage >= 50 ? '🟡' : '🔴';
    return (_jsxs(Box, { flexDirection: 'column', marginBottom: 1, children: [_jsxs(Text, { children: [statusIcon, " Locale ", locale.locale, ": ", locale.completed, "/", totalKeys, " keys (", locale.percentage, "%) ", statusIcon] }), locale.missing.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginLeft: 2, children: [_jsxs(Text, { color: 'red', children: ["\u274C Missing keys (", locale.missing.length, "):"] }), _jsx(MissingKeysView, { missing: locale.missing })] })), locale.untranslated.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginLeft: 2, children: [_jsxs(Text, { color: 'yellow', children: ["\uD83D\uDD04 Untranslated values (", locale.untranslated.length, "):"] }), locale.untranslated.slice(0, 5).map(([key]) => (_jsxs(Text, { color: 'gray', children: [' ', "- ", key, ": \"", enFlat[key], "\""] }, key))), locale.untranslated.length > 5 && (_jsxs(Text, { color: 'gray', children: [' ', "... and ", locale.untranslated.length - 5, " more"] }))] })), locale.extra.length > 0 && (_jsxs(Box, { flexDirection: 'column', marginLeft: 2, children: [_jsxs(Text, { color: 'cyan', children: ["\u26A0\uFE0F Extra keys (", locale.extra.length, "):"] }), _jsxs(Text, { color: 'gray', children: [' ', locale.extra.map(([k]) => k).join(', ')] })] }))] }));
};
const MissingKeysView = ({ missing, }) => {
    const keysBySection = new Map();
    missing.forEach(([key]) => {
        const section = key.split('.').slice(0, 2).join('.');
        if (!keysBySection.has(section)) {
            keysBySection.set(section, []);
        }
        keysBySection.get(section).push(key);
    });
    return (_jsx(Box, { flexDirection: 'column', children: Array.from(keysBySection.entries()).map(([section, keys]) => {
            if (keys.length === 1) {
                return (_jsxs(Text, { color: 'gray', children: [' ', "- ", keys[0]] }, section));
            }
            else if (keys.length <= 3) {
                return (_jsx(Box, { flexDirection: 'column', children: keys.map((key) => (_jsxs(Text, { color: 'gray', children: [' ', "- ", key] }, key))) }, section));
            }
            else {
                return (_jsxs(Box, { flexDirection: 'column', children: [_jsxs(Text, { color: 'gray', children: [' ', "- ", section, ".* (", keys.length, " keys missing)"] }), _jsxs(Text, { color: 'gray', children: [' ', "Examples:", ' ', keys
                                    .slice(0, 2)
                                    .map((k) => k.split('.').pop())
                                    .join(', '), "..."] })] }, section));
            }
        }) }));
};
