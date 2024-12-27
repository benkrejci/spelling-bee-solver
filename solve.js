#!/usr/bin/env node

const allWords = require('an-array-of-english-words')
const commonWords = require('wordlist-english')['english']

const input = process.argv[2]

if (!input || typeof(input) !== 'string' || input.length !== 7) {
  console.error(`Missing or invalid input; should be string containing 7 letters (where first letter is center)

Example: npx @benkrejci/spelling-bee-solver itapldu`)
  process.exit(1)
}

const letters = new Set(input)
const middle = input[0]

const commonMatches = [];
const obscureMatches = [];
const pangrams = [];

// this could be done faster by breaking out word lists into a trie or another structure which
// allows skipping of prefixes or even all words which contain a non-matching letter,
// but it's really not necessary given the size of the lists (the below loop usually completes in <100ms)
const start = +new Date()
for (let i = 0; i < allWords.length; i++) {
  const word = allWords[i]
  if (word.length < 4) continue
  let foundMiddle = false
  let disqualified = false
  const lettersFound = new Set()
  for (let j = 0; j < word.length; j++) {
    const letter = word[j]
    if (!letters.has(letter)) {
      disqualified = true
      break
    }
    lettersFound.add(letter)
    if (letter === middle) foundMiddle = true
  }
  if (!disqualified && foundMiddle) {
    if (lettersFound.size === letters.size) pangrams.push(word)
    else if (commonWords.includes(word)) commonMatches.push(word)
    else obscureMatches.push(word)
  }
}

const BOTTOM_BUFFER = 1
const PADDING_H = 3
const PADDING_V = 1

const termSize = require('term-size')()
let tableHeight = termSize.rows - BOTTOM_BUFFER

const intro = `Found ${pangrams.length} pangram${pangrams.length === 1 ? '' : 's'
}, ${commonMatches.length} "common" word${commonMatches.length === 1 ? '' : 's'
}, and ${obscureMatches.length} obscure word${obscureMatches.length === 1 ? '' : 's'}.`

console.log(intro)
console.log('')
tableHeight -= Math.ceil(intro.length / termSize.columns) + PADDING_V

sortWords(pangrams)
sortWords(commonMatches)
sortWords(obscureMatches)

columnate(['PANGRAMS', pangrams], ['COMMON WORDS', commonMatches], ['OBSCURE WORDS', obscureMatches])

function sortWords(words) {
  words.sort()
  // words.sort((a, b) => b.length - a.length)
}

// for each group: list as many as can fit vertically, then add columns as necessary
// (this will eventually break when there is too much data to display by wrapping lines with horizontal overflow)
function columnate(...columnGroupOpts) {
  const columnGroups = columnGroupOpts.map(([label, list]) => ({
    label,
    width: 0,
    list: list.reverse(),
    columns: [],
  }))

  while (!columnGroups.every(group => !group.list.length)) {
    columnGroups.forEach(group => {
      while (group.list.length) {
        const column = {
          width: 0,
          rows: [],
        }
        group.columns.push(column)

        //                                              HEADER + SPACE
        for (let rowIndex = 0; rowIndex < tableHeight - 1 - PADDING_V; rowIndex++) {
          if (!group.list.length) break
          const item = group.list.pop()
          column.rows.push(item)
          if (item.length > column.width) column.width = item.length
        }

        group.width += column.width + PADDING_H
      }
    })
  }

  // print headers
  columnGroups.forEach(group => {
    // if label is wider than all this group's columns, add some space to the last column
    const labelOverhang = group.label.length + PADDING_H - group.width
    if (labelOverhang > 0) {
      group.width += labelOverhang
      group.columns[group.columns.length - 1].width += labelOverhang
    }

    // print label
    process.stdout.write(group.label)
    let remainingSpace = group.width - group.label.length
    while (remainingSpace-- > 0) process.stdout.write(' ')
  })
  const headerHeight = PADDING_V + 1
  for (let i = 0; i < headerHeight; i++) process.stdout.write('\n')

  // print content
  for (let rowIndex = 0; rowIndex < tableHeight - headerHeight; rowIndex++) {
    columnGroups.forEach(group => group.columns.forEach((column, columnIndex) => {
      let remainingSpace = column.width + PADDING_H
      const cell = column.rows[rowIndex]
      if (cell) {
        process.stdout.write(cell || '')
        remainingSpace -= cell.length
      }
      while (remainingSpace-- > 0) process.stdout.write(' ')
    }))
    process.stdout.write('\n')
  }
}
