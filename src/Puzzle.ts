import fs from 'fs';
import {parse, join} from 'path';
const {readFile, writeFile} = fs.promises;
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import path from 'path';

type PuzzleData = {
    down: string[];
    across: string[];
    fileName: string;
    board: Array<{black: boolean; number?: number}>;
    solution: Array<string>;
    title: string;
    author: string;
    copyright: string;
    notes: string;
    width: number;
    height: number;
    boardLength: number;
};

export default class Puzzle {
    data: PuzzleData;
    constructor(data: PuzzleData) {
        this.data = data;
    }

    static async fromFile(file: string) {
        // File
        const puz = await readFile(join(process.cwd(), file));
        const raw = new Uint8Array(puz);
        const text = new TextDecoder();
        const {name} = parse(file);

        // Properties
        const width = raw[0x2c];
        const height = raw[0x2d];
        const boardLength = width * height;

        // Board
        const boardStart = 0x34;
        const stateStart = boardStart + boardLength;
        const stringStart = stateStart + boardLength;
        const chunkRow = new RegExp(`.{${width}}`, 'g');
        const solution =
            text.decode(raw.slice(boardStart, boardStart + boardLength)).match(chunkRow) || [];
        //const state = text.decode(raw.slice(stateStart, stateStart + boardLength)).match(chunkRow);

        // Strings
        const [title, author, copyright, ...clues] = text
            .decode(raw.slice(stringStart))
            .split('\u0000')
            .filter((ii) => ii);
        const notes = clues.pop() ?? '';

        // Helpers
        function isBlack(x: number, y: number) {
            return solution[y][x] === '.';
        }

        function needsAcrossNumber(x: number, y: number) {
            // Check that there is no space to the left
            if (x === 0 || isBlack(x - 1, y)) {
                // Check that there is space (at least two cells) for a word here
                if (x + 2 < width && !isBlack(x + 1, y)) {
                    return true;
                }
            }
            return false;
        }

        function needsDownNumber(x: number, y: number) {
            // Check that there is no space above
            if (y === 0 || isBlack(x, y - 1)) {
                // Check that there is space (at least two cells) for a word here
                if (y + 2 < height && !isBlack(x, y + 1)) {
                    return true;
                }
            }
            return false;
        }

        //
        // Clues & Numbers
        const across: string[] = [];
        const down: string[] = [];
        const board: {
            black: boolean;
            number?: number;
        }[][] = [...Array(height)].map((_) => Array(width));

        let currentNumber = 1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isBlack(x, y)) {
                    board[y][x] = {black: true};
                    continue;
                }
                const needsDown = needsDownNumber(x, y);
                const needsAcross = needsAcrossNumber(x, y);

                board[y][x] = {black: false};
                if (needsAcross || needsDown) {
                    if (needsAcross) across[currentNumber] = clues.shift() ?? '';
                    if (needsDown) down[currentNumber] = clues.shift() ?? '';
                    board[y][x] = {black: false, number: currentNumber};
                    currentNumber++;
                }
            }
        }

        //
        // Pdf
        return new Puzzle({
            down,
            across,
            fileName: name,
            board: board.flat(1),
            solution,
            title,
            author,
            copyright,
            notes,
            width,
            height,
            boardLength
        });
    }

    get stats() {
        return {
            title: this.data.title,
            author: this.data.author,
            copyright: this.data.copyright,
            notes: this.data.notes,
            width: this.data.width,
            height: this.data.height,
            acrossClues: this.data.across.filter((ii) => ii).length,
            downClues: this.data.down.filter((ii) => ii).length,
            fileName: this.data.fileName
        };
    }

    async pdf(options: {output?: string; debugTemplate?: boolean} = {}) {
        const {output = `${this.data.fileName}.pdf`, debugTemplate} = options;
        const template = handlebars.compile(
            await readFile(path.join(__dirname, '../../src/template.hbs'), 'utf8')
        );
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const html = template(this.data);
        if (debugTemplate) await writeFile('template.html', html, 'utf8');

        await page.goto(`data:text/html;charset=UTF-8,${html}`);
        await page.pdf({
            path: output,
            format: 'A4',
            printBackground: true
        });
        await browser.close();
        return output;
    }

    printSolution() {
        console.log(this.data.solution.join('\n').replace(/\./g, ' ').replace(/(.)/g, '$1 '));
    }
}
