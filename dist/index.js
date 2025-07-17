#!/usr/bin/env node
import { Command } from 'commander';
import { jsx, jsxs } from 'react/jsx-runtime';
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import highlight from 'cli-highlight';
import { render, useApp, useInput, Box, Text } from 'ink';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { glob } from 'glob';
import { from, concat } from 'ix/iterable';
import { flatMap, filter, map, tap } from 'ix/iterable/operators';
import path, { join, basename, dirname } from 'path';
import { exit } from 'process';
import { Project, ModuleKind, ScriptTarget, SyntaxKind } from 'ts-morph';
import chalk from 'chalk';
import path$1 from 'node:path';

const LANG_DIR = "./src/lang";
const LOCALE_DIR = join(LANG_DIR, "locale");
const TYPES_DIR = join(LANG_DIR, "types");
const SCHEMA_FILE = join(TYPES_DIR, "interfaces.ts");

class LocaleTransaction {
  localePaths = /* @__PURE__ */ new Map();
  // en = ./src/lang/locale/en/flat.json. and etc
  removeActions = [];
  constructor() {
    const paths = glob.sync("src/lang/locale/**/flat.json");
    for (const localePath of paths) {
      const locale = path.basename(path.dirname(localePath));
      this.localePaths.set(locale, localePath);
    }
  }
  remove(action) {
    this.removeActions.push(action);
  }
  commit() {
    for (const [locale, path2] of this.localePaths) {
      const localeData = this.loadLocale(path2);
      this.removeActions.forEach((action) => action(localeData));
      this.saveLocale(path2, localeData);
    }
  }
  loadLocale(path2) {
    if (!existsSync(path2)) {
      throw new Error("Locale not found");
    }
    return JSON.parse(readFileSync(path2, "utf8"));
  }
  saveLocale(path2, locale) {
    writeFileSync(path2, JSON.stringify(locale, null, 2));
  }
}

function getCtx(node) {
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText();
  const lines = text.split("\n");
  const startLine = node.getStartLineNumber() - 1;
  const endLine = node.getEndLineNumber() - 1;
  const contextStart = Math.max(0, startLine - 2);
  const contextEnd = Math.min(lines.length - 1, endLine + 2);
  let counter = contextStart + 1;
  return lines.slice(contextStart, contextEnd + 1).map((line) => {
    const replaced = `${counter}. ${line}`;
    counter++;
    return replaced;
  });
}
function getRelativePathFromNode(node) {
  const filePath = node.getSourceFile().getFilePath();
  return path.relative(process.cwd(), filePath);
}
function getTopmostPropertyAccess(node) {
  let current = node;
  while (current?.getParent()?.getKind() === SyntaxKind.PropertyAccessExpression) {
    current = current?.getParent();
  }
  return current;
}
function getActionsForNode(node) {
  return {
    remove: () => {
      const statement = node.getFirstAncestorByKind(
        SyntaxKind.ExpressionStatement
      );
      if (statement) {
        statement.remove();
        statement.getSourceFile().saveSync();
      } else {
        node.replaceWithText("undefined");
        node.getSourceFile().saveSync();
      }
    }
  };
}
function filteredFiles() {
  const exclude = /* @__PURE__ */ new Set(["definitions.ts", "interfaces.ts"]);
  return glob.sync("src/**/*.{ts,tsx}").filter((file) => {
    return !exclude.has(basename(file));
  });
}
async function* getLangStatsData() {
  const enLocalePath = path.join(LOCALE_DIR, "en/flat.json");
  if (!existsSync(enLocalePath)) {
    console.log("No en locale exist!");
    exit(1);
  }
  const enLocale = JSON.parse(
    readFileSync(enLocalePath, "utf8")
  );
  const transaction = new LocaleTransaction();
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    useInMemoryFileSystem: false,
    compilerOptions: {
      allowSyntheticDefaultImports: true,
      target: ScriptTarget.ES2024,
      module: ModuleKind.ESNext
    }
  });
  const usedKeys = /* @__PURE__ */ new Set();
  project.addSourceFilesAtPaths(filteredFiles());
  const keys = from(project.getSourceFiles()).pipe(
    flatMap((file) => file.getDescendants()),
    filter(
      (node) => node.getKind() === SyntaxKind.PropertyAccessExpression
    ),
    filter((node) => node === getTopmostPropertyAccess(node)),
    map((node) => ({
      fullPath: node.getText(false).replace(/\s+/g, ""),
      node
    })),
    filter((nodeData) => nodeData.fullPath.startsWith("t.")),
    map(({ node, fullPath }) => ({
      node,
      key: fullPath.slice(2)
    })),
    tap(({ key }) => usedKeys.add(key)),
    map(({ node, key }) => ({
      key,
      value: enLocale[key],
      ctx: getCtx(node).join("\n"),
      filePath: getRelativePathFromNode(node),
      actions: getActionsForNode(node),
      transaction: void 0
    }))
  );
  const unused = from(Object.keys(enLocale)).pipe(
    filter((key) => !usedKeys.has(key)),
    map((key) => ({
      key,
      value: enLocale[key],
      ctx: void 0,
      filePath: void 0,
      actions: {
        remove: (localeData) => {
          delete localeData[key];
        }
      },
      transaction
    }))
  );
  yield* concat(keys, unused);
}

async function collectKeysStats() {
  const gen = getLangStatsData();
  const out = {
    keys: {},
    missedKeys: 0,
    totalKeys: 0,
    keysUsages: 0,
    unusedKeys: 0
  };
  for await (const item of gen) {
    const key = item.key;
    if (!out.keys[key]) {
      out.keys[key] = { occurrences: [], usage: 0, type: "used" };
      out.totalKeys++;
    }
    if (!item.value) {
      out.missedKeys++;
      out.keys[key].type = "missed";
      out.keys[key].occurrences.push(item);
    } else if (item.ctx) {
      out.keysUsages++;
      out.keys[key].occurrences.push(item);
      out.keys[key].usage++;
    } else {
      out.unusedKeys++;
      out.keys[key].type = "unused";
      out.keys[key].occurrences.push(item);
    }
  }
  out.usedKeysCount = Object.values(out.keys).filter(
    (k) => k.type === "used"
  ).length;
  return out;
}

const clearConsole = () => {
  process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
};
const MainScreen = ({ data, message, selectedIndex, onNavigate, onRefresh, onExit }) => {
  const usedPercent = (data.usedKeysCount / data.totalKeys * 100).toFixed(
    1
  );
  const unusedPercent = (data.unusedKeys / data.totalKeys * 100).toFixed(1);
  const menuItems = [
    {
      label: `Unused Keys (${data.unusedKeys})`,
      action: () => onNavigate("unused"),
      disabled: data.unusedKeys === 0
    },
    {
      label: `Missed Keys (${data.missedKeys})`,
      action: () => onNavigate("missed"),
      disabled: data.missedKeys === 0
    },
    { label: "Refresh data", action: onRefresh, disabled: false },
    { label: "Exit", action: onExit, disabled: false }
  ];
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx(Text, { children: "\u{1F4CA} Language Statistics" }),
    /* @__PURE__ */ jsx(Text, { children: "\u2550".repeat(40) }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F511} Total keys: ",
      data.totalKeys
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F4C8} Total usages: ",
      data.keysUsages
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F7E2} Used keys: ",
      data.usedKeysCount
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F534} Unused keys: ",
      data.unusedKeys
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F7E1} Missed keys: ",
      data.missedKeys
    ] }),
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F4CA} Usage: ",
      usedPercent,
      "% | Unused: ",
      unusedPercent,
      "%"
    ] }),
    message && /* @__PURE__ */ jsx(Text, { color: "green", children: message }),
    /* @__PURE__ */ jsx(Text, { children: " " }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { children: "Actions:" }),
      menuItems.map((item, index) => /* @__PURE__ */ jsxs(
        Text,
        {
          color: selectedIndex === index ? "cyan" : item.disabled ? "gray" : "white",
          children: [
            selectedIndex === index ? "> " : "  ",
            item.label
          ]
        },
        index
      ))
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Q/Esc: Exit" }) })
  ] });
};
const MissedScreen = ({
  items,
  selectedIndex,
  message,
  onAutoResolve,
  onInteractive,
  onBack
}) => {
  const menuItems = [
    {
      label: `Auto-resolve all (${items.length})`,
      action: onAutoResolve,
      disabled: items.length === 0
    },
    {
      label: `Interactive resolve (${items.length})`,
      action: onInteractive,
      disabled: items.length === 0
    },
    { label: "Back to main", action: onBack, disabled: false }
  ];
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F7E1} Missed Keys (",
      items.length,
      ")"
    ] }),
    /* @__PURE__ */ jsx(Text, { children: "\u2550".repeat(40) }),
    message && /* @__PURE__ */ jsx(Text, { color: "green", children: message }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { children: "Actions:" }),
      menuItems.map((item, index) => /* @__PURE__ */ jsxs(
        Text,
        {
          color: selectedIndex === index ? "cyan" : item.disabled ? "gray" : "white",
          children: [
            selectedIndex === index ? "> " : "  ",
            item.label
          ]
        },
        index
      ))
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Esc: Back" }) })
  ] });
};
const UnusedScreen = ({
  items,
  selectedIndex,
  message,
  onAutoResolve,
  onInteractive,
  onBack
}) => {
  const menuItems = [
    {
      label: `Auto-resolve all (${items.length})`,
      action: onAutoResolve,
      disabled: items.length === 0
    },
    {
      label: `Interactive resolve (${items.length})`,
      action: onInteractive,
      disabled: items.length === 0
    },
    { label: "Back to main", action: onBack, disabled: false }
  ];
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F534} Unused Keys (",
      items.length,
      ")"
    ] }),
    /* @__PURE__ */ jsx(Text, { children: "\u2550".repeat(40) }),
    message && /* @__PURE__ */ jsx(Text, { color: "green", children: message }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { children: "Actions:" }),
      menuItems.map((item, index) => /* @__PURE__ */ jsxs(
        Text,
        {
          color: selectedIndex === index ? "cyan" : item.disabled ? "gray" : "white",
          children: [
            selectedIndex === index ? "> " : "  ",
            item.label
          ]
        },
        index
      ))
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u2022 Enter: Select \u2022 Esc: Back" }) })
  ] });
};
const InteractiveList = ({
  items,
  onRemove,
  onBack
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState("list");
  React.useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(items.length - 1);
    }
    if (items.length === 0) {
      onBack();
    }
  }, [items.length, selectedIndex, onBack]);
  useInput((input, key) => {
    if (viewMode === "list") {
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(
          (prev) => Math.min(items.length - 1, prev + 1)
        );
      } else if (key.return) {
        if (items.length > 0 && selectedIndex < items.length) {
          setViewMode("detail");
        }
      } else if (key.escape) {
        onBack();
      }
    } else if (viewMode === "detail") {
      if (input === "s" || input === "S") {
        const nextIndex = selectedIndex + 1;
        if (nextIndex < items.length) {
          setSelectedIndex(nextIndex);
          setViewMode("list");
        } else {
          onBack();
        }
      } else if (input === "r" || input === "R") {
        const currentIndex = selectedIndex;
        onRemove(currentIndex);
        setViewMode("list");
      } else if (key.escape) {
        setViewMode("list");
      }
    }
  });
  if (items.length === 0) {
    return /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        alignItems: "center",
        padding: 2,
        children: [
          /* @__PURE__ */ jsx(Text, { color: "green", children: "\u2705 No items remaining!" }),
          /* @__PURE__ */ jsx(Text, { color: "gray", children: "Press Esc to return" })
        ]
      }
    );
  }
  const renderCodeContext = (ctx) => {
    try {
      return highlight(ctx, { language: "typescript" });
    } catch (error) {
      return ctx;
    }
  };
  const renderValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value;
  };
  if (selectedIndex >= items.length) {
    return /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        alignItems: "center",
        padding: 2,
        children: [
          /* @__PURE__ */ jsx(Text, { color: "red", children: "Index out of bounds" }),
          /* @__PURE__ */ jsx(Text, { color: "gray", children: "Press Esc to return" })
        ]
      }
    );
  }
  if (viewMode === "detail") {
    const item = items[selectedIndex];
    if (!item) {
      setViewMode("list");
      return null;
    }
    return /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        padding: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
            "\u{1F527} Item Details (",
            selectedIndex + 1,
            "/",
            items.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx(Text, { color: "gray", children: "\u2550".repeat(50) }),
          /* @__PURE__ */ jsxs(
            Box,
            {
              flexDirection: "column",
              marginTop: 1,
              children: [
                /* @__PURE__ */ jsxs(Box, { children: [
                  /* @__PURE__ */ jsx(Text, { color: "blue", children: "Key: " }),
                  /* @__PURE__ */ jsx(Text, { color: "white", children: item.key })
                ] }),
                /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
                  /* @__PURE__ */ jsx(Text, { color: "blue", children: "Value: " }),
                  /* @__PURE__ */ jsx(Text, { children: renderValue(item.value) })
                ] }),
                item.filePath && /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
                  /* @__PURE__ */ jsx(Text, { color: "blue", children: "File: " }),
                  /* @__PURE__ */ jsx(Text, { color: "gray", children: item.filePath })
                ] }),
                item.ctx && /* @__PURE__ */ jsxs(
                  Box,
                  {
                    flexDirection: "column",
                    marginTop: 1,
                    children: [
                      /* @__PURE__ */ jsx(Text, { color: "blue", children: "Context:" }),
                      /* @__PURE__ */ jsx(
                        Box,
                        {
                          marginLeft: 2,
                          marginTop: 1,
                          borderStyle: "single",
                          borderColor: "gray",
                          children: /* @__PURE__ */ jsx(Text, { children: renderCodeContext(item.ctx) })
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx(Text, { color: "gray", children: "S: Skip \u2022 R: Remove \u2022 Esc: Back to list" })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
          "\u{1F527} Interactive Mode (",
          items.length,
          ")"
        ] }),
        /* @__PURE__ */ jsx(Text, { color: "gray", children: "\u2550".repeat(40) }),
        items.slice(0, 15).map((item, index) => /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Text, { color: index === selectedIndex ? "yellow" : "white", children: [
          index === selectedIndex ? "> " : "  ",
          item.key
        ] }) }, `${item.key}-${index}`)),
        items.length > 15 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
          "... and ",
          items.length - 15,
          " more"
        ] }),
        /* @__PURE__ */ jsx(Text, { color: "gray", children: "\u2191\u2193 Navigate \u2022 Enter: View details \u2022 Esc: Back" })
      ]
    }
  );
};
const App = () => {
  const { exit: appExit } = useApp();
  const exit = useCallback(() => {
    clearConsole();
    appExit();
  }, [appExit]);
  const selectedIndexRef = useRef(0);
  const [state, setState] = useState({
    screen: "main",
    collectedData: null,
    currentItems: [],
    loading: true,
    processing: false,
    message: ""
  });
  const [, forceUpdate] = useState({});
  const forceRender = useCallback(() => forceUpdate({}), []);
  useEffect(() => {
    clearConsole();
    collectKeysStats().then((data) => {
      setState((prev) => ({
        ...prev,
        collectedData: data,
        loading: false
      }));
    });
  }, []);
  const unused = useMemo(
    () => state.collectedData ? Object.entries(state.collectedData.keys).filter(([, value]) => value.type === "unused").map(([key, value]) => value.occurrences[0]) : [],
    [state.collectedData]
  );
  const missed = useMemo(
    () => state.collectedData ? Object.entries(state.collectedData.keys).filter(([, value]) => value.type === "missed").map(([key, value]) => value.occurrences[0]) : [],
    [state.collectedData]
  );
  const autoResolveUnused = useCallback(async () => {
    clearConsole();
    setState((prev) => ({
      ...prev,
      processing: true,
      message: "Removing unused keys..."
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
      screen: "main"
    }));
    selectedIndexRef.current = 0;
    forceRender();
  }, [unused, forceRender]);
  const autoResolveMissed = useCallback(async () => {
    clearConsole();
    setState((prev) => ({
      ...prev,
      processing: true,
      message: "Removing missed keys..."
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
      screen: "main"
    }));
    selectedIndexRef.current = 0;
    forceRender();
  }, [missed, forceRender]);
  const handleNavigation = useCallback(
    (screen) => {
      clearConsole();
      setState((prev) => ({ ...prev, screen }));
      selectedIndexRef.current = 0;
      forceRender();
    },
    [forceRender]
  );
  const handleRefresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, message: "" }));
    collectKeysStats().then((data) => {
      setState((prev) => ({
        ...prev,
        collectedData: data,
        loading: false
      }));
    });
  }, []);
  const handleInteractive = useCallback(
    (items) => {
      clearConsole();
      setState((prev) => ({ ...prev, currentItems: items }));
      selectedIndexRef.current = 0;
      forceRender();
    },
    [forceRender]
  );
  const handleRemoveItem = useCallback(
    (index) => {
      const item = state.currentItems[index];
      if (!item) return;
      if (state.screen === "unused" && item.transaction && item.actions?.remove) {
        item.transaction.remove(item.actions.remove);
        item.transaction.commit();
      } else if (state.screen === "missed" && item.actions?.remove) {
        item.actions.remove();
      }
      const newItems = state.currentItems.filter((_, i) => i !== index);
      setState((prev) => ({
        ...prev,
        currentItems: newItems,
        message: `Removed key: ${item.key}`
      }));
      if (selectedIndexRef.current >= newItems.length) {
        selectedIndexRef.current = Math.max(0, newItems.length - 1);
      }
      forceRender();
    },
    [state.currentItems, state.screen, forceRender]
  );
  const getMenuLength = useCallback(() => {
    if (state.screen === "main") return 3;
    if (state.screen === "unused" || state.screen === "missed") {
      return state.currentItems.length > 0 ? 2 : 2;
    }
    return state.currentItems.length - 1;
  }, [state.screen, state.currentItems.length]);
  const handleMainScreenAction = useCallback(
    (index) => {
      switch (index) {
        case 0:
          if (unused.length > 0) handleNavigation("unused");
          break;
        case 1:
          if (missed.length > 0) handleNavigation("missed");
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
    (index) => {
      switch (index) {
        case 0:
          autoResolveUnused();
          break;
        case 1:
          handleInteractive(unused);
          break;
        case 2:
          handleNavigation("main");
          break;
      }
    },
    [
      state.currentItems.length,
      handleRemoveItem,
      autoResolveUnused,
      handleInteractive,
      unused,
      handleNavigation
    ]
  );
  const handleMissedScreenAction = useCallback(
    (index) => {
      switch (index) {
        case 0:
          autoResolveMissed();
          break;
        case 1:
          handleInteractive(missed);
          break;
        case 2:
          handleNavigation("main");
          break;
      }
    },
    [
      state.currentItems.length,
      handleRemoveItem,
      autoResolveMissed,
      handleInteractive,
      missed,
      handleNavigation
    ]
  );
  const handleEscapeKey = useCallback(() => {
    if (state.screen === "main") {
      exit();
    } else if (state.currentItems.length > 0) {
      clearConsole();
      setState((prev) => ({ ...prev, currentItems: [] }));
      selectedIndexRef.current = 0;
      forceRender();
    } else {
      clearConsole();
      setState((prev) => ({ ...prev, screen: "main" }));
      selectedIndexRef.current = 0;
      forceRender();
    }
  }, [state.screen, state.currentItems.length, exit, forceRender]);
  const handleReturnKey = useCallback(() => {
    if (state.screen === "main") {
      handleMainScreenAction(selectedIndexRef.current);
    } else if (state.screen === "unused") {
      handleUnusedScreenAction(selectedIndexRef.current);
    } else if (state.screen === "missed") {
      handleMissedScreenAction(selectedIndexRef.current);
    }
  }, [
    state.screen,
    handleMainScreenAction,
    handleUnusedScreenAction,
    handleMissedScreenAction
  ]);
  useInput((input, key) => {
    if (state.processing || state.currentItems.length > 0) return;
    if (key.escape || input === "q") {
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
    return /* @__PURE__ */ jsx(
      Box,
      {
        flexDirection: "column",
        alignItems: "center",
        children: /* @__PURE__ */ jsx(Text, { children: "\u{1F504} Loading data..." })
      }
    );
  }
  if (state.processing) {
    return /* @__PURE__ */ jsx(
      Box,
      {
        flexDirection: "column",
        alignItems: "center",
        children: /* @__PURE__ */ jsxs(Text, { children: [
          "\u26A1 ",
          state.message
        ] })
      }
    );
  }
  if (!state.collectedData) {
    return /* @__PURE__ */ jsx(Text, { color: "red", children: "Failed to load data" });
  }
  if (state.currentItems.length > 0) {
    return /* @__PURE__ */ jsx(
      InteractiveList,
      {
        items: state.currentItems,
        onRemove: handleRemoveItem,
        onBack: () => setState((prev) => ({ ...prev, currentItems: [] }))
      }
    );
  }
  if (state.screen === "main") {
    return /* @__PURE__ */ jsx(
      MainScreen,
      {
        data: state.collectedData,
        message: state.message,
        selectedIndex: selectedIndexRef.current,
        onNavigate: handleNavigation,
        onRefresh: handleRefresh,
        onExit: exit
      }
    );
  }
  if (state.screen === "unused") {
    return /* @__PURE__ */ jsx(
      UnusedScreen,
      {
        items: unused,
        selectedIndex: selectedIndexRef.current,
        message: state.message,
        onAutoResolve: autoResolveUnused,
        onInteractive: () => handleInteractive(unused),
        onBack: () => handleNavigation("main")
      }
    );
  }
  if (state.screen === "missed") {
    return /* @__PURE__ */ jsx(
      MissedScreen,
      {
        items: missed,
        selectedIndex: selectedIndexRef.current,
        message: state.message,
        onAutoResolve: autoResolveMissed,
        onInteractive: () => handleInteractive(missed),
        onBack: () => handleNavigation("main")
      }
    );
  }
  return null;
};
function showStatsMenu() {
  render(/* @__PURE__ */ jsx(App, {}), { exitOnCtrlC: false });
}

async function analyzeKeys() {
  showStatsMenu();
}

const AllLocalesView = ({ data }) => {
  const { locales, enFlat } = data;
  const totalKeys = Object.keys(enFlat).length;
  const sortedLocales = [...locales].sort(
    (a, b) => b.percentage - a.percentage
  );
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx(Text, { children: "\u{1F4CA} Translation Progress Summary:" }),
    /* @__PURE__ */ jsxs(Text, { color: "green", children: [
      " ",
      "English: ",
      totalKeys,
      "/",
      totalKeys,
      " (100%) \u2705"
    ] }),
    sortedLocales.map((locale) => {
      const statusIcon = locale.percentage >= 80 ? "\u2705" : locale.percentage >= 50 ? "\u{1F7E1}" : "\u{1F534}";
      const padding = " ".repeat(
        Math.max(0, 8 - locale.locale.length)
      );
      const issues = [];
      if (locale.missing.length > 0)
        issues.push(`${locale.missing.length} missing`);
      if (locale.untranslated.length > 0)
        issues.push(`${locale.untranslated.length} untranslated`);
      const issuesNote = issues.length > 0 ? ` (${issues.join(", ")})` : "";
      return /* @__PURE__ */ jsx(Text, { children: `  ${locale.locale}:${padding}${locale.completed}/${totalKeys} (${locale.percentage}%) ${statusIcon}${issuesNote}` }, locale.locale);
    }),
    /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { children: "\u{1F4CA} Translation Stats:" }),
      /* @__PURE__ */ jsx(Text, { children: "\u2550".repeat(40) })
    ] }),
    sortedLocales.map((locale) => /* @__PURE__ */ jsx(
      LocaleDetailView,
      {
        locale,
        totalKeys,
        enFlat
      },
      locale.locale
    ))
  ] });
};
const LocaleDetailView = ({
  locale,
  totalKeys,
  enFlat
}) => {
  const statusIcon = locale.percentage >= 80 ? "\u2705" : locale.percentage >= 50 ? "\u{1F7E1}" : "\u{1F534}";
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        /* @__PURE__ */ jsxs(Text, { children: [
          statusIcon,
          " Locale ",
          locale.locale,
          ": ",
          locale.completed,
          "/",
          totalKeys,
          " keys (",
          locale.percentage,
          "%) ",
          statusIcon
        ] }),
        locale.missing.length > 0 && /* @__PURE__ */ jsxs(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              /* @__PURE__ */ jsxs(Text, { color: "red", children: [
                "\u274C Missing keys (",
                locale.missing.length,
                "):"
              ] }),
              /* @__PURE__ */ jsx(MissingKeysView, { missing: locale.missing })
            ]
          }
        ),
        locale.untranslated.length > 0 && /* @__PURE__ */ jsxs(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              /* @__PURE__ */ jsxs(Text, { color: "yellow", children: [
                "\u{1F504} Untranslated values (",
                locale.untranslated.length,
                "):"
              ] }),
              locale.untranslated.slice(0, 5).map(([key]) => /* @__PURE__ */ jsxs(
                Text,
                {
                  color: "gray",
                  children: [
                    " ",
                    "- ",
                    key,
                    ': "',
                    enFlat[key],
                    '"'
                  ]
                },
                key
              )),
              locale.untranslated.length > 5 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
                " ",
                "... and ",
                locale.untranslated.length - 5,
                " more"
              ] })
            ]
          }
        ),
        locale.extra.length > 0 && /* @__PURE__ */ jsxs(
          Box,
          {
            flexDirection: "column",
            marginLeft: 2,
            children: [
              /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
                "\u26A0\uFE0F Extra keys (",
                locale.extra.length,
                "):"
              ] }),
              /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
                " ",
                locale.extra.map(([k]) => k).join(", ")
              ] })
            ]
          }
        )
      ]
    }
  );
};
const MissingKeysView = ({
  missing
}) => {
  const keysBySection = /* @__PURE__ */ new Map();
  missing.forEach(([key]) => {
    const section = key.split(".").slice(0, 2).join(".");
    if (!keysBySection.has(section)) {
      keysBySection.set(section, []);
    }
    keysBySection.get(section).push(key);
  });
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: Array.from(keysBySection.entries()).map(([section, keys]) => {
    if (keys.length === 1) {
      return /* @__PURE__ */ jsxs(
        Text,
        {
          color: "gray",
          children: [
            " ",
            "- ",
            keys[0]
          ]
        },
        section
      );
    } else if (keys.length <= 3) {
      return /* @__PURE__ */ jsx(
        Box,
        {
          flexDirection: "column",
          children: keys.map((key) => /* @__PURE__ */ jsxs(
            Text,
            {
              color: "gray",
              children: [
                " ",
                "- ",
                key
              ]
            },
            key
          ))
        },
        section
      );
    } else {
      return /* @__PURE__ */ jsxs(
        Box,
        {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
              " ",
              "- ",
              section,
              ".* (",
              keys.length,
              " keys missing)"
            ] }),
            /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
              " ",
              "Examples:",
              " ",
              keys.slice(0, 2).map((k) => k.split(".").pop()).join(", "),
              "..."
            ] })
          ]
        },
        section
      );
    }
  }) });
};

async function getLocaleStats(locale, enFlat) {
  const localeDir = join(LOCALE_DIR, locale);
  const jsonPath = join(localeDir, "flat.json");
  if (!existsSync(jsonPath)) {
    console.warn(`\u26A0\uFE0F Warning: ${jsonPath} not found
`);
    process.exit(1);
  }
  const enMap = new Map(Object.entries(enFlat));
  const totalKeys = enMap.size;
  try {
    const localeFlatData = JSON.parse(
      readFileSync(jsonPath, "utf8")
    );
    const localeFlatMap = new Map(Object.entries(localeFlatData));
    const missingData = Array.from(enMap).filter(
      ([key, _]) => !localeFlatMap.has(key)
    );
    const extraData = Array.from(localeFlatMap).filter(
      ([key, _]) => !enMap.has(key)
    );
    const localeActualMap = Array.from(localeFlatMap).filter(
      ([key, _]) => enMap.has(key)
    );
    const untranslatedEntries = Array.from(localeActualMap).filter(
      ([key, value]) => value === enFlat[key] || [value, enFlat[key]].every(Array.isArray) && JSON.stringify(value) === JSON.stringify(enFlat[key])
    );
    const completed = totalKeys - missingData.length - untranslatedEntries.length;
    const percentage = Math.round(completed / totalKeys * 100 * 10) / 10;
    return {
      locale,
      completed,
      missing: missingData,
      extra: extraData,
      untranslated: untranslatedEntries,
      percentage
    };
  } catch (error) {
    console.error(`\u274C Error validating ${jsonPath}:`, error);
    process.exit(1);
  }
}

async function getData(locale) {
  const enFlatPath = join(LOCALE_DIR, "en", "flat.json");
  if (!existsSync(enFlatPath)) {
    console.error("\u274C Error: en/flat.json not found");
    process.exit(1);
  }
  const enFlat = JSON.parse(
    readFileSync(enFlatPath, "utf8")
  );
  const enMap = new Map(Object.entries(enFlat));
  enMap.size;
  const locales = locale ? from([locale]) : from(readdirSync(LOCALE_DIR, { withFileTypes: true })).pipe(
    filter((dirent) => dirent.isDirectory() && dirent.name !== "en"),
    map((dirent) => dirent.name)
  );
  const results = { locales: [], enFlat };
  for (const locale2 of locales) {
    const stat = await getLocaleStats(locale2, enFlat);
    results.locales.push(stat);
  }
  return results;
}

async function checkAllLocales() {
  const data = await getData();
  render(/* @__PURE__ */ jsx(AllLocalesView, { data }));
}

const LocaleView = ({ data }) => {
  const { locales, enFlat } = data;
  const totalKeys = Object.keys(enFlat).length;
  if (locales.length === 0) {
    return /* @__PURE__ */ jsx(Text, { color: "red", children: "\u274C No locale data found" });
  }
  const locale = locales[0];
  const statusIcon = locale.percentage >= 80 ? "\u2705" : locale.percentage >= 50 ? "\u{1F7E1}" : "\u{1F534}";
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs(Text, { children: [
      statusIcon,
      " Locale ",
      locale.locale,
      ": ",
      locale.completed,
      "/",
      totalKeys,
      " keys (",
      locale.percentage,
      "%) ",
      statusIcon
    ] }),
    locale.missing.length > 0 && /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, { color: "red", children: [
            "\u274C Missing keys (",
            locale.missing.length,
            "):"
          ] }),
          locale.missing.slice(0, 10).map(([key]) => /* @__PURE__ */ jsxs(
            Text,
            {
              color: "gray",
              children: [
                " ",
                "- ",
                key
              ]
            },
            key
          )),
          locale.missing.length > 10 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
            " ",
            "... and ",
            locale.missing.length - 10,
            " more"
          ] })
        ]
      }
    ),
    locale.untranslated.length > 0 && /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, { color: "yellow", children: [
            "\u{1F504} Untranslated values (",
            locale.untranslated.length,
            "):"
          ] }),
          locale.untranslated.slice(0, 5).map(([key]) => /* @__PURE__ */ jsxs(
            Text,
            {
              color: "gray",
              children: [
                " ",
                "- ",
                key,
                ': "',
                enFlat[key],
                '"'
              ]
            },
            key
          )),
          locale.untranslated.length > 5 && /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
            " ",
            "... and ",
            locale.untranslated.length - 5,
            " more"
          ] })
        ]
      }
    ),
    locale.extra.length > 0 && /* @__PURE__ */ jsxs(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
        children: [
          /* @__PURE__ */ jsxs(Text, { color: "cyan", children: [
            "\u26A0\uFE0F Extra keys (",
            locale.extra.length,
            "):"
          ] }),
          /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
            " ",
            locale.extra.map(([k]) => k).join(", ")
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { children: [
      "\u{1F4CA} Summary: ",
      locale.locale,
      ": ",
      locale.completed,
      "/",
      totalKeys,
      " ",
      "(",
      locale.percentage,
      "%)"
    ] }) })
  ] });
};

async function checkOneLocale(locale = "ru") {
  const data = await getData(locale);
  render(/* @__PURE__ */ jsx(LocaleView, { data }));
}

const Error$1 = ({ message, exitApp = true }) => {
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
  return /* @__PURE__ */ jsxs(Text, { color: "red", children: [
    "ERROR: ",
    message
  ] });
};

const Success = ({ message }) => {
  const lines = Array.isArray(message) ? message : [message];
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: lines.map((line, index) => /* @__PURE__ */ jsxs(
    Text,
    {
      color: "green",
      children: [
        index === 0 ? "SUCCESS: " : "",
        line
      ]
    },
    index
  )) });
};

async function getObjectFromTs(tsPath) {
  const content = readFileSync(tsPath, "utf8");
  const objectRegex = /const\s+\w+\s*:\s*[^=]+=\s*(\{[\s\S]*?\});/;
  const match = content.match(objectRegex);
  if (!match) {
    throw new Error(`Object declaration not found in: ${tsPath}`);
  }
  try {
    const objectString = match[1];
    return eval(`(${objectString})`);
  } catch (err) {
    throw new Error(`Failed to parse object: ${err.message}`);
  }
}

function nestToFlat(nested) {
  const result = {};
  function traverse(obj, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (Array.isArray(value)) {
        result[currentPath] = value;
      } else if (typeof value === "object" && value !== null) {
        traverse(value, currentPath);
      } else if (typeof value === "string") {
        result[currentPath] = value;
      }
    }
  }
  traverse(nested);
  return result;
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }
  if (obj !== null && typeof obj === "object") {
    const sorted = {};
    Object.keys(obj).sort().forEach((key) => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
    return sorted;
  }
  return obj;
}

async function flat(locale) {
  const tsPath = join(LOCALE_DIR, `${locale}/index.ts`);
  const jsonPath = join(LOCALE_DIR, `${locale}/flat.json`);
  if (!existsSync(tsPath)) {
    await render(/* @__PURE__ */ jsx(Error$1, { message: `${tsPath} not found` })).waitUntilExit();
  }
  try {
    const nested = await getObjectFromTs(tsPath);
    const sortedFlat = sortObjectKeys(nestToFlat(nested));
    writeFileSync(jsonPath, JSON.stringify(sortedFlat, null, 4));
    render(/* @__PURE__ */ jsx(Success, { message: `Generated ${jsonPath}` }));
  } catch (error) {
    render(
      /* @__PURE__ */ jsx(Error$1, { message: `Failed to process ${locale}: ${error.message}` })
    );
  }
}

function init() {
  if (!existsSync(LANG_DIR)) {
    mkdirSync(LANG_DIR, { recursive: true });
  }
  if (!existsSync(TYPES_DIR)) {
    mkdirSync(TYPES_DIR, { recursive: true });
  }
  if (!existsSync(LOCALE_DIR)) {
    mkdirSync(LOCALE_DIR, { recursive: true });
    mkdirSync(join(LOCALE_DIR, "en"));
    writeFileSync(join(LOCALE_DIR, "en", "flat.json"), "");
  }
  if (!existsSync(SCHEMA_FILE)) {
    const interfaceContent = ``;
    writeFileSync(SCHEMA_FILE, interfaceContent);
  }
  render(
    /* @__PURE__ */ jsx(
      Success,
      {
        message: [
          "Lang structure created successfully:",
          "  ./src/lang/",
          "  \u251C\u2500\u2500 types/",
          "  \u2502   \u2514\u2500\u2500 interfaces.ts",
          "  \u2514\u2500\u2500 locale/",
          "      \u2514\u2500\u2500 en/",
          "          \u2514\u2500\u2500 flat.json"
        ]
      }
    )
  );
}

function flatToNest(flat) {
  const result = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(".");
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] ??= {};
      current = current[key];
    }
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }
  return result;
}

function generateTypes(nest) {
  const interfaceLines = [];
  function traverse(obj, indent = 1, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const indentStr = "    ".repeat(indent);
      const currentPath = path ? `${path}.${key}` : key;
      if (Array.isArray(value)) {
        interfaceLines.push(`${indentStr}${key}: string[];`);
      } else if (typeof value === "object" && value !== null) {
        interfaceLines.push(`${indentStr}${key}: {`);
        traverse(value, indent + 1, currentPath);
        interfaceLines.push(`${indentStr}};`);
      } else if (typeof value === "string") {
        interfaceLines.push(`${indentStr}${key}: string;`);
      }
    }
  }
  traverse(nest);
  return `export interface LocaleSchema {
${interfaceLines.join("\n")}
}`;
}
async function generateSchemaFromNest(nested) {
  try {
    const types = generateTypes(nested);
    if (!existsSync(TYPES_DIR)) {
      mkdirSync(TYPES_DIR, { recursive: true });
    }
    const typesContent = `
        /**
 * \u26A0\uFE0F AUTO-GENERATED FILE \u2014 DO NOT EDIT!
 *
 * This file was generated by the \`nest\` script from 'flat.json'.
 * To update it, run: \`npm run locale:nest <locale>\`
 */


${types}
`.trim();
    writeFileSync(SCHEMA_FILE, typesContent);
    await render(/* @__PURE__ */ jsx(Success, { message: `\u2705 Generated ${SCHEMA_FILE}` })).waitUntilExit();
  } catch (error) {
    render(/* @__PURE__ */ jsx(Error$1, { message: "\u274C Error generating types:" }));
  }
}

async function nest(locale) {
  const localeDir = join(LOCALE_DIR, locale);
  const jsonPath = join(localeDir, "flat.json");
  const tsPath = join(localeDir, "index.ts");
  if (!existsSync(jsonPath)) {
    render(/* @__PURE__ */ jsx(Error$1, { message: `${jsonPath} not found` }));
  }
  try {
    const flatData = JSON.parse(
      readFileSync(jsonPath, "utf8")
    );
    const sortedFlatData = sortObjectKeys(flatData);
    writeFileSync(jsonPath, JSON.stringify(sortedFlatData, null, 4));
    const nested = sortObjectKeys(flatToNest(sortedFlatData));
    const jsonString = JSON.stringify(nested, null, 4);
    const cleanJson = jsonString?.replace(
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
      "$1:"
    );
    const tsContent = `/**
 * \u26A0\uFE0F AUTO-GENERATED FILE \u2014 DO NOT EDIT!
 *
 * This file was generated by the \`nest\` script from 'flat.json'.
 * To update it, run: \`npm run locale:nest <locale>\`
 */
 
 
import type { LocaleSchema } from '../../types/interfaces';
${locale !== "en" ? `import { DeepPartial } from '../../types/definitions';
` : ""}
           
const Locale: ${locale !== "en" ? "DeepPartial<LocaleSchema>" : "LocaleSchema"}  = ${cleanJson};

export default Locale;`;
    writeFileSync(tsPath, tsContent);
    await render(/* @__PURE__ */ jsx(Success, { message: `\u2705 Generated ${tsPath}` })).waitUntilExit();
    if (locale === "en") {
      await generateSchemaFromNest(nested);
    }
    return;
  } catch (error) {
    render(/* @__PURE__ */ jsx(Error$1, { message: `${error.message}` }));
  }
}

function processLocale(base, other, options) {
  const baseKeys = new Set(Object.keys(base));
  const otherKeys = Object.keys(other);
  for (const key of baseKeys) {
    if (!other[key]) {
      if (options.dryRun) {
        console.log(`DRY RUN: found missed key ${key}. Adding...`);
      } else {
        other[key] = base[key];
      }
    }
  }
  for (const key of otherKeys) {
    if (!baseKeys.has(key)) {
      if (options.dryRun) {
        console.log(`DRY RUN: found mismatch key ${key}. Removing...`);
      } else {
        delete other[key];
      }
    }
  }
}
async function sync(options) {
  const enPath = join(LOCALE_DIR, "en");
  if (!existsSync(enPath)) {
    render(/* @__PURE__ */ jsx(Error$1, { message: "En path is not exist!" }));
  }
  const enJsonPath = join(enPath, "flat.json");
  if (!existsSync(enJsonPath)) {
    render(/* @__PURE__ */ jsx(Error$1, { message: "En json path is not exist!" }));
  }
  const enLocale = JSON.parse(readFileSync(enJsonPath, "utf8"));
  const otherLocales = glob.sync("./src/lang/locale/!(en)/flat.json");
  let synced = 0;
  let errors = 0;
  if (options.dryRun) {
    console.log("DRY RUN: Would sync locales...");
  }
  for (const localePath of otherLocales) {
    const localeName = basename(dirname(localePath));
    try {
      const locale = JSON.parse(
        readFileSync(localePath, "utf8")
      );
      if (options.dryRun) {
        console.log(`DRY RUN: processing locale ${localeName}...`);
      }
      processLocale(enLocale, locale, options);
      if (!options.dryRun) {
        writeFileSync(localePath, JSON.stringify(locale, null, 2));
      }
      synced++;
    } catch (err) {
      render(
        /* @__PURE__ */ jsx(
          Error$1,
          {
            message: `Locale ${localeName} is not a valid json: ${err.message}`
          }
        )
      );
      errors++;
    }
  }
  if (errors === 0) {
    const message = options.dryRun ? `DRY RUN: Would sync ${synced} locales` : `Synced ${synced} locales`;
    render(/* @__PURE__ */ jsx(Success, { message }));
  } else {
    render(/* @__PURE__ */ jsx(Error$1, { message: `${synced} synced, ${errors} failed` }));
  }
}

async function template(locale) {
  const enLocaleDir = join(LOCALE_DIR, "en");
  const enJsonPath = join(enLocaleDir, "flat.json");
  if (!existsSync(enJsonPath)) {
    await render(
      /* @__PURE__ */ jsx(Error$1, { message: 'en/flat.json not found. Run "flat en" first.' })
    ).waitUntilExit();
  }
  const newLocaleDir = join(LOCALE_DIR, locale);
  if (existsSync(newLocaleDir)) {
    await render(
      /* @__PURE__ */ jsx(Error$1, { message: `Locale "${locale}" already exists` })
    ).waitUntilExit();
  }
  try {
    mkdirSync(newLocaleDir, { recursive: true });
    const enFlatData = JSON.parse(readFileSync(enJsonPath, "utf8"));
    const newJsonPath = join(newLocaleDir, "flat.json");
    writeFileSync(newJsonPath, JSON.stringify(enFlatData, null, 4));
    render(
      /* @__PURE__ */ jsx(
        Success,
        {
          message: [
            `Created locale template: ${newLocaleDir}/`,
            `\u{1F4C4} Files created:`,
            `   - flat.json (copy from en, ready for translation)`,
            `
\u{1F680} Next steps:`,
            `   1. Edit ${locale}/flat.json - translate the values`,
            `   2. Run: npm run locale nest ${locale}`,
            `   3. Test your translation in the app`
          ]
        }
      )
    );
  } catch (error) {
    render(/* @__PURE__ */ jsx(Error$1, { message: `${error.message}` }));
  }
}

async function updateAllNested() {
  const locales = readdirSync(LOCALE_DIR, { withFileTypes: true }).filter((dirent) => dirent.isDirectory() && dirent.name !== "_types").map((dirent) => dirent.name);
  for (const locale of locales) {
    try {
      await nest(locale);
      console.log(`\u2705 Updated nested structure for locale: ${locale}
`);
    } catch (error) {
      console.error(`\u274C Error updating locale ${locale}:`, error);
    }
  }
}

function setRootFolder() {
  let current = process.cwd();
  while (true) {
    const pkg = path$1.join(current, "manifest.json");
    if (existsSync(pkg)) {
      process.chdir(current);
      return current;
    }
    const parent = path$1.dirname(current);
    if (parent === current) {
      console.log(
        chalk.red("package.json not found in any parent directories")
      );
      process.exit(1);
    }
    current = parent;
  }
}

setRootFolder();
const program = new Command();
program.name("i18n-tool").description("Locale management tool for translations").version("0.1.0");
program.command("init").description("Init base locale structure").action(init);
program.command("nest").argument("<locale>", "locale code (e.g., en, ru, de)").description("Convert flat JSON to nested TypeScript format").action(nest);
program.command("nest-all").description(
  "Update nested TypeScript files for all locales from their flat.json"
).action(updateAllNested);
program.command("flat").argument("<locale>", "locale code (e.g., en, ru, de)").description("Convert nested TypeScript format to flat JSON").action(flat);
program.command("template").argument("<locale>", "new locale code (e.g., de, fr, es)").description("Create new locale template from en/flat.json").action(template);
program.command("check-locale").description("Check your locale status against en/flat.json").argument("<locale>", "Check your translation").action(checkOneLocale);
program.command("check-locales").description("Check all locales status against en/flat.json").action(checkAllLocales);
program.command("analyze-keys").description(
  "Show detailed statistics of translation keys across locales, including total, missing, and unused keys"
).action(analyzeKeys);
program.command("sync").description(
  "Sync all locales with base locale (en): add missing keys, remove unused"
).option("-d, --dry-run", "Show what would be changed without applying").action(sync);
program.parse();
