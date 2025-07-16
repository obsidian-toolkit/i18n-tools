import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import highlight from 'cli-highlight';
import { Box, render, Text, useApp, useInput } from 'ink';
import { collectKeysStats } from './collect-keys-stats';
const clearConsole = () => {
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
};
const MainScreen = ({ data, message, selectedIndex, onNavigate, onRefresh, onExit }) => {
    const usedPercent = ((data.usedKeysCount / data.totalKeys) * 100).toFixed(1);
    const unusedPercent = ((data.unusedKeys / data.totalKeys) * 100).toFixed(1);
    const menuItems = [
        {
            label: `Unused Keys (${data.unusedKeys})`,
            action: () => onNavigate('unused'),
            disabled: data.unusedKeys === 0,
        },
        {
            label: `Missed Keys (${data.missedKeys})`,
            action: () => onNavigate('missed'),
            disabled: data.missedKeys === 0,
        },
        { label: 'Refresh data', action: onRefresh, disabled: false },
        { label: 'Exit', action: onExit, disabled: false },
    ];
    return (_jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "\uD83D\uDCCA Language Statistics" }), _jsx(Text, { children: '═'.repeat(40) }), _jsxs(Text, { children: ["\uD83D\uDD11 Total keys: ", data.totalKeys] }), _jsxs(Text, { children: ["\uD83D\uDCC8 Total usages: ", data.keysUsages] }), _jsxs(Text, { children: ["\uD83D\uDFE2 Used keys: ", data.usedKeysCount] }), _jsxs(Text, { children: ["\uD83D\uDD34 Unused keys: ", data.unusedKeys] }), _jsxs(Text, { children: ["\uD83D\uDFE1 Missed keys: ", data.missedKeys] }), _jsxs(Text, { children: ["\uD83D\uDCCA Usage: ", usedPercent, "% | Unused: ", unusedPercent, "%"] }), message && _jsx(Text, { color: 'green', children: message }), _jsx(Text, { children: " " }), _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "Actions:" }), menuItems.map((item, index) => (_jsxs(Text, { color: selectedIndex === index
                            ? 'cyan'
                            : item.disabled
                                ? 'gray'
                                : 'white', children: [selectedIndex === index ? '> ' : '  ', item.label] }, index)))] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Q/Esc: Exit" }) })] }));
};
const MissedScreen = ({ items, selectedIndex, message, onAutoResolve, onInteractive, onBack, }) => {
    const menuItems = [
        {
            label: `Auto-resolve all (${items.length})`,
            action: onAutoResolve,
            disabled: items.length === 0,
        },
        {
            label: `Interactive resolve (${items.length})`,
            action: onInteractive,
            disabled: items.length === 0,
        },
        { label: 'Back to main', action: onBack, disabled: false },
    ];
    return (_jsxs(Box, { flexDirection: 'column', children: [_jsxs(Text, { children: ["\uD83D\uDFE1 Missed Keys (", items.length, ")"] }), _jsx(Text, { children: '═'.repeat(40) }), message && _jsx(Text, { color: 'green', children: message }), _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "Actions:" }), menuItems.map((item, index) => (_jsxs(Text, { color: selectedIndex === index
                            ? 'cyan'
                            : item.disabled
                                ? 'gray'
                                : 'white', children: [selectedIndex === index ? '> ' : '  ', item.label] }, index)))] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Esc: Back" }) })] }));
};
const UnusedScreen = ({ items, selectedIndex, message, onAutoResolve, onInteractive, onBack, }) => {
    const menuItems = [
        {
            label: `Auto-resolve all (${items.length})`,
            action: onAutoResolve,
            disabled: items.length === 0,
        },
        {
            label: `Interactive resolve (${items.length})`,
            action: onInteractive,
            disabled: items.length === 0,
        },
        { label: 'Back to main', action: onBack, disabled: false },
    ];
    return (_jsxs(Box, { flexDirection: 'column', children: [_jsxs(Text, { children: ["\uD83D\uDD34 Unused Keys (", items.length, ")"] }), _jsx(Text, { children: '═'.repeat(40) }), message && _jsx(Text, { color: 'green', children: message }), _jsxs(Box, { flexDirection: 'column', children: [_jsx(Text, { children: "Actions:" }), menuItems.map((item, index) => (_jsxs(Text, { color: selectedIndex === index
                            ? 'cyan'
                            : item.disabled
                                ? 'gray'
                                : 'white', children: [selectedIndex === index ? '> ' : '  ', item.label] }, index)))] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Esc: Back" }) })] }));
};
const InteractiveList = ({ items, onRemove, onBack, }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [viewMode, setViewMode] = useState('list');
    React.useEffect(() => {
        if (selectedIndex >= items.length && items.length > 0) {
            setSelectedIndex(items.length - 1);
        }
        if (items.length === 0) {
            onBack();
        }
    }, [items.length, selectedIndex, onBack]);
    useInput((input, key) => {
        if (viewMode === 'list') {
            if (key.upArrow) {
                setSelectedIndex((prev) => Math.max(0, prev - 1));
            }
            else if (key.downArrow) {
                setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
            }
            else if (key.return) {
                if (items.length > 0 && selectedIndex < items.length) {
                    setViewMode('detail');
                }
            }
            else if (key.escape) {
                onBack();
            }
        }
        else if (viewMode === 'detail') {
            if (input === 's' || input === 'S') {
                const nextIndex = selectedIndex + 1;
                if (nextIndex < items.length) {
                    setSelectedIndex(nextIndex);
                    setViewMode('list');
                }
                else {
                    onBack();
                }
            }
            else if (input === 'r' || input === 'R') {
                const currentIndex = selectedIndex;
                onRemove(currentIndex);
                setViewMode('list');
            }
            else if (key.escape) {
                setViewMode('list');
            }
        }
    });
    if (items.length === 0) {
        return (_jsxs(Box, { flexDirection: 'column', alignItems: 'center', padding: 2, children: [_jsx(Text, { color: 'green', children: "\u2705 No items remaining!" }), _jsx(Text, { color: 'gray', children: "Press Esc to return" })] }));
    }
    const renderCodeContext = (ctx) => {
        try {
            return highlight(ctx, { language: 'typescript' });
        }
        catch (error) {
            return ctx;
        }
    };
    const renderValue = (value) => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return value;
    };
    if (selectedIndex >= items.length) {
        return (_jsxs(Box, { flexDirection: 'column', alignItems: 'center', padding: 2, children: [_jsx(Text, { color: 'red', children: "Index out of bounds" }), _jsx(Text, { color: 'gray', children: "Press Esc to return" })] }));
    }
    if (viewMode === 'detail') {
        const item = items[selectedIndex];
        if (!item) {
            setViewMode('list');
            return null;
        }
        return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [_jsxs(Text, { color: 'cyan', children: ["\uD83D\uDD27 Item Details (", selectedIndex + 1, "/", items.length, ")"] }), _jsx(Text, { color: 'gray', children: '═'.repeat(50) }), _jsxs(Box, { flexDirection: 'column', marginTop: 1, children: [_jsxs(Box, { children: [_jsx(Text, { color: 'blue', children: "Key: " }), _jsx(Text, { color: 'white', children: item.key })] }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: 'blue', children: "Value: " }), _jsx(Text, { children: renderValue(item.value) })] }), item.filePath && (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: 'blue', children: "File: " }), _jsx(Text, { color: 'gray', children: item.filePath })] })), item.ctx && (_jsxs(Box, { flexDirection: 'column', marginTop: 1, children: [_jsx(Text, { color: 'blue', children: "Context:" }), _jsx(Box, { marginLeft: 2, marginTop: 1, borderStyle: 'single', borderColor: 'gray', children: _jsx(Text, { children: renderCodeContext(item.ctx) }) })] }))] }), _jsx(Text, { color: 'gray', children: "S: Skip \u2022 R: Remove \u2022 Esc: Back to list" })] }));
    }
    return (_jsxs(Box, { flexDirection: 'column', padding: 1, children: [_jsxs(Text, { color: 'cyan', children: ["\uD83D\uDD27 Interactive Mode (", items.length, ")"] }), _jsx(Text, { color: 'gray', children: '═'.repeat(40) }), items.slice(0, 15).map((item, index) => (_jsx(Box, { children: _jsxs(Text, { color: index === selectedIndex ? 'yellow' : 'white', children: [index === selectedIndex ? '> ' : '  ', item.key] }) }, `${item.key}-${index}`))), items.length > 15 && (_jsxs(Text, { color: 'gray', children: ["... and ", items.length - 15, " more"] })), _jsx(Text, { color: 'gray', children: "\u2191\u2193 Navigate \u2022 Enter: View details \u2022 Esc: Back" })] }));
};
const App = () => {
    const { exit: appExit } = useApp();
    const exit = useCallback(() => {
        clearConsole();
        appExit();
    }, [appExit]);
    const selectedIndexRef = useRef(0);
    const [state, setState] = useState({
        screen: 'main',
        collectedData: null,
        currentItems: [],
        loading: true,
        processing: false,
        message: '',
    });
    const [, forceUpdate] = useState({});
    const forceRender = useCallback(() => forceUpdate({}), []);
    useEffect(() => {
        clearConsole();
        collectKeysStats().then((data) => {
            setState((prev) => ({
                ...prev,
                collectedData: data,
                loading: false,
            }));
        });
    }, []);
    const unused = useMemo(() => state.collectedData
        ? Object.entries(state.collectedData.keys)
            .filter(([, value]) => value.type === 'unused')
            .map(([key, value]) => value.occurrences[0])
        : [], [state.collectedData]);
    const missed = useMemo(() => state.collectedData
        ? Object.entries(state.collectedData.keys)
            .filter(([, value]) => value.type === 'missed')
            .map(([key, value]) => value.occurrences[0])
        : [], [state.collectedData]);
    const autoResolveUnused = useCallback(async () => {
        clearConsole();
        setState((prev) => ({
            ...prev,
            processing: true,
            message: 'Removing unused keys...',
        }));
        const transaction = unused[0]?.transaction;
        if (!transaction)
            return;
        unused.forEach((item) => {
            if (item.actions?.remove) {
                transaction.remove(item.actions.remove);
            }
        });
        transaction.commit();
        setState((prev) => ({
            ...prev,
            processing: false,
            message: `Removed ${unused.length} unused keys`,
            screen: 'main',
        }));
        selectedIndexRef.current = 0;
        forceRender();
    }, [unused, forceRender]);
    const autoResolveMissed = useCallback(async () => {
        clearConsole();
        setState((prev) => ({
            ...prev,
            processing: true,
            message: 'Removing missed keys...',
        }));
        for (const item of missed) {
            if (item.actions?.remove) {
                item.actions.remove();
            }
        }
        setState((prev) => ({
            ...prev,
            processing: false,
            message: `Removed ${missed.length} missed keys`,
            screen: 'main',
        }));
        selectedIndexRef.current = 0;
        forceRender();
    }, [missed, forceRender]);
    const handleNavigation = useCallback((screen) => {
        clearConsole();
        setState((prev) => ({ ...prev, screen }));
        selectedIndexRef.current = 0;
        forceRender();
    }, [forceRender]);
    const handleRefresh = useCallback(() => {
        setState((prev) => ({ ...prev, loading: true, message: '' }));
        collectKeysStats().then((data) => {
            setState((prev) => ({
                ...prev,
                collectedData: data,
                loading: false,
            }));
        });
    }, []);
    const handleInteractive = useCallback((items) => {
        clearConsole();
        setState((prev) => ({ ...prev, currentItems: items }));
        selectedIndexRef.current = 0;
        forceRender();
    }, [forceRender]);
    const handleRemoveItem = useCallback((index) => {
        const item = state.currentItems[index];
        if (!item)
            return;
        if (state.screen === 'unused' &&
            item.transaction &&
            item.actions?.remove) {
            item.transaction.remove(item.actions.remove);
            item.transaction.commit();
        }
        else if (state.screen === 'missed' && item.actions?.remove) {
            item.actions.remove();
        }
        const newItems = state.currentItems.filter((_, i) => i !== index);
        setState((prev) => ({
            ...prev,
            currentItems: newItems,
            message: `Removed key: ${item.key}`,
        }));
        if (selectedIndexRef.current >= newItems.length) {
            selectedIndexRef.current = Math.max(0, newItems.length - 1);
        }
        forceRender();
    }, [state.currentItems, state.screen, forceRender]);
    const getMenuLength = useCallback(() => {
        if (state.screen === 'main')
            return 3;
        if (state.screen === 'unused' || state.screen === 'missed') {
            return state.currentItems.length > 0 ? 2 : 2;
        }
        return state.currentItems.length - 1;
    }, [state.screen, state.currentItems.length]);
    const handleMainScreenAction = useCallback((index) => {
        switch (index) {
            case 0:
                if (unused.length > 0)
                    handleNavigation('unused');
                break;
            case 1:
                if (missed.length > 0)
                    handleNavigation('missed');
                break;
            case 2:
                handleRefresh();
                break;
            case 3:
                exit();
                break;
        }
    }, [unused.length, missed.length, handleNavigation, handleRefresh, exit]);
    const handleUnusedScreenAction = useCallback((index) => {
        switch (index) {
            case 0:
                autoResolveUnused();
                break;
            case 1:
                handleInteractive(unused);
                break;
            case 2:
                handleNavigation('main');
                break;
        }
    }, [
        state.currentItems.length,
        handleRemoveItem,
        autoResolveUnused,
        handleInteractive,
        unused,
        handleNavigation,
    ]);
    const handleMissedScreenAction = useCallback((index) => {
        switch (index) {
            case 0:
                autoResolveMissed();
                break;
            case 1:
                handleInteractive(missed);
                break;
            case 2:
                handleNavigation('main');
                break;
        }
    }, [
        state.currentItems.length,
        handleRemoveItem,
        autoResolveMissed,
        handleInteractive,
        missed,
        handleNavigation,
    ]);
    const handleEscapeKey = useCallback(() => {
        if (state.screen === 'main') {
            exit();
        }
        else if (state.currentItems.length > 0) {
            clearConsole();
            setState((prev) => ({ ...prev, currentItems: [] }));
            selectedIndexRef.current = 0;
            forceRender();
        }
        else {
            clearConsole();
            setState((prev) => ({ ...prev, screen: 'main' }));
            selectedIndexRef.current = 0;
            forceRender();
        }
    }, [state.screen, state.currentItems.length, exit, forceRender]);
    const handleReturnKey = useCallback(() => {
        if (state.screen === 'main') {
            handleMainScreenAction(selectedIndexRef.current);
        }
        else if (state.screen === 'unused') {
            handleUnusedScreenAction(selectedIndexRef.current);
        }
        else if (state.screen === 'missed') {
            handleMissedScreenAction(selectedIndexRef.current);
        }
    }, [
        state.screen,
        handleMainScreenAction,
        handleUnusedScreenAction,
        handleMissedScreenAction,
    ]);
    useInput((input, key) => {
        if (state.processing || state.currentItems.length > 0)
            return;
        if (key.escape || input === 'q') {
            handleEscapeKey();
            return;
        }
        if (key.upArrow) {
            selectedIndexRef.current = Math.max(0, selectedIndexRef.current - 1);
            forceRender();
        }
        else if (key.downArrow) {
            selectedIndexRef.current = Math.min(getMenuLength(), selectedIndexRef.current + 1);
            forceRender();
        }
        else if (key.return) {
            handleReturnKey();
        }
    });
    if (state.loading) {
        return (_jsx(Box, { flexDirection: 'column', alignItems: 'center', children: _jsx(Text, { children: "\uD83D\uDD04 Loading data..." }) }));
    }
    if (state.processing) {
        return (_jsx(Box, { flexDirection: 'column', alignItems: 'center', children: _jsxs(Text, { children: ["\u26A1 ", state.message] }) }));
    }
    if (!state.collectedData) {
        return _jsx(Text, { color: 'red', children: "Failed to load data" });
    }
    if (state.currentItems.length > 0) {
        return (_jsx(InteractiveList, { items: state.currentItems, onRemove: handleRemoveItem, onBack: () => setState((prev) => ({ ...prev, currentItems: [] })) }));
    }
    if (state.screen === 'main') {
        return (_jsx(MainScreen, { data: state.collectedData, message: state.message, selectedIndex: selectedIndexRef.current, onNavigate: handleNavigation, onRefresh: handleRefresh, onExit: exit }));
    }
    if (state.screen === 'unused') {
        return (_jsx(UnusedScreen, { items: unused, selectedIndex: selectedIndexRef.current, message: state.message, onAutoResolve: autoResolveUnused, onInteractive: () => handleInteractive(unused), onBack: () => handleNavigation('main') }));
    }
    if (state.screen === 'missed') {
        return (_jsx(MissedScreen, { items: missed, selectedIndex: selectedIndexRef.current, message: state.message, onAutoResolve: autoResolveMissed, onInteractive: () => handleInteractive(missed), onBack: () => handleNavigation('main') }));
    }
    return null;
};
export function showStatsMenu() {
    render(_jsx(App, {}), { exitOnCtrlC: false });
}
