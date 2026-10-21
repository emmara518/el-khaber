/**
 * A JavaScript implementation for finding Kashida insertion points.
 */

import { JoiningGroup, JoiningType, JOINING_GROUP, JOINING_TYPE } from './arabic_joining.js';

// A Kashida insertion point.
export class Kashida {
  constructor(index, priority, max = null) {
    this.index = index;
    this.priority = priority;
    this.max = max;
  }
}

// An array of Kashida insertion points. Makes sure that there are no more than
// one Kashida at the same index.
class Kashidas extends Array {
  append(kashida) {
    if (this.some(k => k.index === kashida.index)) {
      return;
    }
    this.push(kashida);
  }
}

// Supported Kashida algorithms.
export const Algorithm = {
  SIMPLE: 'simple',
  NASKH: 'naskh'
};

// Match any Kashida character that is not followed by a small alef or hamza
// above.
const KASHIDA_RE = /(\u0640)(?!\u0670|\u0654)/;

const ALEF = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Alef).map(c => String.fromCharCode(c));
const BEH = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Beh, JoiningGroup.Noon, JoiningGroup.African_Noon, JoiningGroup.Nya, JoiningGroup.Yeh, JoiningGroup.Farsi_Yeh, JoiningGroup.Burushaski_Yeh_Barree].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const DAL = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Dal).map(c => String.fromCharCode(c));
const REH = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Reh).map(c => String.fromCharCode(c));
const SEEN = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Seen).map(c => String.fromCharCode(c));
const SAD = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Sad).map(c => String.fromCharCode(c));
const TAH = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Tah).map(c => String.fromCharCode(c));
const AIN = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Ain).map(c => String.fromCharCode(c));
const FEH = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Feh, JoiningGroup.African_Feh].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const QAF = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Qaf, JoiningGroup.African_Qaf].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const KAF = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Kaf, JoiningGroup.Gaf].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const LAM = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Lam).map(c => String.fromCharCode(c));
const HEH = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Heh, JoiningGroup.Heh_Goal, JoiningType.Knotted_Heh, JoiningGroup.Teh_Marbuta, JoiningGroup.Teh_Marbuta_Goal].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const WAW = Object.keys(JOINING_GROUP).filter(c => JOINING_GROUP[c] === JoiningGroup.Waw).map(c => String.fromCharCode(c));
const YEH = Object.keys(JOINING_GROUP).filter(c => [JoiningGroup.Yeh, JoiningGroup.Farsi_Yeh, JoiningGroup.Yeh_Barree, JoiningGroup.Burushaski_Yeh_Barree, JoiningGroup.Yeh_With_Tail].includes(JOINING_GROUP[c])).map(c => String.fromCharCode(c));
const RIGHT_JOINING = Object.keys(JOINING_TYPE).filter(c => JOINING_TYPE[c] === JoiningType.Right_Joining).map(c => String.fromCharCode(c));

function isArabicLetter(c) {
  if (c == '\u0640') return true;
  return c.match(/\p{L}/u) && c.match(/\p{Script=Arab}/u);
};

// Get the next Arabic letter in a text string skipping combining marks, or None
// if next base character is not an Arabic letter.If step is negative, it will
// get the previous Arabic letter.
function getNextArabicLetter(text, index, step = 1) {
  while (index >= 0 && index < text.length) {
    const c = text[index];
    index += step;
    if (c.match(/\p{Mn}/u)) {
      continue;
    }
    if (!isArabicLetter(c)) {
      return null;
    }
    return [c, index - step];
  }
  return null;
}

// Get the previous Arabic letter in a text string skipping combining marks, or
// None if previous base character is not an Arabic letter.
function getPreviousArabicLetter(text, index) {
  return getNextArabicLetter(text, index, -1);
}

// Check if the character at the given index joins to the left.
export function joinsLeft(word, index) {
  // Get the current Letter, skipping combining marks.
  const c1 = getNextArabicLetter(word, index);
  if (!c1)
    return false;

  // If it is righ joining, then it does not join to the left.
  if (RIGHT_JOINING.includes(c1[0]))
    return false;

  // Get the next Letter, skipping combining marks.
  if (!getNextArabicLetter(word, c1[1] + 1))
    return false;

  return true;
}

// Check if the character at the given index joins to the right.
export function joinsRight(word, index) {
  // Get the current Letter, skipping combining marks.
  const c1 = getPreviousArabicLetter(word, index);
  if (!c1)
    return false;

  // Get the previous Letter, skipping combining marks.
  const c2 = getPreviousArabicLetter(word, c1[1] - 1);
  if (!c2)
    return false;

  // If it is righ joining, then it does not join to the left.
  if (RIGHT_JOINING.includes(c2[0]))
    return false;

  return true;
}

// Check if the character at the given index is a Lam Alef ligature.
function isLamAlef(word, index) {
  const c = word[index];
  if (ALEF.includes(c)) {
    const prev = getPreviousArabicLetter(word, index - 1);
    if (prev && LAM.includes(prev[0])) {
      return true;
    }
  }
  return false;
}

// Find Kashida insertion points in Arabic text using Microsoft's algorithm as
// described in:
// https://web.archive.org/web/20130308140133/microsoft.com/middleeast/msdn/JustifyingText-CSS.aspx
function findKashidaPointsSimple(word) {
  const kashidas = new Kashidas();

  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    if (!isArabicLetter(c)) continue;

    let next_c = null;
    let next_i = i + 1;
    const next = getNextArabicLetter(word, i + 1);
    if (next) {
      next_c = next[0];
      next_i = next[1];
    }

    // 1. After user inserted Kashida
    if (c === '\u0640' && KASHIDA_RE.test(word.slice(i))) {
      kashidas.append(new Kashida(next_i, 1, null));
    }

    // 2. After initial or medial Seen or Sad
    else if ((SEEN.includes(c) || SAD.includes(c)) && joinsLeft(word, i)) {
      kashidas.append(new Kashida(next_i, 2, null));
    }

    // 3. Before final Heh, Teh Marbuta, or Dal
    else if ((HEH.includes(c) || DAL.includes(c)) && joinsRight(word, i) && !joinsLeft(word, i)) {
      kashidas.append(new Kashida(i, 3, null));
    }

    // 4. Before final Alef, Tah, Lam, Caf, and Gaf
    else if ((ALEF.includes(c) || TAH.includes(c) || KAF.includes(c) || LAM.includes(c)) && joinsRight(word, i) && !joinsLeft(word, i) && !isLamAlef(word, i)) {
      kashidas.append(new Kashida(i, 4, null));
    }

    // 5. Before medial Beh followed by final Yeh, Reh, or Alef Maqsura
    else if (BEH.includes(c) && joinsLeft(word, i) && joinsRight(word, i) && (YEH.includes(next_c) || REH.includes(next_c))) {
      kashidas.append(new Kashida(i, 5, null));
    }

    // 6. Before final Waw, Ain, Qaf, or Feh
    else if ((WAW.includes(c) || AIN.includes(c) || QAF.includes(c) || FEH.includes(c)) && joinsRight(word, i) && !joinsLeft(word, i)) {
      kashidas.append(new Kashida(i, 6, null));
    }

    // 7. Before any final letter
    else if (joinsRight(word, i) && !joinsLeft(word, i) && !isLamAlef(word, i)) {
      kashidas.append(new Kashida(i, 7, null));
    }
  }

  return kashidas;
}

// Find Kashida insertion points in a word.
//
// Args:
//   word: A text word.
//   remove_existing_kashida: Remove existing Kashida characters.
//   algorithm: Kashida algorithm to use.
export function findKashidaPoints(word, algorithm = Algorithm.SIMPLE, removeExistingKashida = true) {
  if (removeExistingKashida) {
    word = word.replace(KASHIDA_RE, '');
  }

  let kashidas = [];
  if (algorithm === Algorithm.SIMPLE) {
    kashidas = findKashidaPointsSimple(word);
  } else {
    throw new Error(`Unsupported Kashida algorithm: ${algorithm}`);
  }

  return [word, kashidas];
}

// Insert kashida characters into a word.
//
// Args:
//  word: A text word.
//  kashidas: Kashida insertion points.
//  all_kashidas: Insert all possible Kashidas in a word, default is to
//                 insert only the Kashida with the highest priority.
export function insertKashidas(word, kashidas, allKashidas = false) {
  if (!kashidas.length) return word;

  if (!allKashidas) {
    kashidas = kashidas.sort((a, b) => (a.priority - b.priority) || (b.index - a.index));
    kashidas = [kashidas[0]];
  }

  let inserted = 0;
  for (const kashida of kashidas) {
    const pos = kashida.index + inserted;
    word = word.slice(0, pos) + '\u0640' + word.slice(pos);
    inserted += 1;
  }

  return word;
}

// Find possible Kashida points and insert them in a text string.
//
// Args:
//  text: A text string.
//  algorithm: Kashida algorithm to use.
//  remove_existing_kashida: Remove existing Kashida characters.
//  all_kashidas: Insert all possible Kashidas in a word, default is to
//                insert only the Kashida with the highest priority.
export function makeKashidaString(text, algorithm = Algorithm.SIMPLE, removeExistingKashida = true, allKashidas = false) {
  // Split by whitespace (spaces, tabs, newlines, etc.) to handle line breaks properly
  const words = text.split(/\s+/);
  const ret = words.map(word => {
    if (!word) return word; // Handle empty strings from multiple consecutive whitespace
    const [newWord, kashidas] = findKashidaPoints(word, algorithm, removeExistingKashida);
    return insertKashidas(newWord, kashidas, allKashidas);
  });

  // Preserve the original whitespace structure by replacing word boundaries
  // with the processed words while maintaining the original spacing
  let result = text;
  let wordIndex = 0;
  result = result.replace(/\S+/g, (match) => {
    return ret[wordIndex++] || match;
  });

  return result;
}
