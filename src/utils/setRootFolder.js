import chalk from 'chalk';
import { existsSync } from 'fs';
import path from 'node:path';
export function setRootFolder() {
    let current = process.cwd();
    while (true) {
        const pkg = path.join(current, 'manifest.json');
        if (existsSync(pkg)) {
            process.chdir(current);
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            console.log(chalk.red('package.json not found in any parent directories'));
            process.exit(1);
        }
        current = parent;
    }
}
