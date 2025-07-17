import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import { concat, from } from 'ix/iterable';
import { filter, flatMap, map, tap } from 'ix/iterable/operators';
import path, { basename } from 'path';
import { exit } from 'process';
import { ModuleKind, Node, Project, ScriptTarget, SyntaxKind } from 'ts-morph';

import { LOCALE_DIR } from '../../constants';
import { FlatObject } from '../../types/definitions';
import { LocaleTransaction } from './locale-transaction';

function getCtx(node: Node) {
    const sourceFile = node.getSourceFile();
    const text = sourceFile.getFullText();
    const lines = text.split('\n');

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

function getRelativePathFromNode(node: Node) {
    const filePath = node.getSourceFile().getFilePath();
    return path.relative(process.cwd(), filePath);
}

function getTopmostPropertyAccess(node: Node): Node {
    let current: undefined | Node = node;
    while (
        current?.getParent()?.getKind() === SyntaxKind.PropertyAccessExpression
    ) {
        current = current?.getParent();
    }
    return current!;
}

function getActionsForNode(node: Node) {
    return {
        remove: () => {
            const statement = node.getFirstAncestorByKind(
                SyntaxKind.ExpressionStatement
            );
            if (statement) {
                statement.remove();
                statement.getSourceFile().saveSync();
            } else {
                node.replaceWithText('undefined');
                node.getSourceFile().saveSync();
            }
        },
    };
}

function filteredFiles() {
    const exclude = new Set(['definitions.ts', 'interfaces.ts']);
    return glob.sync('src/**/*.{ts,tsx}').filter((file) => {
        return !exclude.has(basename(file));
    });
}

export async function* getLangStatsData() {
    const enLocalePath = path.join(LOCALE_DIR, 'en/flat.json');

    if (!existsSync(enLocalePath)) {
        console.log('No en locale exist!');
        exit(1);
    }

    const enLocale = JSON.parse(
        readFileSync(enLocalePath, 'utf8')
    ) as FlatObject;

    const transaction = new LocaleTransaction();

    const project = new Project({
        tsConfigFilePath: './tsconfig.json',
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
        useInMemoryFileSystem: false,
        compilerOptions: {
            allowSyntheticDefaultImports: true,
            target: ScriptTarget.ES2024,
            module: ModuleKind.ESNext,
        },
    });

    const usedKeys = new Set<string>();

    project.addSourceFilesAtPaths(filteredFiles());

    const keys = from(project.getSourceFiles()).pipe(
        flatMap((file) => file.getDescendants()),
        filter(
            (node) => node.getKind() === SyntaxKind.PropertyAccessExpression
        ),
        filter((node) => node === getTopmostPropertyAccess(node)),
        map((node) => ({
            fullPath: node.getText(false).replace(/\s+/g, ''),
            node: node,
        })),
        filter((nodeData) => nodeData.fullPath.startsWith('t.')),
        map(({ node, fullPath }) => ({
            node,
            key: fullPath.slice(2),
        })),
        tap(({ key }) => usedKeys.add(key)),
        map(({ node, key }) => ({
            key,
            value: enLocale[key],
            ctx: getCtx(node).join('\n'),
            filePath: getRelativePathFromNode(node),
            actions: getActionsForNode(node),
            transaction: undefined,
        }))
    );

    const unused = from(Object.keys(enLocale)).pipe(
        filter((key) => !usedKeys.has(key)),

        map((key) => ({
            key,
            value: enLocale[key],
            ctx: undefined,
            filePath: undefined,
            actions: {
                remove: (localeData: FlatObject) => {
                    delete localeData[key];
                },
            },
            transaction: transaction,
        }))
    );

    yield* concat(keys, unused);
}
