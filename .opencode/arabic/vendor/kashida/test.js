import {
  joinsLeft,
  joinsRight,
  findKashidaPoints,
  insertKashidas,
  makeKashidaString,
  Kashida,
  Algorithm,
} from './kashida.js';

import { expect } from 'chai';


describe('Kashida Tests', () => {
  const joinsLeftCases = [
    ["بيت", -1, false],
    ["بيت", 2, false],
    ["Test", 0, false],
    ["aب", 0, false],
    ["بa", 0, false],
    ["بaب", 0, false],
    ["نص", 0, true],
    ["نَص", 0, true],
    ["نَّص", 0, true],
    ["أب", 0, false],
    ["أَب", 0, false],
  ];

  joinsLeftCases.forEach(([word, index, expected]) => {
    it(`_joinsLeft(${word}, ${index}) should return ${expected}`, () => {
      expect(joinsLeft(word, index)).to.equal(expected);
    });
  });

  const joinsRightCases = [
    ["بيت", 0, false],
    ["بيت", 2, true],
    ["معطَار", 4, true],
    ["معطَّار", 5, true],
    ["ار", 1, false],
    ["اَر", 1, false],
  ];

  joinsRightCases.forEach(([word, index, expected]) => {
    it(`_joinsRight(${word}, ${index}) should return ${expected}`, () => {
      expect(joinsRight(word, index)).to.equal(expected);
    });
  });

  const findKashidaPointsCases = [
    ["بيت", [[2, 7, null]]],
    ["بـيت", [[2, 1, null], [3, 7, null]]],
    ["بـَيت", [[3, 1, null], [4, 7, null]]],
    ["قال", [[1, 4, null]]],
    ["سمس", [[1, 2, null], [2, 7, null]]],
    ["صم", [[1, 2, null]]],
    ["صَم", [[2, 2, null]]],
    ["به", [[1, 3, null]]],
    ["ه", []],
    ["بد", [[1, 3, null]]],
    ["د", []],
    ["بة", [[1, 3, null]]],
    ["ة", []],
    ["ملم", [[2, 7, null]]],
    ["بك", [[1, 4, null]]],
    ["بلم", [[2, 7, null]]],
    ["بل", [[1, 4, null]]],
    ["بر", [[1, 7, null]]],
    ["حبر", [[1, 5, null], [2, 7, null]]],
    ["بي", [[1, 7, null]]],
    ["حبى", [[1, 5, null], [2, 7, null]]],
    ["بقم", [[2, 7, null]]],
    ["بؤل", [[1, 6, null]]],
    ["بق", [[1, 6, null]]],
    ["رق", []],
    ["صف", [[1, 2, null]]],
    ["خلق", [[2, 6, null]]],
    ["خود", [[1, 6, null]]],
    ["كمثل", [[3, 4, null]]],
    ["الشمس", [[3, 2, null], [4, 7, null]]],
    ["إذ", []],
    ["بزغت", [[1, 7, null], [3, 7, null]]],
    ["يحظى", [[3, 7, null]]],
    ["الضجيع", [[3, 2, null], [5, 6, null]]],
    ["بها", [[2, 4, null]]],
    ["نجلاء", []],
    ["معطار", [[3, 4, null]]],
    ["معطَار", [[4, 4, null]]],
    ["معطَّار", [[5, 4, null]]],
    ["بي", [[1, 7, null]]],
    ["فبي", [[1, 5, null], [2, 7, null]]],
    ["فَبي", [[2, 5, null], [3, 7, null]]],
    ["فَبِي", [[2, 5, null], [4, 7, null]]],
    ["ـ", [[1, 1, null]]],
    ["(ا)", []],
  ];

  findKashidaPointsCases.forEach(([word, expected]) => {
    it(`findKashidaPoints(${word}) should return ${expected}`, () => {
      const result = findKashidaPoints(word, Algorithm.SIMPLE, false)[1].map(k => [k.index, k.priority, k.max]);
      expect(result).to.deep.equal(expected);
    });
  });

  const removeExistingKashidaCases = [
    ["بـيت", ["بيت", [[2, 7, null]]]],
    ["الرحمـٰن", ["الرحمـٰن", [[2, 7, null], [7, 7, null]]]],
    ["يـٰـٔادم", ["يـٰـٔادم", [[5, 4, null]]]],
  ];

  removeExistingKashidaCases.forEach(([word, expected]) => {
    it(`findKashidaPoints(${word}) should return ${expected}`, () => {
      const result = findKashidaPoints(word);
      const kashidas = result[1].map(k => [k.index, k.priority, k.max]);
      expect([result[0], kashidas]).to.deep.equal(expected);
    });
  });

  const insertKashidasCases = [
    ["بيت", [], false, "بيت"],
    ["قال", [[1, 4, null]], false, "قـال"],
    ["الضجيع", [[3, 2, null], [5, 6, null]], false, "الضـجيع"],
    ["الضجيع", [[3, 2, null], [5, 6, null]], true, "الضـجيـع"],
    ["بزغت", [[1, 7, null], [3, 7, null]], false, "بزغـت"],
  ];

  insertKashidasCases.forEach(([word, kashidas, all_kashidas, expected]) => {
    it(`insertKashidas(${word}, ${kashidas}, ${all_kashidas}) should return ${expected}`, () => {
      kashidas = kashidas.map(k => new Kashida(...k));
      expect(insertKashidas(word, kashidas, all_kashidas)).to.equal(expected);
    });
  });

  const makeKashidaStringCases = [
    [
      "صف خلق خود كمثل الشمس إذ بزغت يحظى الضجيع بها نجلاء معطار",
      "صـف خلـق خـود كمثـل الشـمس إذ بزغـت يحظـى الضـجيع بهـا نجلاء معطـار",
    ],
    [
      "صِفْ خَلْقَ خُودٍ كَمِثْلِ ٱلشَّمسِ إِذْ بَزَغَتْ، يَحْظَى الضَّجِيعُ بِهَا نَجْلَاءَ مِعْطَارِ.",
      "صِـفْ خَلْـقَ خُـودٍ كَمِثْـلِ ٱلشَّـمسِ إِذْ بَزَغَـتْ، يَحْظَـى الضَّـجِيعُ بِهَـا نَجْلَاءَ مِعْطَـارِ.",
    ],
    [
      "بسم الله الرحمـٰن الرحيم",
      "بسـم اللـه الرحمـٰـن الرحيـم",
    ],
  ];

  makeKashidaStringCases.forEach(([text, expected]) => {
    it(`makeKashidaString(${text}) should return ${expected}`, () => {
      expect(makeKashidaString(text)).to.equal(expected);
    });
  });

  // Test cases for line break handling
  const lineBreakCases = [
    ["بيت\nقال", "بيـت\nقـال"],
    ["صف خلق\nخود كمثل", "صـف خلـق\nخـود كمثـل"],
    ["بيت\n\nقال", "بيـت\n\nقـال"],
    ["بيت\t\nقال", "بيـت\t\nقـال"],
    ["الشمس\r\nإذ", "الشـمس\r\nإذ"],
    ["بيت\tقال", "بيـت\tقـال"],
  ];

  lineBreakCases.forEach(([text, expected]) => {
    it(`makeKashidaString with line breaks: ${JSON.stringify(text)} should return ${JSON.stringify(expected)}`, () => {
      expect(makeKashidaString(text)).to.equal(expected);
    });
  });
});
