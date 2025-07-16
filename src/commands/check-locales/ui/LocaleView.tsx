import React from 'react';

import { Text, Box } from 'ink';

import { LocaleStats } from '../../../types/interfaces';

interface LocaleViewProps {
    data: LocaleStats;
}

export const LocaleView: React.FC<LocaleViewProps> = ({ data }) => {
    const { locales, enFlat } = data;
    const totalKeys = Object.keys(enFlat).length;

    if (locales.length === 0) {
        return <Text color='red'>❌ No locale data found</Text>;
    }

    const locale = locales[0];
    const statusIcon =
        locale.percentage >= 80 ? '✅' : locale.percentage >= 50 ? '🟡' : '🔴';

    return (
        <Box flexDirection='column'>
            <Text>
                {statusIcon} Locale {locale.locale}: {locale.completed}/
                {totalKeys} keys ({locale.percentage}%) {statusIcon}
            </Text>

            {locale.missing.length > 0 && (
                <Box
                    flexDirection='column'
                    marginTop={1}
                >
                    <Text color='red'>
                        ❌ Missing keys ({locale.missing.length}):
                    </Text>
                    {locale.missing.slice(0, 10).map(([key]) => (
                        <Text
                            key={key}
                            color='gray'
                        >
                            {' '}
                            - {key}
                        </Text>
                    ))}
                    {locale.missing.length > 10 && (
                        <Text color='gray'>
                            {' '}
                            ... and {locale.missing.length - 10} more
                        </Text>
                    )}
                </Box>
            )}

            {locale.untranslated.length > 0 && (
                <Box
                    flexDirection='column'
                    marginTop={1}
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
                    marginTop={1}
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

            <Box marginTop={1}>
                <Text>
                    📊 Summary: {locale.locale}: {locale.completed}/{totalKeys}{' '}
                    ({locale.percentage}%)
                </Text>
            </Box>
        </Box>
    );
};
