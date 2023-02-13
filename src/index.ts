#!/usr/bin/env node
import {Command} from 'commander';
import pkg from '../package.json';
import Puzzle from './Puzzle';

const program = new Command('puz').description('cli to work with .puz files').version(pkg.version);

program
    .command('pdf <file>')
    .description('convert .puz to .pdf')
    .option('-o, --output <string>', 'output location')
    .option('-d, --debugTemplate', 'export pdf template as html')
    .action(async (file, {output, debugTemplate}) => {
        const puzzle = await Puzzle.fromFile(file);
        await puzzle.pdf({output, debugTemplate});
    });

program
    .command('print <file>')
    .description('skip the pdf and go straight to the printer')
    .action((file: string, options) => {
        console.log('not sure how to print just yet');
    });

program
    .command('stats <file>')
    .description('print the puzzle details')
    .option('--json', 'output as json')
    .action(async (file, options) => {
        const puzzle = await Puzzle.fromFile(file);
        if (options.json) return console.log(JSON.stringify(puzzle.stats));
        console.log(puzzle.stats);
    });

program
    .command('answer')
    .description('show the puzzle solution')
    .argument('<file>', '.puz file')
    .action(async (file) => {
        const puzzle = await Puzzle.fromFile(file);
        puzzle.printSolution();
    });

program.parse();
