import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import highlight from 'cli-highlight';
import { Box, render, Text, useApp, useInput } from 'ink';

import { CollectedData, LocaleKeyData } from '../../types/interfaces';
import { collectKeysStats } from './collect-keys-stats';

type Screen = 'main' | 'unused' | 'missed';

interface AppState {
    screen: Screen;
    collectedData: CollectedData | null;
    currentItems: LocaleKeyData[];
    loading: boolean;
    processing: boolean;
    message: string;
}

const clearConsole = () => {
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
};

const MainScreen: React.FC<{
    data: CollectedData;
    message: string;
    selectedIndex: number;
    onNavigate: (screen: Screen) => void;
    onRefresh: () => void;
    onExit: () => void;
}> = ({ data, message, selectedIndex, onNavigate, onRefresh, onExit }) => {
    const usedPercent = ((data.usedKeysCount / data.totalKeys) * 100).toFixed(
        1
    );
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

    return (
        <Box flexDirection='column'>
            <Text>📊 Language Statistics</Text>
            <Text>{'═'.repeat(40)}</Text>
            <Text>🔑 Total keys: {data.totalKeys}</Text>
            <Text>📈 Total usages: {data.keysUsages}</Text>
            <Text>🟢 Used keys: {data.usedKeysCount}</Text>
            <Text>🔴 Unused keys: {data.unusedKeys}</Text>
            <Text>🟡 Missed keys: {data.missedKeys}</Text>
            <Text>
                📊 Usage: {usedPercent}% | Unused: {unusedPercent}%
            </Text>

            {message && <Text color='green'>{message}</Text>}

            <Text> </Text>

            <Box flexDirection='column'>
                <Text>Actions:</Text>
                {menuItems.map((item, index) => (
                    <Text
                        key={index}
                        color={
                            selectedIndex === index
                                ? 'cyan'
                                : item.disabled
                                  ? 'gray'
                                  : 'white'
                        }
                    >
                        {selectedIndex === index ? '> ' : '  '}
                        {item.label}
                    </Text>
                ))}
            </Box>

            <Box marginTop={1}>
                <Text dimColor>↑↓ Navigate • Enter: Select • Q/Esc: Exit</Text>
            </Box>
        </Box>
    );
};

const MissedScreen: React.FC<{
    items: LocaleKeyData[];
    selectedIndex: number;
    message: string;
    onAutoResolve: () => void;
    onInteractive: () => void;
    onBack: () => void;
}> = ({
    items,
    selectedIndex,
    message,
    onAutoResolve,
    onInteractive,
    onBack,
}) => {
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

    return (
        <Box flexDirection='column'>
            <Text>🟡 Missed Keys ({items.length})</Text>
            <Text>{'═'.repeat(40)}</Text>

            {message && <Text color='green'>{message}</Text>}

            <Box flexDirection='column'>
                <Text>Actions:</Text>
                {menuItems.map((item, index) => (
                    <Text
                        key={index}
                        color={
                            selectedIndex === index
                                ? 'cyan'
                                : item.disabled
                                  ? 'gray'
                                  : 'white'
                        }
                    >
                        {selectedIndex === index ? '> ' : '  '}
                        {item.label}
                    </Text>
                ))}
            </Box>

            <Box marginTop={1}>
                <Text dimColor>↑↓ Navigate • Enter: Select • Esc: Back</Text>
            </Box>
        </Box>
    );
};

const UnusedScreen: React.FC<{
    items: LocaleKeyData[];
    selectedIndex: number;
    message: string;
    onAutoResolve: () => void;
    onInteractive: () => void;
    onBack: () => void;
}> = ({
    items,
    selectedIndex,
    message,
    onAutoResolve,
    onInteractive,
    onBack,
}) => {
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

    return (
        <Box flexDirection='column'>
            <Text>🔴 Unused Keys ({items.length})</Text>
            <Text>{'═'.repeat(40)}</Text>

            {message && <Text color='green'>{message}</Text>}

            <Box flexDirection='column'>
                <Text>Actions:</Text>
                {menuItems.map((item, index) => (
                    <Text
                        key={index}
                        color={
                            selectedIndex === index
                                ? 'cyan'
                                : item.disabled
                                  ? 'gray'
                                  : 'white'
                        }
                    >
                        {selectedIndex === index ? '> ' : '  '}
                        {item.label}
                    </Text>
                ))}
            </Box>

            <Box marginTop={1}>
                <Text dimColor>↑↓ Navigate • Enter: Select • Esc: Back</Text>
            </Box>
        </Box>
    );
};
interface InteractiveListProps {
    items: LocaleKeyData[];
    onRemove: (index: number) => void;
    onBack: () => void;
}

const InteractiveList: React.FC<InteractiveListProps> = ({
    items,
    onRemove,
    onBack,
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

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
            } else if (key.downArrow) {
                setSelectedIndex((prev) =>
                    Math.min(items.length - 1, prev + 1)
                );
            } else if (key.return) {
                if (items.length > 0 && selectedIndex < items.length) {
                    setViewMode('detail');
                }
            } else if (key.escape) {
                onBack();
            }
        } else if (viewMode === 'detail') {
            if (input === 's' || input === 'S') {
                const nextIndex = selectedIndex + 1;
                if (nextIndex < items.length) {
                    setSelectedIndex(nextIndex);
                    setViewMode('list');
                } else {
                    onBack();
                }
            } else if (input === 'r' || input === 'R') {
                const currentIndex = selectedIndex;
                onRemove(currentIndex);
                setViewMode('list');
            } else if (key.escape) {
                setViewMode('list');
            }
        }
    });

    if (items.length === 0) {
        return (
            <Box
                flexDirection='column'
                alignItems='center'
                padding={2}
            >
                <Text color='green'>✅ No items remaining!</Text>
                <Text color='gray'>Press Esc to return</Text>
            </Box>
        );
    }

    const renderCodeContext = (ctx: string) => {
        try {
            return highlight(ctx, { language: 'typescript' });
        } catch (error) {
            return ctx;
        }
    };

    const renderValue = (value: string | string[]) => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return value;
    };

    if (selectedIndex >= items.length) {
        return (
            <Box
                flexDirection='column'
                alignItems='center'
                padding={2}
            >
                <Text color='red'>Index out of bounds</Text>
                <Text color='gray'>Press Esc to return</Text>
            </Box>
        );
    }

    if (viewMode === 'detail') {
        const item = items[selectedIndex];
        if (!item) {
            setViewMode('list');
            return null;
        }

        return (
            <Box
                flexDirection='column'
                padding={1}
            >
                <Text color='cyan'>
                    🔧 Item Details ({selectedIndex + 1}/{items.length})
                </Text>
                <Text color='gray'>{'═'.repeat(50)}</Text>

                <Box
                    flexDirection='column'
                    marginTop={1}
                >
                    <Box>
                        <Text color='blue'>Key: </Text>
                        <Text color='white'>{item.key}</Text>
                    </Box>

                    <Box marginTop={1}>
                        <Text color='blue'>Value: </Text>
                        <Text>{renderValue(item.value)}</Text>
                    </Box>

                    {item.filePath && (
                        <Box marginTop={1}>
                            <Text color='blue'>File: </Text>
                            <Text color='gray'>{item.filePath}</Text>
                        </Box>
                    )}

                    {item.ctx && (
                        <Box
                            flexDirection='column'
                            marginTop={1}
                        >
                            <Text color='blue'>Context:</Text>
                            <Box
                                marginLeft={2}
                                marginTop={1}
                                borderStyle='single'
                                borderColor='gray'
                            >
                                <Text>{renderCodeContext(item.ctx)}</Text>
                            </Box>
                        </Box>
                    )}
                </Box>

                <Text color='gray'>
                    S: Skip • R: Remove • Esc: Back to list
                </Text>
            </Box>
        );
    }

    return (
        <Box
            flexDirection='column'
            padding={1}
        >
            <Text color='cyan'>🔧 Interactive Mode ({items.length})</Text>
            <Text color='gray'>{'═'.repeat(40)}</Text>

            {items.slice(0, 15).map((item, index) => (
                <Box key={`${item.key}-${index}`}>
                    <Text color={index === selectedIndex ? 'yellow' : 'white'}>
                        {index === selectedIndex ? '> ' : '  '}
                        {item.key}
                    </Text>
                </Box>
            ))}

            {items.length > 15 && (
                <Text color='gray'>... and {items.length - 15} more</Text>
            )}

            <Text color='gray'>
                ↑↓ Navigate • Enter: View details • Esc: Back
            </Text>
        </Box>
    );
};

const App: React.FC = () => {
    const { exit: appExit } = useApp();
    const exit = useCallback(() => {
        clearConsole();
        appExit();
    }, [appExit]);

    const selectedIndexRef = useRef(0);
    const [state, setState] = useState<AppState>({
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

    const unused = useMemo(
        () =>
            state.collectedData
                ? Object.entries(state.collectedData.keys)
                      .filter(([, value]) => value.type === 'unused')
                      .map(([key, value]) => value.occurrences[0])
                : [],
        [state.collectedData]
    );

    const missed = useMemo(
        () =>
            state.collectedData
                ? Object.entries(state.collectedData.keys)
                      .filter(([, value]) => value.type === 'missed')
                      .map(([key, value]) => value.occurrences[0])
                : [],
        [state.collectedData]
    );

    const autoResolveUnused = useCallback(async () => {
        clearConsole();
        setState((prev) => ({
            ...prev,
            processing: true,
            message: 'Removing unused keys...',
        }));

        const transaction = unused[0]?.transaction;
        if (!transaction) return;

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

    const handleNavigation = useCallback(
        (screen: Screen) => {
            clearConsole();
            setState((prev) => ({ ...prev, screen }));
            selectedIndexRef.current = 0;
            forceRender();
        },
        [forceRender]
    );

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

    const handleInteractive = useCallback(
        (items: LocaleKeyData[]) => {
            clearConsole();
            setState((prev) => ({ ...prev, currentItems: items }));
            selectedIndexRef.current = 0;
            forceRender();
        },
        [forceRender]
    );

    const handleRemoveItem = useCallback(
        (index: number) => {
            const item = state.currentItems[index];
            if (!item) return;

            if (
                state.screen === 'unused' &&
                item.transaction &&
                item.actions?.remove
            ) {
                item.transaction.remove(item.actions.remove);
                item.transaction.commit();
            } else if (state.screen === 'missed' && item.actions?.remove) {
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
        },
        [state.currentItems, state.screen, forceRender]
    );

    const getMenuLength = useCallback(() => {
        if (state.screen === 'main') return 3;
        if (state.screen === 'unused' || state.screen === 'missed') {
            return state.currentItems.length > 0 ? 2 : 2;
        }
        return state.currentItems.length - 1;
    }, [state.screen, state.currentItems.length]);

    const handleMainScreenAction = useCallback(
        (index: number) => {
            switch (index) {
                case 0:
                    if (unused.length > 0) handleNavigation('unused');
                    break;
                case 1:
                    if (missed.length > 0) handleNavigation('missed');
                    break;
                case 2:
                    handleRefresh();
                    break;
                case 3:
                    exit();
                    break;
            }
        },
        [unused.length, missed.length, handleNavigation, handleRefresh, exit]
    );

    const handleUnusedScreenAction = useCallback(
        (index: number) => {
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
        },
        [
            state.currentItems.length,
            handleRemoveItem,
            autoResolveUnused,
            handleInteractive,
            unused,
            handleNavigation,
        ]
    );

    const handleMissedScreenAction = useCallback(
        (index: number) => {
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
        },
        [
            state.currentItems.length,
            handleRemoveItem,
            autoResolveMissed,
            handleInteractive,
            missed,
            handleNavigation,
        ]
    );

    const handleEscapeKey = useCallback(() => {
        if (state.screen === 'main') {
            exit();
        } else if (state.currentItems.length > 0) {
            clearConsole();
            setState((prev) => ({ ...prev, currentItems: [] }));
            selectedIndexRef.current = 0;
            forceRender();
        } else {
            clearConsole();
            setState((prev) => ({ ...prev, screen: 'main' }));
            selectedIndexRef.current = 0;
            forceRender();
        }
    }, [state.screen, state.currentItems.length, exit, forceRender]);

    const handleReturnKey = useCallback(() => {
        if (state.screen === 'main') {
            handleMainScreenAction(selectedIndexRef.current);
        } else if (state.screen === 'unused') {
            handleUnusedScreenAction(selectedIndexRef.current);
        } else if (state.screen === 'missed') {
            handleMissedScreenAction(selectedIndexRef.current);
        }
    }, [
        state.screen,
        handleMainScreenAction,
        handleUnusedScreenAction,
        handleMissedScreenAction,
    ]);

    useInput((input, key) => {
        if (state.processing || state.currentItems.length > 0) return;

        if (key.escape || input === 'q') {
            handleEscapeKey();
            return;
        }

        if (key.upArrow) {
            selectedIndexRef.current = Math.max(
                0,
                selectedIndexRef.current - 1
            );
            forceRender();
        } else if (key.downArrow) {
            selectedIndexRef.current = Math.min(
                getMenuLength(),
                selectedIndexRef.current + 1
            );
            forceRender();
        } else if (key.return) {
            handleReturnKey();
        }
    });

    if (state.loading) {
        return (
            <Box
                flexDirection='column'
                alignItems='center'
            >
                <Text>🔄 Loading data...</Text>
            </Box>
        );
    }

    if (state.processing) {
        return (
            <Box
                flexDirection='column'
                alignItems='center'
            >
                <Text>⚡ {state.message}</Text>
            </Box>
        );
    }

    if (!state.collectedData) {
        return <Text color='red'>Failed to load data</Text>;
    }

    if (state.currentItems.length > 0) {
        return (
            <InteractiveList
                items={state.currentItems}
                onRemove={handleRemoveItem}
                onBack={() =>
                    setState((prev) => ({ ...prev, currentItems: [] }))
                }
            />
        );
    }

    if (state.screen === 'main') {
        return (
            <MainScreen
                data={state.collectedData}
                message={state.message}
                selectedIndex={selectedIndexRef.current}
                onNavigate={handleNavigation}
                onRefresh={handleRefresh}
                onExit={exit}
            />
        );
    }

    if (state.screen === 'unused') {
        return (
            <UnusedScreen
                items={unused}
                selectedIndex={selectedIndexRef.current}
                message={state.message}
                onAutoResolve={autoResolveUnused}
                onInteractive={() => handleInteractive(unused)}
                onBack={() => handleNavigation('main')}
            />
        );
    }

    if (state.screen === 'missed') {
        return (
            <MissedScreen
                items={missed}
                selectedIndex={selectedIndexRef.current}
                message={state.message}
                onAutoResolve={autoResolveMissed}
                onInteractive={() => handleInteractive(missed)}
                onBack={() => handleNavigation('main')}
            />
        );
    }

    return null;
};
export function showStatsMenu() {
    render(<App />, { exitOnCtrlC: false });
}
