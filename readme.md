# puz
A cli to convert and print .puz files

## Install

```
yarn install puz-cli
```


## puz pdf
```
puz pdf crossword.puz -o myCrossword.pdf
```
Converts a puz file to a pdf

`-o, --output` Choose the output file path, defaults to the same as the input  
`-d, --debugTemplate` Output the html file that is given to puppeteer


## puz print
```
puz print crossword.puz
```
Skip opening the pdf and go straight to print! (Brings up a dialogue for choosing the printer)  
_Note: currently using a pretty limited package for printing that probably only works on unix computers and requires a pdf to be created before printing._


## puz solution
```
puz answer crossword.puz
```
Logs the crossword's solution to the console.


## puz stats
```
puz stats crossword.puz
```
Log out the puz file's metadata

`--json` Log as plain json
