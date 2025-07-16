import { FC, useCallback, useEffect } from 'react';
import React from 'react';

import { Box, Text, useApp } from 'ink';
import { exit } from 'process';

interface SuccessProps {
    message: string | string[];
}

export const Success: FC<SuccessProps> = ({ message }) => {
    const lines = Array.isArray(message) ? message : [message];

    return (
        <Box flexDirection='column'>
            {lines.map((line, index) => (
                <Text
                    key={index}
                    color={'green'}
                >
                    {index === 0 ? 'SUCCESS: ' : ''}
                    {line}
                </Text>
            ))}
        </Box>
    );
};
