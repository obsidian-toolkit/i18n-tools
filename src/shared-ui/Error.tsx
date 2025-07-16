import { FC, useCallback, useEffect } from 'react';
import React from 'react';

import { Text, useApp } from 'ink';

interface ErrorProps {
    message: string;
    exitApp?: boolean;
}

export const Error: FC<ErrorProps> = ({ message, exitApp = true }) => {
    const { exit: closeApp } = useApp();

    const exit = useCallback(() => {
        process.exit(1);
        closeApp();
    }, []);

    useEffect(() => {
        if (exitApp) {
            setTimeout(() => exit(), 100);
        }
    }, [exit, exitApp]);

    return <Text color='red'>ERROR: {message}</Text>;
};
