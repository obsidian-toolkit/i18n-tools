#!/usr/bin/env node
import { Command } from 'commander';
import { checkAllLocales } from './commands/check-locales/checkAllLocales';
import { checkOneLocale } from './commands/check-locales/checkOneLocale';
import { flat } from './commands/flat';
import { init } from './commands/init';
import { keysStats } from './commands/keyStats/keys-stats';
import { nest } from './commands/nest';
import { template } from './commands/template';
import { updateAllNested } from './commands/updateAllNested';
import { setRootFolder } from './utils/setRootFolder';
setRootFolder();
const program = new Command();
program
    .name('i18n-tool')
    .description('Locale management tool for translations')
    .version('0.1.0');
program.command('init').description('Init base locale structure').action(init);
program
    .command('nest')
    .argument('<locale>', 'locale code (e.g., en, ru, de)')
    .description('Convert flat JSON to nested TypeScript format')
    .action(nest);
program
    .command('nest-all')
    .description('Update nested TypeScript files for all locales from their flat.json')
    .action(updateAllNested);
program
    .command('flat')
    .argument('<locale>', 'locale code (e.g., en, ru, de)')
    .description('Convert nested TypeScript format to flat JSON')
    .action(flat);
program
    .command('template')
    .argument('<locale>', 'new locale code (e.g., de, fr, es)')
    .description('Create new locale template from en/flat.json')
    .action(template);
program
    .command('check-locale')
    .description('Check your locale status against en/flat.json')
    .argument('<locale>', 'Check your translation')
    .action(checkOneLocale);
program
    .command('check-locales')
    .description('Check all locales status against en/flat.json')
    .action(checkAllLocales);
program
    .command('keys-stats')
    .description('Show detailed statistics of translation keys across locales, including total, missing, and unused keys')
    .action(keysStats);
program.parse();
