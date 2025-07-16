import React from 'react';

import { Text, Box } from 'ink';

import { LocaleStats } from '../../../types/interfaces';

interface AllLocalesViewProps {
    data: LocaleStats;
}

export const AllLocalesView: React.FC<AllLocalesViewProps> = ({ data }) => {
    const { locales, enFlat } = data;
    const totalKeys = Object.keys(enFlat).length;

    const sortedLocales = [...locales].sort(
        (a, b) => b.percentage - a.percentage
    );

    return (
        <Box flexDirection='column'>
            {/* Summary */}
            <Text>📊 Translation Progress Summary:</Text>
            <Text color='green'>
                {' '}
                English: {totalKeys}/{totalKeys} (100%) ✅
            </Text>

            {sortedLocales.map((locale) => {
                const statusIcon =
                    locale.percentage >= 80
                        ? '✅'
                        : locale.percentage >= 50
                          ? '🟡'
                          : '🔴';
                const padding = ' '.repeat(
                    Math.max(0, 8 - locale.locale.length)
                );

                const issues = [];
                if (locale.missing.length > 0)
                    issues.push(`${locale.missing.length} missing`);
                if (locale.untranslated.length > 0)
                    issues.push(`${locale.untranslated.length} untranslated`);
                const issuesNote =
                    issues.length > 0 ? ` (${issues.join(', ')})` : '';

                return (
                    <Text key={locale.locale}>
                        {`  ${locale.locale}:${padding}${locale.completed}/${totalKeys} (${locale.percentage}%) ${statusIcon}${issuesNote}`}
                    </Text>
                );
            })}

            {/* Detailed stats */}
            <Box flexDirection='column'>
                <Text>📊 Translation Stats:</Text>
                <Text>{'═'.repeat(40)}</Text>
            </Box>

            {sortedLocales.map((locale) => (
                <LocaleDetailView
                    key={locale.locale}
                    locale={locale}
                    totalKeys={totalKeys}
                    enFlat={enFlat}
                />
            ))}
        </Box>
    );
};

interface LocaleDetailViewProps {
    locale: LocaleStats['locales'][0];
    totalKeys: number;
    enFlat: LocaleStats['enFlat'];
}

const LocaleDetailView: React.FC<LocaleDetailViewProps> = ({
    locale,
    totalKeys,
    enFlat,
}) => {
    const statusIcon =
        locale.percentage >= 80 ? '✅' : locale.percentage >= 50 ? '🟡' : '🔴';

    return (
        <Box
            flexDirection='column'
            marginBottom={1}
        >
            <Text>
                {statusIcon} Locale {locale.locale}: {locale.completed}/
                {totalKeys} keys ({locale.percentage}%) {statusIcon}
            </Text>

            {locale.missing.length > 0 && (
                <Box
                    flexDirection='column'
                    marginLeft={2}
                >
                    <Text color='red'>
                        ❌ Missing keys ({locale.missing.length}):
                    </Text>
                    {/* Group by section */}
                    <MissingKeysView missing={locale.missing} />
                </Box>
            )}

            {locale.untranslated.length > 0 && (
                <Box
                    flexDirection='column'
                    marginLeft={2}
                >
                    <Text color='yellow'>
                        🔄 Untranslated values ({locale.untranslated.length}):
                    </Text>
                    {locale.untranslated.slice(0, 5).map(([key]) => (
                        <Text
                            key={key}
                            color='gray'
                        >
                            {' '}
                            - {key}: "{enFlat[key]}"
                        </Text>
                    ))}
                    {locale.untranslated.length > 5 && (
                        <Text color='gray'>
                            {' '}
                            ... and {locale.untranslated.length - 5} more
                        </Text>
                    )}
                </Box>
            )}

            {locale.extra.length > 0 && (
                <Box
                    flexDirection='column'
                    marginLeft={2}
                >
                    <Text color='cyan'>
                        ⚠️ Extra keys ({locale.extra.length}):
                    </Text>
                    <Text color='gray'>
                        {' '}
                        {locale.extra.map(([k]) => k).join(', ')}
                    </Text>
                </Box>
            )}
        </Box>
    );
};

const MissingKeysView: React.FC<{ missing: [string, string | string[]][] }> = ({
    missing,
}) => {
    const keysBySection = new Map<string, string[]>();

    missing.forEach(([key]) => {
        const section = key.split('.').slice(0, 2).join('.');
        if (!keysBySection.has(section)) {
            keysBySection.set(section, []);
        }
        keysBySection.get(section)!.push(key);
    });

    return (
        <Box flexDirection='column'>
            {Array.from(keysBySection.entries()).map(([section, keys]) => {
                if (keys.length === 1) {
                    return (
                        <Text
                            key={section}
                            color='gray'
                        >
                            {' '}
                            - {keys[0]}
                        </Text>
                    );
                } else if (keys.length <= 3) {
                    return (
                        <Box
                            key={section}
                            flexDirection='column'
                        >
                            {keys.map((key) => (
                                <Text
                                    key={key}
                                    color='gray'
                                >
                                    {' '}
                                    - {key}
                                </Text>
                            ))}
                        </Box>
                    );
                } else {
                    return (
                        <Box
                            key={section}
                            flexDirection='column'
                        >
                            <Text color='gray'>
                                {' '}
                                - {section}.* ({keys.length} keys missing)
                            </Text>
                            <Text color='gray'>
                                {' '}
                                Examples:{' '}
                                {keys
                                    .slice(0, 2)
                                    .map((k) => k.split('.').pop())
                                    .join(', ')}
                                ...
                            </Text>
                        </Box>
                    );
                }
            })}
        </Box>
    );
};
