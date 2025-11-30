#!/usr/bin/env node
import {Command} from 'commander';
import pkg from '../package.json' with {type: "json"};
import Puzzle from './Puzzle.js';
import {getPrinters, print} from 'unix-print';
import prompts from 'prompts';

const program = new Command('puz').description('cli to work with .puz files').version(pkg.version);

program
  .command('pdf <file>')
  .description('convert .puz to .pdf')
  .option('-o, --output <string>', 'output location')
  .option('-d, --debugTemplate', 'export pdf template as html')
  .action(async (file, {output, debugTemplate}) => {
    const puzzle = await Puzzle.fromFile(file);
    console.log(await puzzle.pdf({output, debugTemplate}));
  });

program
  .command('print <file>')
  .description('skip the pdf and go straight to the printer')
  .option('-o, --output <string>', 'output location')
  .action(async (file: string, {output}) => {
    try {
      const puzzle = await Puzzle.fromFile(file);
      const filepath = await puzzle.pdf({output});
      const printers = await getPrinters();
      const {printer} = await prompts([
        {
          type: 'select',
          name: 'printer',
          message: 'Which printer?',
          choices: printers.map((ii) => ({
            title: ii.description ?? '',
            value: ii.printer
          }))
        }
      ]);
      console.log('printing', filepath);
      await print(filepath, printer);
    } catch (e) {
      console.error(e);
    }
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
  .command('solution')
  .description('show the puzzle solution')
  .argument('<file>', '.puz file')
  .action(async (file) => {
    const puzzle = await Puzzle.fromFile(file);
    puzzle.printSolution();
  });

program.parse();
