import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export const Success = ({ message }) => {
    const lines = Array.isArray(message) ? message : [message];
    return (_jsx(Box, { flexDirection: 'column', children: lines.map((line, index) => (_jsxs(Text, { color: 'green', children: [index === 0 ? 'SUCCESS: ' : '', line] }, index))) }));
};
