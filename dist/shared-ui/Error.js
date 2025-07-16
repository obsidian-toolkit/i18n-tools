import { jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect } from 'react';
import { Text, useApp } from 'ink';
export const Error = ({ message, exitApp = true }) => {
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
    return _jsxs(Text, { color: 'red', children: ["ERROR: ", message] });
};
