/**
 * Complete Script & Character Mastery Datasets for All 13 Languages.
 * Covers every vowel, consonant, diacritic/matra, full consonant×vowel syllabary
 * (Tamil 216 Uyirmei + Grantha, Malayalam Kagunitham, Kannada Kagunita, Telugu Gunintalu,
 * Hindi Barakhadi), conjunct, chillu, dakuten, yoon, jamo, harakat, radical, and kanji/hanzi.
 */

function buildAbugidaRows(consonants, vowelMarks) {
  return consonants.map(([base, stem, rowTitle]) => ({
    group: rowTitle || `${base}-row (${stem}a)`,
    chars: vowelMarks.map(([mark, vRom]) => ({
      glyph: base + mark,
      romaji: stem + vRom
    }))
  }));
}

const TA_VOWEL_MARKS = [
  ['', 'a'], ['ா', 'aa'], ['ி', 'i'], ['ீ', 'ee'], ['ு', 'u'], ['ூ', 'oo'],
  ['ெ', 'e'], ['ே', 'ae'], ['ை', 'ai'], ['ொ', 'o'], ['ோ', 'oo'], ['ௌ', 'au']
];

const TA_UYIRMEI_CONSONANTS = [
  ['க', 'k', 'க-வரிசை (ka – kau)'],
  ['ங', 'ng', 'ங-வரிசை (nga – ngau)'],
  ['ச', 'ch', 'ச-வரிசை (cha – chau)'],
  ['ஞ', 'ny', 'ஞ-வரிசை (nya – nyau)'],
  ['ட', 't', 'ட-வரிசை (ta – tau)'],
  ['ண', 'n', 'ண-வரிசை (na – nau · retroflex)'],
  ['த', 'th', 'த-வரிசை (tha – thau)'],
  ['ந', 'n', 'ந-வரிசை (na – nau · dental)'],
  ['ப', 'p', 'ப-வரிசை (pa – pau)'],
  ['ம', 'm', 'ம-வரிசை (ma – mau)'],
  ['ய', 'y', 'ய-வரிசை (ya – yau)'],
  ['ர', 'r', 'ர-வரிசை (ra – rau)'],
  ['ல', 'l', 'ல-வரிசை (la – lau)'],
  ['வ', 'v', 'வ-வரிசை (va – vau)'],
  ['ழ', 'zh', 'ழ-வரிசை (zha – zhau)'],
  ['ள', 'l', 'ள-வரிசை (la – lau · retroflex)'],
  ['ற', 'rr', 'ற-வரிசை (rra – rrau)'],
  ['ன', 'n', 'ன-வரிசை (na – nau · alveolar)']
];

const TA_GRANTHA_CONSONANTS = [
  ['ஜ', 'j', 'ஜ-வரிசை (ja – jau · Grantha)'],
  ['ஷ', 'sh', 'ஷ-வரிசை (sha – shau · Grantha)'],
  ['ஸ', 's', 'ஸ-வரிசை (sa – sau · Grantha)'],
  ['ஹ', 'h', 'ஹ-வரிசை (ha – hau · Grantha)']
];

const ML_VOWEL_MARKS = [
  ['', 'a'], ['ാ', 'aa'], ['ി', 'i'], ['ീ', 'ee'], ['ു', 'u'], ['ൂ', 'oo'], ['ൃ', 'ru'],
  ['െ', 'e'], ['േ', 'ae'], ['ൈ', 'ai'], ['ൊ', 'o'], ['ോ', 'oo'], ['ൗ', 'au'], ['ം', 'am'], ['്', '']
];

const ML_CONSONANTS_FULL = [
  ['ക', 'k'], ['ഖ', 'kh'], ['ഗ', 'g'], ['ഘ', 'gh'], ['ങ', 'ng'],
  ['ച', 'ch'], ['ഛ', 'chh'], ['ജ', 'j'], ['ഝ', 'jh'], ['ഞ', 'ny'],
  ['ട', 't'], ['ഠ', 'th'], ['ഡ', 'd'], ['ഢ', 'dh'], ['ണ', 'n'],
  ['ത', 'th'], ['ഥ', 'thh'], ['ദ', 'd'], ['ധ', 'dh'], ['ന', 'n'],
  ['പ', 'p'], ['ഫ', 'ph'], ['ബ', 'b'], ['ഭ', 'bh'], ['മ', 'm'],
  ['യ', 'y'], ['ര', 'r'], ['ല', 'l'], ['വ', 'v'],
  ['ശ', 'sh'], ['ഷ', 'ssh'], ['സ', 's'], ['ഹ', 'h'], ['ള', 'l'], ['ഴ', 'zh'], ['റ', 'rr']
];

const KN_VOWEL_MARKS = [
  ['', 'a'], ['ಾ', 'aa'], ['ಿ', 'i'], ['ೀ', 'ee'], ['ು', 'u'], ['ೂ', 'oo'], ['ೃ', 'ru'],
  ['ೆ', 'e'], ['ೇ', 'ae'], ['ೈ', 'ai'], ['ೊ', 'o'], ['ೋ', 'oo'], ['ೌ', 'au'], ['ಂ', 'am'], ['್', '']
];

const KN_CONSONANTS_FULL = [
  ['ಕ', 'k'], ['ಖ', 'kh'], ['ಗ', 'g'], ['ಘ', 'gh'], ['ಙ', 'ng'],
  ['ಚ', 'ch'], ['ಛ', 'chh'], ['ಜ', 'j'], ['ಝ', 'jh'], ['ಞ', 'ny'],
  ['ಟ', 't'], ['ಠ', 'th'], ['ಡ', 'd'], ['ಢ', 'dh'], ['ಣ', 'n'],
  ['ತ', 'th'], ['ಥ', 'thh'], ['ದ', 'd'], ['ಧ', 'dh'], ['ನ', 'n'],
  ['ಪ', 'p'], ['ಫ', 'ph'], ['ಬ', 'b'], ['ಭ', 'bh'], ['ಮ', 'm'],
  ['ಯ', 'y'], ['ರ', 'r'], ['ಲ', 'l'], ['ವ', 'v'], ['ಶ', 'sh'], ['ಷ', 'ssh'], ['ಸ', 's'], ['ಹ', 'h'], ['ಳ', 'l']
];

const TE_VOWEL_MARKS = [
  ['', 'a'], ['ా', 'aa'], ['ి', 'i'], ['ీ', 'ee'], ['ు', 'u'], ['ూ', 'oo'], ['ృ', 'ru'],
  ['ె', 'e'], ['ే', 'ae'], ['ై', 'ai'], ['ొ', 'o'], ['ో', 'oo'], ['ౌ', 'au'], ['ం', 'am'], ['్', '']
];

const TE_CONSONANTS_FULL = [
  ['క', 'k'], ['ఖ', 'kh'], ['గ', 'g'], ['ఘ', 'gh'], ['ఙ', 'ng'],
  ['చ', 'ch'], ['ఛ', 'chh'], ['జ', 'j'], ['ఝ', 'jh'], ['ఞ', 'ny'],
  ['ట', 't'], ['ఠ', 'th'], ['డ', 'd'], ['ఢ', 'dh'], ['ణ', 'n'],
  ['త', 'th'], ['థ', 'thh'], ['ద', 'd'], ['ధ', 'dh'], ['న', 'n'],
  ['ప', 'p'], ['ఫ', 'ph'], ['బ', 'b'], ['భ', 'bh'], ['మ', 'm'],
  ['య', 'y'], ['ర', 'r'], ['ల', 'l'], ['వ', 'v'], ['శ', 'sh'], ['ష', 'ssh'], ['స', 's'], ['హ', 'h'], ['ళ', 'l'], ['క్ష', 'ksh'], ['ఱ', 'rr']
];

const HI_VOWEL_MARKS = [
  ['', 'a'], ['ा', 'aa'], ['ि', 'i'], ['ी', 'ee'], ['ु', 'u'], ['ू', 'oo'], ['ृ', 'ri'],
  ['े', 'e'], ['ै', 'ai'], ['ो', 'o'], ['ौ', 'au'], ['ं', 'am'], ['ः', 'ah'], ['्', '']
];

const HI_CONSONANTS_FULL = [
  ['क', 'k'], ['ख', 'kh'], ['ग', 'g'], ['घ', 'gh'], ['ङ', 'ng'],
  ['च', 'ch'], ['छ', 'chh'], ['ज', 'j'], ['झ', 'jh'], ['ञ', 'ny'],
  ['ट', 't'], ['ठ', 'th'], ['ड', 'd'], ['ढ', 'dh'], ['ण', 'n'],
  ['त', 't'], ['थ', 'th'], ['द', 'd'], ['ध', 'dh'], ['न', 'n'],
  ['प', 'p'], ['फ', 'ph'], ['ब', 'b'], ['भ', 'bh'], ['म', 'm'],
  ['य', 'y'], ['र', 'r'], ['ल', 'l'], ['व', 'v'], ['श', 'sh'], ['ष', 'ssh'], ['स', 's'], ['ह', 'h']
];

export const SCRIPT_SETS = {
  ml: {
    title: 'Malayalam Script (മലയാളം ലിപി)',
    subtitle: 'Complete mastery of all 15 Swarangal, 36 Vyanjanangal, 6 Chillu letters, 16 vowel signs, and core conjuncts.',
    speechLocale: 'ml-IN',
    tabs: [
      {
        id: 'ml-vowels',
        label: 'Vowels (സ്വരങ്ങൾ · 15)',
        note: 'All 15 independent Malayalam vowel letters (short/long pairs, vocalic ഋ, Anusvara അം, and Visarga അഃ).',
        rows: [
          { group: 'Short & Long Vowels (ഹ്രസ്വവും ദീർഘവും)', chars: [
            { glyph: 'അ', romaji: 'a' }, { glyph: 'ആ', romaji: 'aa' }, { glyph: 'ഇ', romaji: 'i' }, { glyph: 'ഈ', romaji: 'ee' },
            { glyph: 'ഉ', romaji: 'u' }, { glyph: 'ഊ', romaji: 'oo' }, { glyph: 'ഋ', romaji: 'ru' }
          ]},
          { group: 'E, O, Diphthongs & Modifiers', chars: [
            { glyph: 'എ', romaji: 'e' }, { glyph: 'ഏ', romaji: 'ae' }, { glyph: 'ഐ', romaji: 'ai' },
            { glyph: 'ഒ', romaji: 'o' }, { glyph: 'ഓ', romaji: 'oo' }, { glyph: 'ഔ', romaji: 'au' },
            { glyph: 'അം', romaji: 'am' }, { glyph: 'അഃ', romaji: 'ah' }
          ]}
        ]
      },
      {
        id: 'ml-consonants',
        label: 'All Consonants (വ്യഞ്ജനങ്ങൾ · 36)',
        note: 'All 36 Malayalam consonants arranged in traditional Varga rows (unaspirated, aspirated, voiced, voiced-aspirated, nasal).',
        rows: [
          { group: 'Ka-vargam (കവർഗ്ഗം · Velar)', chars: [
            { glyph: 'ക', romaji: 'ka' }, { glyph: 'ഖ', romaji: 'kha' }, { glyph: 'ഗ', romaji: 'ga' }, { glyph: 'ഘ', romaji: 'gha' }, { glyph: 'ങ', romaji: 'nga' }
          ]},
          { group: 'Cha-vargam (ചവർഗ്ഗം · Palatal)', chars: [
            { glyph: 'ച', romaji: 'cha' }, { glyph: 'ഛ', romaji: 'chha' }, { glyph: 'ജ', romaji: 'ja' }, { glyph: 'ഝ', romaji: 'jha' }, { glyph: 'ഞ', romaji: 'nya' }
          ]},
          { group: 'Ta-vargam (ടവർഗ്ഗം · Retroflex)', chars: [
            { glyph: 'ട', romaji: 'ta' }, { glyph: 'ഠ', romaji: 'tha' }, { glyph: 'ഡ', romaji: 'da' }, { glyph: 'ഢ', romaji: 'dha' }, { glyph: 'ണ', romaji: 'na' }
          ]},
          { group: 'Tha-vargam (തവർഗ്ഗം · Dental)', chars: [
            { glyph: 'ത', romaji: 'tha' }, { glyph: 'ഥ', romaji: 'thha' }, { glyph: 'ദ', romaji: 'da' }, { glyph: 'ധ', romaji: 'dha' }, { glyph: 'ന', romaji: 'na' }
          ]},
          { group: 'Pa-vargam (പവർഗ്ഗം · Labial)', chars: [
            { glyph: 'പ', romaji: 'pa' }, { glyph: 'ഫ', romaji: 'pha' }, { glyph: 'ബ', romaji: 'ba' }, { glyph: 'ഭ', romaji: 'bha' }, { glyph: 'മ', romaji: 'ma' }
          ]},
          { group: 'Madhyamam & Liquids (മധ്യമം)', chars: [
            { glyph: 'യ', romaji: 'ya' }, { glyph: 'ര', romaji: 'ra' }, { glyph: 'ല', romaji: 'la' }, { glyph: 'വ', romaji: 'va' }
          ]},
          { group: 'Sibilants & Distinctive Malayalam Sounds', chars: [
            { glyph: 'ശ', romaji: 'sha' }, { glyph: 'ഷ', romaji: 'ssha' }, { glyph: 'സ', romaji: 'sa' }, { glyph: 'ഹ', romaji: 'ha' },
            { glyph: 'ള', romaji: 'la (retroflex)' }, { glyph: 'ഴ', romaji: 'zha' }, { glyph: 'റ', romaji: 'rra' }
          ]}
        ]
      },
      {
        id: 'ml-chillu-matras',
        label: 'Chillu & Signs (ചില്ലും ചിഹ്നങ്ങളും)',
        note: 'All 6 Malayalam Chillu pure-consonant letters and all 16 vowel signs (സ്വരചിഹ്നങ്ങൾ) demonstrated on ക.',
        rows: [
          { group: 'Chillu Letters (ചില്ലക്ഷരങ്ങൾ · 6)', chars: [
            { glyph: 'ൺ', romaji: 'n (retroflex)' }, { glyph: 'ൻ', romaji: 'n' }, { glyph: 'ർ', romaji: 'r' },
            { glyph: 'ൽ', romaji: 'l' }, { glyph: 'ൾ', romaji: 'l (retroflex)' }, { glyph: 'ൿ', romaji: 'k' }
          ]},
          { group: 'Vowel Signs on ക (കാഗുണിതം)', chars: [
            { glyph: 'ക', romaji: 'ka' }, { glyph: 'കാ', romaji: 'kaa' }, { glyph: 'കി', romaji: 'ki' }, { glyph: 'കീ', romaji: 'kee' },
            { glyph: 'കു', romaji: 'ku' }, { glyph: 'കൂ', romaji: 'koo' }, { glyph: 'കൃ', romaji: 'kru' }, { glyph: 'കെ', romaji: 'ke' },
            { glyph: 'കേ', romaji: 'kae' }, { glyph: 'കൈ', romaji: 'kai' }, { glyph: 'കൊ', romaji: 'ko' }, { glyph: 'കോ', romaji: 'koo' },
            { glyph: 'കൗ', romaji: 'kau' }, { glyph: 'കം', romaji: 'kam' }, { glyph: 'കഃ', romaji: 'kah' }, { glyph: 'ക്', romaji: 'k (chandrakkala)' }
          ]}
        ]
      },
      {
        id: 'ml-conjuncts',
        label: 'Conjuncts (കൂട്ടക്ഷരങ്ങൾ)',
        note: 'High-frequency doubled consonants and ligatures essential for fluent Malayalam reading and writing.',
        rows: [
          { group: 'Geminate / Doubled Consonants', chars: [
            { glyph: 'ക്ക', romaji: 'kka' }, { glyph: 'ങ്ങ', romaji: 'ngga' }, { glyph: 'ച്ച', romaji: 'chcha' }, { glyph: 'ഞ്ഞ', romaji: 'nnya' },
            { glyph: 'ട്ട', romaji: 'tta' }, { glyph: 'ണ്ണ', romaji: 'nna' }, { glyph: 'ത്ത', romaji: 'ttha' }, { glyph: 'ന്ന', romaji: 'nna' },
            { glyph: 'പ്പ', romaji: 'ppa' }, { glyph: 'മ്മ', romaji: 'mma' }, { glyph: 'യ്യ', romaji: 'yya' }, { glyph: 'ല്ല', romaji: 'lla' },
            { glyph: 'വ്വ', romaji: 'vva' }, { glyph: 'ശ്ശ', romaji: 'shsha' }, { glyph: 'സ്സ', romaji: 'ssa' }, { glyph: 'ള്ള', romaji: 'lla (retroflex)' }
          ]},
          { group: 'Essential Clusters & Ligatures', chars: [
            { glyph: 'ന്റ', romaji: 'nta' }, { glyph: 'ങ്ക', romaji: 'nka' }, { glyph: 'ഞ്ച', romaji: 'nja' }, { glyph: 'ണ്ട', romaji: 'nda' },
            { glyph: 'ന്ത', romaji: 'ntha' }, { glyph: 'മ്പ', romaji: 'mpa' }, { glyph: 'ക്ത', romaji: 'ktha' }, { glyph: 'ക്ഷ', romaji: 'ksha' },
            { glyph: 'ജ്ഞ', romaji: 'jna' }, { glyph: 'ശ്ര', romaji: 'shra' }
          ]}
        ]
      },
      {
        id: 'ml-kagunitham',
        label: 'All Vowel Combos (കാഗുണിതം · 540)',
        note: 'Every Malayalam consonant combined with all vowel signs (ക..ക്, പ..പ്, മ..മ്, etc.).',
        rows: buildAbugidaRows(ML_CONSONANTS_FULL, ML_VOWEL_MARKS)
      }
    ]
  },

  ta: {
    title: 'Tamil Script (தமிழ் எழுத்துக்கள்)',
    subtitle: 'Complete mastery of all 12 Uyir vowels, Aytham, 18 Mei & Uyirmei consonants, 6 Grantha letters, and vowel modifiers.',
    speechLocale: 'ta-IN',
    tabs: [
      {
        id: 'ta-vowels',
        label: 'Uyir Vowels (உயிர் · 13)',
        note: 'All 12 Tamil Uyir vowels (5 short Kuril + 7 long Nedil) plus the special Aytham (ஃ).',
        rows: [
          { group: 'Short & Long Vowels (குறில் & நெடில்)', chars: [
            { glyph: 'அ', romaji: 'a' }, { glyph: 'ஆ', romaji: 'aa' }, { glyph: 'இ', romaji: 'i' }, { glyph: 'ஈ', romaji: 'ee' },
            { glyph: 'உ', romaji: 'u' }, { glyph: 'ஊ', romaji: 'oo' }
          ]},
          { group: 'E, O, Diphthongs & Aytham', chars: [
            { glyph: 'எ', romaji: 'e' }, { glyph: 'ஏ', romaji: 'ae' }, { glyph: 'ஐ', romaji: 'ai' },
            { glyph: 'ஒ', romaji: 'o' }, { glyph: 'ஓ', romaji: 'oo' }, { glyph: 'ஔ', romaji: 'au' }, { glyph: 'ஃ', romaji: 'akh (aytham)' }
          ]}
        ]
      },
      {
        id: 'ta-consonants',
        label: 'Consonants & Grantha (24)',
        note: 'All 18 classical Tamil consonants (Vallinam, Mellinam, Idaiyinam) plus all 6 modern Grantha letters.',
        rows: [
          { group: 'Hard Consonants (வல்லினம்)', chars: [
            { glyph: 'க', romaji: 'ka/ga' }, { glyph: 'ச', romaji: 'cha/sa' }, { glyph: 'ட', romaji: 'ta/da' },
            { glyph: 'த', romaji: 'tha/dha' }, { glyph: 'ப', romaji: 'pa/ba' }, { glyph: 'ற', romaji: 'rra/tra' }
          ]},
          { group: 'Soft Consonants (மெல்லினம்)', chars: [
            { glyph: 'ங', romaji: 'nga' }, { glyph: 'ஞ', romaji: 'nya' }, { glyph: 'ண', romaji: 'na (retroflex)' },
            { glyph: 'ந', romaji: 'na (dental)' }, { glyph: 'ம', romaji: 'ma' }, { glyph: 'ன', romaji: 'na (alveolar)' }
          ]},
          { group: 'Medium Consonants (இடையினம்)', chars: [
            { glyph: 'ய', romaji: 'ya' }, { glyph: 'ர', romaji: 'ra' }, { glyph: 'ல', romaji: 'la' },
            { glyph: 'வ', romaji: 'va' }, { glyph: 'ழ', romaji: 'zha' }, { glyph: 'ள', romaji: 'la (retroflex)' }
          ]},
          { group: 'Grantha Letters (கிரந்த எழுத்துகள்)', chars: [
            { glyph: 'ஜ', romaji: 'ja' }, { glyph: 'ஷ', romaji: 'sha' }, { glyph: 'ஸ', romaji: 'sa' },
            { glyph: 'ஹ', romaji: 'ha' }, { glyph: 'க்ஷ', romaji: 'ksha' }, { glyph: 'ஸ்ரீ', romaji: 'shri' }
          ]}
        ]
      },
      {
        id: 'ta-mei-uyirmei',
        label: 'Pure Mei (மெய் · 18)',
        note: 'All 18 pure dotted Mei consonants (மெய்யெழுத்துகள்).',
        rows: [
          { group: 'Pure Mei Consonants (மெய்யெழுத்துகள் · 18)', chars: [
            { glyph: 'க்', romaji: 'k' }, { glyph: 'ங்', romaji: 'ng' }, { glyph: 'ச்', romaji: 'ch' }, { glyph: 'ஞ்', romaji: 'ny' },
            { glyph: 'ட்', romaji: 't' }, { glyph: 'ண்', romaji: 'n' }, { glyph: 'த்', romaji: 'th' }, { glyph: 'ந்', romaji: 'n' },
            { glyph: 'ப்', romaji: 'p' }, { glyph: 'ம்', romaji: 'm' }, { glyph: 'ய்', romaji: 'y' }, { glyph: 'ர்', romaji: 'r' },
            { glyph: 'ல்', romaji: 'l' }, { glyph: 'வ்', romaji: 'v' }, { glyph: 'ழ்', romaji: 'zh' }, { glyph: 'ள்', romaji: 'l' },
            { glyph: 'ற்', romaji: 'rr' }, { glyph: 'ன்', romaji: 'n' }
          ]}
        ]
      },
      {
        id: 'ta-all-uyirmei',
        label: 'All Uyirmei (உயிர்மெய் · 216 + Grantha)',
        note: 'All 18 Tamil consonants × 12 vowels (216 Uyirmei: க..கௌ, ப..பௌ, ம..மௌ, …) plus Grantha vowel series.',
        rows: [
          ...buildAbugidaRows(TA_UYIRMEI_CONSONANTS, TA_VOWEL_MARKS),
          ...buildAbugidaRows(TA_GRANTHA_CONSONANTS, TA_VOWEL_MARKS)
        ]
      }
    ]
  },

  kn: {
    title: 'Kannada Script (ಕನ್ನಡ ಲಿಪಿ)',
    subtitle: 'Complete mastery of all 15 Swaragalu, 34 Vyanjanagalu, 16 Kagunita vowel signs, and core Ottakshara conjuncts.',
    speechLocale: 'kn-IN',
    tabs: [
      {
        id: 'kn-vowels',
        label: 'Swaragalu (ಸ್ವರಗಳು · 15)',
        note: 'All 13 Kannada vowels plus Yogavaha modifiers (ಅಂ Anusvara, ಅಃ Visarga).',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'ಅ', romaji: 'a' }, { glyph: 'ಆ', romaji: 'aa' }, { glyph: 'ಇ', romaji: 'i' }, { glyph: 'ಈ', romaji: 'ee' },
            { glyph: 'ಉ', romaji: 'u' }, { glyph: 'ಊ', romaji: 'oo' }, { glyph: 'ಋ', romaji: 'ru' }
          ]},
          { group: 'E, O, Diphthongs & Yogavaha', chars: [
            { glyph: 'ಎ', romaji: 'e' }, { glyph: 'ಏ', romaji: 'ae' }, { glyph: 'ಐ', romaji: 'ai' },
            { glyph: 'ಒ', romaji: 'o' }, { glyph: 'ಓ', romaji: 'oo' }, { glyph: 'ಔ', romaji: 'au' },
            { glyph: 'ಅಂ', romaji: 'am' }, { glyph: 'ಅಃ', romaji: 'ah' }
          ]}
        ]
      },
      {
        id: 'kn-consonants',
        label: 'All Consonants (ವ್ಯಂಜನಗಳು · 34)',
        note: 'All 25 Vargiya structured consonants and 9 Avargiya liquids & sibilants.',
        rows: [
          { group: 'Ka-varga (Velar)', chars: [
            { glyph: 'ಕ', romaji: 'ka' }, { glyph: 'ಖ', romaji: 'kha' }, { glyph: 'ಗ', romaji: 'ga' }, { glyph: 'ಘ', romaji: 'gha' }, { glyph: 'ಙ', romaji: 'nga' }
          ]},
          { group: 'Cha-varga (Palatal)', chars: [
            { glyph: 'ಚ', romaji: 'cha' }, { glyph: 'ಛ', romaji: 'chha' }, { glyph: 'ಜ', romaji: 'ja' }, { glyph: 'ಝ', romaji: 'jha' }, { glyph: 'ಞ', romaji: 'nya' }
          ]},
          { group: 'Ta-varga (Retroflex)', chars: [
            { glyph: 'ಟ', romaji: 'ta' }, { glyph: 'ಠ', romaji: 'tha' }, { glyph: 'ಡ', romaji: 'da' }, { glyph: 'ಢ', romaji: 'dha' }, { glyph: 'ಣ', romaji: 'na' }
          ]},
          { group: 'Tha-varga (Dental)', chars: [
            { glyph: 'ತ', romaji: 'tha' }, { glyph: 'ಥ', romaji: 'thha' }, { glyph: 'ದ', romaji: 'da' }, { glyph: 'ಧ', romaji: 'dha' }, { glyph: 'ನ', romaji: 'na' }
          ]},
          { group: 'Pa-varga (Labial)', chars: [
            { glyph: 'ಪ', romaji: 'pa' }, { glyph: 'ಫ', romaji: 'pha' }, { glyph: 'ಬ', romaji: 'ba' }, { glyph: 'ಭ', romaji: 'bha' }, { glyph: 'ಮ', romaji: 'ma' }
          ]},
          { group: 'Avargiya (Liquids & Sibilants)', chars: [
            { glyph: 'ಯ', romaji: 'ya' }, { glyph: 'ರ', romaji: 'ra' }, { glyph: 'ಲ', romaji: 'la' }, { glyph: 'ವ', romaji: 'va' },
            { glyph: 'ಶ', romaji: 'sha' }, { glyph: 'ಷ', romaji: 'ssha' }, { glyph: 'ಸ', romaji: 'sa' }, { glyph: 'ಹ', romaji: 'ha' }, { glyph: 'ಳ', romaji: 'la (retroflex)' }
          ]}
        ]
      },
      {
        id: 'kn-kagunita',
        label: 'All Kagunita & Ottakshara',
        note: 'Complete Kagunita vowel combinations for all 34 Kannada consonants plus essential Ottakshara conjuncts.',
        rows: [
          { group: 'Essential Ottakshara Conjuncts', chars: [
            { glyph: 'ಕ್ಕ', romaji: 'kka' }, { glyph: 'ತ್ತ', romaji: 'ttha' }, { glyph: 'ನ್ನ', romaji: 'nna' }, { glyph: 'ಮ್ಮ', romaji: 'mma' },
            { glyph: 'ಲ್ಲ', romaji: 'lla' }, { glyph: 'ಷ್ಟ', romaji: 'shta' }, { glyph: 'ಕ್ಷ', romaji: 'ksha' }, { glyph: 'ಜ್ಞ', romaji: 'jna' }
          ]},
          ...buildAbugidaRows(KN_CONSONANTS_FULL, KN_VOWEL_MARKS)
        ]
      }
    ]
  },

  te: {
    title: 'Telugu Script (తెలుగు లిపి)',
    subtitle: 'Complete mastery of all 16 Achulu, 36 Hallulu, 16 Gunintalu vowel signs, and core Vattulu conjuncts.',
    speechLocale: 'te-IN',
    tabs: [
      {
        id: 'te-vowels',
        label: 'Achulu (అచ్చులు · 16)',
        note: 'All 16 Telugu Achulu vowel letters including ఋ, ౠ, అం, and అః.',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'అ', romaji: 'a' }, { glyph: 'ఆ', romaji: 'aa' }, { glyph: 'ఇ', romaji: 'i' }, { glyph: 'ఈ', romaji: 'ee' },
            { glyph: 'ఉ', romaji: 'u' }, { glyph: 'ఊ', romaji: 'oo' }, { glyph: 'ఋ', romaji: 'ru' }, { glyph: 'ౠ', romaji: 'roo' }
          ]},
          { group: 'E, O, Diphthongs & Modifiers', chars: [
            { glyph: 'ఎ', romaji: 'e' }, { glyph: 'ఏ', romaji: 'ae' }, { glyph: 'ఐ', romaji: 'ai' },
            { glyph: 'ఒ', romaji: 'o' }, { glyph: 'ఓ', romaji: 'oo' }, { glyph: 'ఔ', romaji: 'au' },
            { glyph: 'అం', romaji: 'am' }, { glyph: 'అః', romaji: 'ah' }
          ]}
        ]
      },
      {
        id: 'te-consonants',
        label: 'All Hallulu (హల్లులు · 36)',
        note: 'All 36 Telugu consonants across the 5 classical Vargas plus liquids, sibilants, ళ, క్ష, and ఱ.',
        rows: [
          { group: 'Ka-varga (Velar)', chars: [
            { glyph: 'క', romaji: 'ka' }, { glyph: 'ఖ', romaji: 'kha' }, { glyph: 'గ', romaji: 'ga' }, { glyph: 'ఘ', romaji: 'gha' }, { glyph: 'ఙ', romaji: 'nga' }
          ]},
          { group: 'Cha-varga (Palatal)', chars: [
            { glyph: 'చ', romaji: 'cha' }, { glyph: 'ఛ', romaji: 'chha' }, { glyph: 'జ', romaji: 'ja' }, { glyph: 'ఝ', romaji: 'jha' }, { glyph: 'ఞ', romaji: 'nya' }
          ]},
          { group: 'Ta-varga (Retroflex)', chars: [
            { glyph: 'ట', romaji: 'ta' }, { glyph: 'ఠ', romaji: 'tha' }, { glyph: 'డ', romaji: 'da' }, { glyph: 'ఢ', romaji: 'dha' }, { glyph: 'ణ', romaji: 'na' }
          ]},
          { group: 'Tha-varga (Dental)', chars: [
            { glyph: 'త', romaji: 'tha' }, { glyph: 'థ', romaji: 'thha' }, { glyph: 'ద', romaji: 'da' }, { glyph: 'ధ', romaji: 'dha' }, { glyph: 'న', romaji: 'na' }
          ]},
          { group: 'Pa-varga (Labial)', chars: [
            { glyph: 'ప', romaji: 'pa' }, { glyph: 'ఫ', romaji: 'pha' }, { glyph: 'బ', romaji: 'ba' }, { glyph: 'భ', romaji: 'bha' }, { glyph: 'మ', romaji: 'ma' }
          ]},
          { group: 'Liquids, Sibilants & Specials', chars: [
            { glyph: 'య', romaji: 'ya' }, { glyph: 'ర', romaji: 'ra' }, { glyph: 'ల', romaji: 'la' }, { glyph: 'వ', romaji: 'va' },
            { glyph: 'శ', romaji: 'sha' }, { glyph: 'ష', romaji: 'ssha' }, { glyph: 'స', romaji: 'sa' }, { glyph: 'హ', romaji: 'ha' },
            { glyph: 'ళ', romaji: 'la (retroflex)' }, { glyph: 'క్ష', romaji: 'ksha' }, { glyph: 'ఱ', romaji: 'rra' }
          ]}
        ]
      },
      {
        id: 'te-gunintalu',
        label: 'All Gunintalu & Vattulu',
        note: 'Complete Gunintalu vowel combinations for all 36 Telugu consonants plus essential Vattulu conjuncts.',
        rows: [
          { group: 'Essential Vattulu Conjuncts (ఒత్తులు)', chars: [
            { glyph: 'క్క', romaji: 'kka' }, { glyph: 'త్త', romaji: 'ttha' }, { glyph: 'న్న', romaji: 'nna' }, { glyph: 'మ్మ', romaji: 'mma' },
            { glyph: 'ల్ల', romaji: 'lla' }, { glyph: 'ష్ట', romaji: 'shta' }, { glyph: 'జ్ఞ', romaji: 'jna' }, { glyph: 'శ్ర', romaji: 'shra' }
          ]},
          ...buildAbugidaRows(TE_CONSONANTS_FULL, TE_VOWEL_MARKS)
        ]
      }
    ]
  },

  hi: {
    title: 'Hindi Devanagari (हिन्दी देवनागरी)',
    subtitle: 'Complete mastery of all 13 Swar, 33 Vyanjan, 4 Sankyuktakshar, 7 Nukta sounds, and all 15 Matras.',
    speechLocale: 'hi-IN',
    tabs: [
      {
        id: 'hi-vowels',
        label: 'Swar (स्वर · 13)',
        note: 'All 11 Devanagari vowels plus Anusvara (अं) and Visarga (अः).',
        rows: [
          { group: 'Core Vowels', chars: [
            { glyph: 'अ', romaji: 'a' }, { glyph: 'आ', romaji: 'aa' }, { glyph: 'इ', romaji: 'i' }, { glyph: 'ई', romaji: 'ee' },
            { glyph: 'उ', romaji: 'u' }, { glyph: 'ऊ', romaji: 'oo' }, { glyph: 'ऋ', romaji: 'ri' }
          ]},
          { group: 'E, O & Modifiers', chars: [
            { glyph: 'ए', romaji: 'e' }, { glyph: 'ऐ', romaji: 'ai' }, { glyph: 'ओ', romaji: 'o' }, { glyph: 'औ', romaji: 'au' },
            { glyph: 'अं', romaji: 'am' }, { glyph: 'अः', romaji: 'ah' }
          ]}
        ]
      },
      {
        id: 'hi-consonants',
        label: 'All Vyanjan (व्यंजन · 44)',
        note: 'All 33 standard Devanagari consonants plus Sankyuktakshar conjuncts and modern Nukta consonants.',
        rows: [
          { group: 'Ka-varg (Velar)', chars: [
            { glyph: 'क', romaji: 'ka' }, { glyph: 'ख', romaji: 'kha' }, { glyph: 'ग', romaji: 'ga' }, { glyph: 'घ', romaji: 'gha' }, { glyph: 'ङ', romaji: 'nga' }
          ]},
          { group: 'Cha-varg (Palatal)', chars: [
            { glyph: 'च', romaji: 'cha' }, { glyph: 'छ', romaji: 'chha' }, { glyph: 'ज', romaji: 'ja' }, { glyph: 'झ', romaji: 'jha' }, { glyph: 'ञ', romaji: 'nya' }
          ]},
          { group: 'Ta-varg (Retroflex)', chars: [
            { glyph: 'ट', romaji: 'ta' }, { glyph: 'ठ', romaji: 'tha' }, { glyph: 'ड', romaji: 'da' }, { glyph: 'ढ', romaji: 'dha' }, { glyph: 'ण', romaji: 'na' }
          ]},
          { group: 'Ta-varg (Dental)', chars: [
            { glyph: 'त', romaji: 'ta (soft)' }, { glyph: 'थ', romaji: 'tha' }, { glyph: 'द', romaji: 'da' }, { glyph: 'ध', romaji: 'dha' }, { glyph: 'न', romaji: 'na' }
          ]},
          { group: 'Pa-varg (Labial)', chars: [
            { glyph: 'प', romaji: 'pa' }, { glyph: 'फ', romaji: 'pha' }, { glyph: 'ब', romaji: 'ba' }, { glyph: 'भ', romaji: 'bha' }, { glyph: 'म', romaji: 'ma' }
          ]},
          { group: 'Antastha & Ushma (Liquids & Sibilants)', chars: [
            { glyph: 'य', romaji: 'ya' }, { glyph: 'र', romaji: 'ra' }, { glyph: 'ल', romaji: 'la' }, { glyph: 'व', romaji: 'va' },
            { glyph: 'श', romaji: 'sha' }, { glyph: 'ष', romaji: 'ssha' }, { glyph: 'स', romaji: 'sa' }, { glyph: 'ह', romaji: 'ha' }
          ]},
          { group: 'Sankyuktakshar & Nukta Consonants', chars: [
            { glyph: 'क्ष', romaji: 'ksha' }, { glyph: 'त्र', romaji: 'tra' }, { glyph: 'ज्ञ', romaji: 'gya' }, { glyph: 'श्र', romaji: 'shra' },
            { glyph: 'ड़', romaji: 'ra (flap)' }, { glyph: 'ढ़', romaji: 'rha' }, { glyph: 'क़', romaji: 'qa' }, { glyph: 'ख़', romaji: 'kha' },
            { glyph: 'ग़', romaji: 'gha' }, { glyph: 'ज़', romaji: 'za' }, { glyph: 'फ़', romaji: 'fa' }
          ]}
        ]
      },
      {
        id: 'hi-matras',
        label: 'All Barakhadi (बारहखड़ी · 462)',
        note: 'Complete Barakhadi vowel combinations for all 33 Hindi consonants (क..क्, प..प्, म..म्, …).',
        rows: buildAbugidaRows(HI_CONSONANTS_FULL, HI_VOWEL_MARKS)
      }
    ]
  },

  ja: {
    title: 'Japanese Scripts (Kana & Kanji)',
    subtitle: 'Complete Gojuon, Dakuten/Handakuten, Yoon combinations for Hiragana & Katakana, plus 100 essential Kanji.',
    speechLocale: 'ja-JP',
    tabs: [
      {
        id: 'hiragana',
        label: 'Hiragana (ひらがな · 104)',
        note: 'All 46 basic Hiragana, 25 Dakuten/Handakuten voiced sounds, and 33 Yoon palatalized combinations.',
        rows: [
          { group: 'Vowels (a-row)', chars: [
            { glyph: 'あ', romaji: 'a' }, { glyph: 'い', romaji: 'i' }, { glyph: 'う', romaji: 'u' }, { glyph: 'え', romaji: 'e' }, { glyph: 'お', romaji: 'o' }
          ]},
          { group: 'K-row', chars: [
            { glyph: 'か', romaji: 'ka' }, { glyph: 'き', romaji: 'ki' }, { glyph: 'く', romaji: 'ku' }, { glyph: 'け', romaji: 'ke' }, { glyph: 'こ', romaji: 'ko' }
          ]},
          { group: 'S-row', chars: [
            { glyph: 'さ', romaji: 'sa' }, { glyph: 'し', romaji: 'shi' }, { glyph: 'す', romaji: 'su' }, { glyph: 'せ', romaji: 'se' }, { glyph: 'そ', romaji: 'so' }
          ]},
          { group: 'T-row', chars: [
            { glyph: 'た', romaji: 'ta' }, { glyph: 'ち', romaji: 'chi' }, { glyph: 'つ', romaji: 'tsu' }, { glyph: 'て', romaji: 'te' }, { glyph: 'と', romaji: 'to' }
          ]},
          { group: 'N-row', chars: [
            { glyph: 'な', romaji: 'na' }, { glyph: 'に', romaji: 'ni' }, { glyph: 'ぬ', romaji: 'nu' }, { glyph: 'ね', romaji: 'ne' }, { glyph: 'の', romaji: 'no' }
          ]},
          { group: 'H-row', chars: [
            { glyph: 'は', romaji: 'ha' }, { glyph: 'ひ', romaji: 'hi' }, { glyph: 'ふ', romaji: 'fu' }, { glyph: 'へ', romaji: 'he' }, { glyph: 'ほ', romaji: 'ho' }
          ]},
          { group: 'M-row', chars: [
            { glyph: 'ま', romaji: 'ma' }, { glyph: 'み', romaji: 'mi' }, { glyph: 'む', romaji: 'mu' }, { glyph: 'め', romaji: 'me' }, { glyph: 'も', romaji: 'mo' }
          ]},
          { group: 'Y-row', chars: [
            { glyph: 'や', romaji: 'ya' }, { glyph: 'ゆ', romaji: 'yu' }, { glyph: 'よ', romaji: 'yo' }
          ]},
          { group: 'R-row', chars: [
            { glyph: 'ら', romaji: 'ra' }, { glyph: 'り', romaji: 'ri' }, { glyph: 'る', romaji: 'ru' }, { glyph: 'れ', romaji: 're' }, { glyph: 'ろ', romaji: 'ro' }
          ]},
          { group: 'W-row & N', chars: [
            { glyph: 'わ', romaji: 'wa' }, { glyph: 'を', romaji: 'wo' }, { glyph: 'ん', romaji: 'n' }
          ]},
          { group: 'Dakuten & Handakuten (濁音・半濁音 · 25)', chars: [
            { glyph: 'が', romaji: 'ga' }, { glyph: 'ぎ', romaji: 'gi' }, { glyph: 'ぐ', romaji: 'gu' }, { glyph: 'げ', romaji: 'ge' }, { glyph: 'ご', romaji: 'go' },
            { glyph: 'ざ', romaji: 'za' }, { glyph: 'じ', romaji: 'ji' }, { glyph: 'ず', romaji: 'zu' }, { glyph: 'ぜ', romaji: 'ze' }, { glyph: 'ぞ', romaji: 'zo' },
            { glyph: 'だ', romaji: 'da' }, { glyph: 'ぢ', romaji: 'ji' }, { glyph: 'づ', romaji: 'zu' }, { glyph: 'で', romaji: 'de' }, { glyph: 'ど', romaji: 'do' },
            { glyph: 'ば', romaji: 'ba' }, { glyph: 'び', romaji: 'bi' }, { glyph: 'ぶ', romaji: 'bu' }, { glyph: 'べ', romaji: 'be' }, { glyph: 'ぼ', romaji: 'bo' },
            { glyph: 'ぱ', romaji: 'pa' }, { glyph: 'ぴ', romaji: 'pi' }, { glyph: 'ぷ', romaji: 'pu' }, { glyph: 'ぺ', romaji: 'pe' }, { glyph: 'ぽ', romaji: 'po' }
          ]},
          { group: 'Yoon Combinations (拗音 · 33)', chars: [
            { glyph: 'きゃ', romaji: 'kya' }, { glyph: 'きゅ', romaji: 'kyu' }, { glyph: 'きょ', romaji: 'kyo' },
            { glyph: 'しゃ', romaji: 'sha' }, { glyph: 'しゅ', romaji: 'shu' }, { glyph: 'しょ', romaji: 'sho' },
            { glyph: 'ちゃ', romaji: 'cha' }, { glyph: 'ちゅ', romaji: 'chu' }, { glyph: 'ちょ', romaji: 'cho' },
            { glyph: 'にゃ', romaji: 'nya' }, { glyph: 'にゅ', romaji: 'nyu' }, { glyph: 'にょ', romaji: 'nyo' },
            { glyph: 'ひゃ', romaji: 'hya' }, { glyph: 'ひゅ', romaji: 'hyu' }, { glyph: 'ひょ', romaji: 'hyo' },
            { glyph: 'みゃ', romaji: 'mya' }, { glyph: 'みゅ', romaji: 'myu' }, { glyph: 'みょ', romaji: 'myo' },
            { glyph: 'りゃ', romaji: 'rya' }, { glyph: 'りゅ', romaji: 'ryu' }, { glyph: 'りょ', romaji: 'ryo' },
            { glyph: 'ぎゃ', romaji: 'gya' }, { glyph: 'ぎゅ', romaji: 'gyu' }, { glyph: 'ぎょ', romaji: 'gyo' },
            { glyph: 'じゃ', romaji: 'ja' }, { glyph: 'じゅ', romaji: 'ju' }, { glyph: 'じょ', romaji: 'jo' },
            { glyph: 'びゃ', romaji: 'bya' }, { glyph: 'びゅ', romaji: 'byu' }, { glyph: 'びょ', romaji: 'byo' },
            { glyph: 'ぴゃ', romaji: 'pya' }, { glyph: 'ぴゅ', romaji: 'pyu' }, { glyph: 'ぴょ', romaji: 'pyo' }
          ]}
        ]
      },
      {
        id: 'katakana',
        label: 'Katakana (カタカナ · 104)',
        note: 'All 46 basic Katakana, 25 Dakuten/Handakuten sounds, and 33 Yoon combinations for loanwords & foreign names.',
        rows: [
          { group: 'Vowels (a-row)', chars: [
            { glyph: 'ア', romaji: 'a' }, { glyph: 'イ', romaji: 'i' }, { glyph: 'ウ', romaji: 'u' }, { glyph: 'エ', romaji: 'e' }, { glyph: 'オ', romaji: 'o' }
          ]},
          { group: 'K-row', chars: [
            { glyph: 'カ', romaji: 'ka' }, { glyph: 'キ', romaji: 'ki' }, { glyph: 'ク', romaji: 'ku' }, { glyph: 'ケ', romaji: 'ke' }, { glyph: 'コ', romaji: 'ko' }
          ]},
          { group: 'S-row', chars: [
            { glyph: 'サ', romaji: 'sa' }, { glyph: 'シ', romaji: 'shi' }, { glyph: 'ス', romaji: 'su' }, { glyph: 'セ', romaji: 'se' }, { glyph: 'ソ', romaji: 'so' }
          ]},
          { group: 'T-row', chars: [
            { glyph: 'タ', romaji: 'ta' }, { glyph: 'チ', romaji: 'chi' }, { glyph: 'ツ', romaji: 'tsu' }, { glyph: 'テ', romaji: 'te' }, { glyph: 'ト', romaji: 'to' }
          ]},
          { group: 'N-row', chars: [
            { glyph: 'ナ', romaji: 'na' }, { glyph: 'ニ', romaji: 'ni' }, { glyph: 'ヌ', romaji: 'nu' }, { glyph: 'ネ', romaji: 'ne' }, { glyph: 'ノ', romaji: 'no' }
          ]},
          { group: 'H-row', chars: [
            { glyph: 'ハ', romaji: 'ha' }, { glyph: 'ヒ', romaji: 'hi' }, { glyph: 'フ', romaji: 'fu' }, { glyph: 'ヘ', romaji: 'he' }, { glyph: 'ホ', romaji: 'ho' }
          ]},
          { group: 'M-row', chars: [
            { glyph: 'マ', romaji: 'ma' }, { glyph: 'ミ', romaji: 'mi' }, { glyph: 'ム', romaji: 'mu' }, { glyph: 'メ', romaji: 'me' }, { glyph: 'モ', romaji: 'mo' }
          ]},
          { group: 'Y-row', chars: [
            { glyph: 'ヤ', romaji: 'ya' }, { glyph: 'ユ', romaji: 'yu' }, { glyph: 'ヨ', romaji: 'yo' }
          ]},
          { group: 'R-row', chars: [
            { glyph: 'ラ', romaji: 'ra' }, { glyph: 'リ', romaji: 'ri' }, { glyph: 'ル', romaji: 'ru' }, { glyph: 'レ', romaji: 're' }, { glyph: 'ロ', romaji: 'ro' }
          ]},
          { group: 'W-row & N', chars: [
            { glyph: 'ワ', romaji: 'wa' }, { glyph: 'ヲ', romaji: 'wo' }, { glyph: 'ン', romaji: 'n' }
          ]},
          { group: 'Dakuten & Handakuten (濁音・半濁音 · 25)', chars: [
            { glyph: 'ガ', romaji: 'ga' }, { glyph: 'ギ', romaji: 'gi' }, { glyph: 'グ', romaji: 'gu' }, { glyph: 'ゲ', romaji: 'ge' }, { glyph: 'ゴ', romaji: 'go' },
            { glyph: 'ザ', romaji: 'za' }, { glyph: 'ジ', romaji: 'ji' }, { glyph: 'ズ', romaji: 'zu' }, { glyph: 'ゼ', romaji: 'ze' }, { glyph: 'ゾ', romaji: 'zo' },
            { glyph: 'ダ', romaji: 'da' }, { glyph: 'ヂ', romaji: 'ji' }, { glyph: 'ヅ', romaji: 'zu' }, { glyph: 'デ', romaji: 'de' }, { glyph: 'ド', romaji: 'do' },
            { glyph: 'バ', romaji: 'ba' }, { glyph: 'ビ', romaji: 'bi' }, { glyph: 'ブ', romaji: 'bu' }, { glyph: 'ベ', romaji: 'be' }, { glyph: 'ボ', romaji: 'bo' },
            { glyph: 'パ', romaji: 'pa' }, { glyph: 'ピ', romaji: 'pi' }, { glyph: 'プ', romaji: 'pu' }, { glyph: 'ペ', romaji: 'pe' }, { glyph: 'ポ', romaji: 'po' }
          ]},
          { group: 'Yoon Combinations (拗音 · 33)', chars: [
            { glyph: 'キャ', romaji: 'kya' }, { glyph: 'キュ', romaji: 'kyu' }, { glyph: 'キョ', romaji: 'kyo' },
            { glyph: 'シャ', romaji: 'sha' }, { glyph: 'シュ', romaji: 'shu' }, { glyph: 'ショ', romaji: 'sho' },
            { glyph: 'チャ', romaji: 'cha' }, { glyph: 'チュ', romaji: 'chu' }, { glyph: 'チョ', romaji: 'cho' },
            { glyph: 'ニャ', romaji: 'nya' }, { glyph: 'ニュ', romaji: 'nyu' }, { glyph: 'ニョ', romaji: 'nyo' },
            { glyph: 'ヒャ', romaji: 'hya' }, { glyph: 'ヒュ', romaji: 'hyu' }, { glyph: 'ヒョ', romaji: 'hyo' },
            { glyph: 'ミャ', romaji: 'mya' }, { glyph: 'ミュ', romaji: 'myu' }, { glyph: 'ミョ', romaji: 'myo' },
            { glyph: 'リャ', romaji: 'rya' }, { glyph: 'リュ', romaji: 'ryu' }, { glyph: 'リョ', romaji: 'ryo' },
            { glyph: 'ギャ', romaji: 'gya' }, { glyph: 'ギュ', romaji: 'gyu' }, { glyph: 'ギョ', romaji: 'gyo' },
            { glyph: 'ジャ', romaji: 'ja' }, { glyph: 'ジュ', romaji: 'ju' }, { glyph: 'ジョ', romaji: 'jo' },
            { glyph: 'ビャ', romaji: 'bya' }, { glyph: 'ビュ', romaji: 'byu' }, { glyph: 'ビョ', romaji: 'byo' },
            { glyph: 'ピャ', romaji: 'pya' }, { glyph: 'ピュ', romaji: 'pyu' }, { glyph: 'ピョ', romaji: 'pyo' }
          ]}
        ]
      },
      {
        id: 'kanji',
        label: 'Essential Kanji (漢字 · 100)',
        note: '100 essential JLPT N5–N4 Kanji grouped by theme. Tap any Kanji to hear pronunciation and master handwriting.',
        rows: [
          { group: 'Numbers & Money', chars: [
            { glyph: '一', romaji: 'ichi · 1' }, { glyph: '二', romaji: 'ni · 2' }, { glyph: '三', romaji: 'san · 3' }, { glyph: '四', romaji: 'yon · 4' }, { glyph: '五', romaji: 'go · 5' },
            { glyph: '六', romaji: 'roku · 6' }, { glyph: '七', romaji: 'nana · 7' }, { glyph: '八', romaji: 'hachi · 8' }, { glyph: '九', romaji: 'kyuu · 9' }, { glyph: '十', romaji: 'juu · 10' },
            { glyph: '百', romaji: 'hyaku · 100' }, { glyph: '千', romaji: 'sen · 1000' }, { glyph: '万', romaji: 'man · 10k' }, { glyph: '円', romaji: 'en · yen' }
          ]},
          { group: 'Time & Days', chars: [
            { glyph: '日', romaji: 'nichi · sun/day' }, { glyph: '月', romaji: 'tsuki · moon/month' }, { glyph: '火', romaji: 'hi · fire' }, { glyph: '水', romaji: 'mizu · water' }, { glyph: '木', romaji: 'ki · tree' },
            { glyph: '金', romaji: 'kane · gold/money' }, { glyph: '土', romaji: 'tsuchi · earth' }, { glyph: '年', romaji: 'toshi · year' }, { glyph: '時', romaji: 'toki · time' }, { glyph: '分', romaji: 'fun · minute' },
            { glyph: '半', romaji: 'han · half' }, { glyph: '今', romaji: 'ima · now' }, { glyph: '週', romaji: 'shuu · week' }, { glyph: '毎', romaji: 'mai · every' },
            { glyph: '朝', romaji: 'asa · morning' }, { glyph: '昼', romaji: 'hiru · noon' }, { glyph: '夜', romaji: 'yoru · night' }, { glyph: '春', romaji: 'haru · spring' }
          ]},
          { group: 'People & Body', chars: [
            { glyph: '人', romaji: 'hito · person' }, { glyph: '私', romaji: 'watashi · I' }, { glyph: '子', romaji: 'ko · child' }, { glyph: '女', romaji: 'onna · woman' }, { glyph: '男', romaji: 'otoko · man' },
            { glyph: '父', romaji: 'chichi · father' }, { glyph: '母', romaji: 'haha · mother' }, { glyph: '友', romaji: 'tomo · friend' }, { glyph: '先', romaji: 'saki · ahead' }, { glyph: '生', romaji: 'sei · life' },
            { glyph: '名', romaji: 'na · name' }, { glyph: '目', romaji: 'me · eye' }, { glyph: '口', romaji: 'kuchi · mouth' }, { glyph: '手', romaji: 'te · hand' }, { glyph: '足', romaji: 'ashi · foot' },
            { glyph: '耳', romaji: 'mimi · ear' }, { glyph: '心', romaji: 'kokoro · heart' }, { glyph: '体', romaji: 'karada · body' }
          ]},
          { group: 'Nature & Directions', chars: [
            { glyph: '山', romaji: 'yama · mountain' }, { glyph: '川', romaji: 'kawa · river' }, { glyph: '雨', romaji: 'ame · rain' }, { glyph: '天', romaji: 'ten · heaven' }, { glyph: '気', romaji: 'ki · spirit/air' },
            { glyph: '花', romaji: 'hana · flower' }, { glyph: '空', romaji: 'sora · sky' }, { glyph: '海', romaji: 'umi · sea' }, { glyph: '風', romaji: 'kaze · wind' },
            { glyph: '上', romaji: 'ue · up' }, { glyph: '下', romaji: 'shita · down' }, { glyph: '左', romaji: 'hidari · left' }, { glyph: '右', romaji: 'migi · right' },
            { glyph: '中', romaji: 'naka · inside' }, { glyph: '外', romaji: 'soto · outside' }, { glyph: '北', romaji: 'kita · north' }, { glyph: '南', romaji: 'minami · south' },
            { glyph: '東', romaji: 'higashi · east' }, { glyph: '西', romaji: 'nishi · west' }
          ]},
          { group: 'Places, Verbs & Qualities', chars: [
            { glyph: '国', romaji: 'kuni · country' }, { glyph: '学', romaji: 'gaku · study' }, { glyph: '校', romaji: 'kou · school' }, { glyph: '駅', romaji: 'eki · station' }, { glyph: '店', romaji: 'mise · shop' },
            { glyph: '家', romaji: 'ie · house' }, { glyph: '道', romaji: 'michi · road' }, { glyph: '車', romaji: 'kuruma · car' }, { glyph: '電', romaji: 'den · electric' }, { glyph: '本', romaji: 'hon · book' },
            { glyph: '語', romaji: 'go · language' }, { glyph: '話', romaji: 'hanasu · speak' }, { glyph: '見', romaji: 'miru · see' }, { glyph: '聞', romaji: 'kiku · hear' },
            { glyph: '行', romaji: 'iku · go' }, { glyph: '来', romaji: 'kuru · come' }, { glyph: '食', romaji: 'taberu · eat' }, { glyph: '飲', romaji: 'nomu · drink' },
            { glyph: '読', romaji: 'yomu · read' }, { glyph: '書', romaji: 'kaku · write' }, { glyph: '買', romaji: 'kau · buy' }, { glyph: '作', romaji: 'tsukuru · make' },
            { glyph: '思', romaji: 'omou · think' }, { glyph: '知', romaji: 'shiru · know' }, { glyph: '大', romaji: 'ookii · big' }, { glyph: '小', romaji: 'chiisai · small' },
            { glyph: '新', romaji: 'atarashii · new' }, { glyph: '古', romaji: 'furui · old' }, { glyph: '高', romaji: 'takai · high' }, { glyph: '安', romaji: 'yasui · cheap' },
            { glyph: '多', romaji: 'ooi · many' }
          ]}
        ]
      }
    ]
  },

  zh: {
    title: 'Mandarin Chinese (拼音与汉字)',
    subtitle: 'Master all 4 Pinyin tones, 23 initials, 24 core radicals, and 80 essential HSK 1–3 Simplified Hanzi.',
    speechLocale: 'zh-CN',
    tabs: [
      {
        id: 'zh-pinyin',
        label: 'Pinyin Tones & Sounds (拼音)',
        note: 'Mandarin uses 4 lexical tones plus a neutral tone, 23 consonant initials, and compound vowel finals.',
        rows: [
          { group: 'Four Tones (四声)', chars: [
            { glyph: 'ā', romaji: '1st · high flat' }, { glyph: 'á', romaji: '2nd · rising' },
            { glyph: 'ǎ', romaji: '3rd · dip & rise' }, { glyph: 'à', romaji: '4th · sharp fall' }
          ]},
          { group: 'All 23 Pinyin Initials (声母)', chars: [
            { glyph: 'b', romaji: 'bo' }, { glyph: 'p', romaji: 'po' }, { glyph: 'm', romaji: 'mo' }, { glyph: 'f', romaji: 'fo' },
            { glyph: 'd', romaji: 'de' }, { glyph: 't', romaji: 'te' }, { glyph: 'n', romaji: 'ne' }, { glyph: 'l', romaji: 'le' },
            { glyph: 'g', romaji: 'ge' }, { glyph: 'k', romaji: 'ke' }, { glyph: 'h', romaji: 'he' },
            { glyph: 'j', romaji: 'ji' }, { glyph: 'q', romaji: 'qi' }, { glyph: 'x', romaji: 'xi' },
            { glyph: 'zh', romaji: 'zhi' }, { glyph: 'ch', romaji: 'chi' }, { glyph: 'sh', romaji: 'shi' }, { glyph: 'r', romaji: 'ri' },
            { glyph: 'z', romaji: 'zi' }, { glyph: 'c', romaji: 'ci' }, { glyph: 's', romaji: 'si' }, { glyph: 'y', romaji: 'yi' }, { glyph: 'w', romaji: 'wu' }
          ]}
        ]
      },
      {
        id: 'zh-radicals',
        label: 'Core Radicals (部首 · 24)',
        note: 'Learn these 24 high-frequency semantic radicals to decode hundreds of compound Chinese characters.',
        rows: [
          { group: 'Essential Semantic Radicals', chars: [
            { glyph: '亻', romaji: 'person' }, { glyph: '女', romaji: 'woman' }, { glyph: '口', romaji: 'mouth' }, { glyph: '讠', romaji: 'speech' },
            { glyph: '氵', romaji: 'water' }, { glyph: '火', romaji: 'fire' }, { glyph: '木', romaji: 'wood/tree' }, { glyph: '艹', romaji: 'grass/plant' },
            { glyph: '土', romaji: 'earth' }, { glyph: '金', romaji: 'metal/gold' }, { glyph: '日', romaji: 'sun/day' }, { glyph: '月', romaji: 'moon/flesh' },
            { glyph: '心', romaji: 'heart' }, { glyph: '忄', romaji: 'emotion' }, { glyph: '扌', romaji: 'hand/action' }, { glyph: '足', romaji: 'foot' },
            { glyph: '目', romaji: 'eye' }, { glyph: '宀', romaji: 'roof/home' }, { glyph: '辶', romaji: 'walk/path' }, { glyph: '饣', romaji: 'food' },
            { glyph: '纟', romaji: 'silk/thread' }, { glyph: '门', romaji: 'gate/door' }, { glyph: '车', romaji: 'vehicle' }, { glyph: '贝', romaji: 'money/shell' }
          ]}
        ]
      },
      {
        id: 'zh-core',
        label: 'Essential Hanzi (汉字 · 80)',
        note: '80 foundational HSK 1–3 Simplified Hanzi characters with Pinyin tones.',
        rows: [
          { group: 'Numbers & Time', chars: [
            { glyph: '一', romaji: 'yī · 1' }, { glyph: '二', romaji: 'èr · 2' }, { glyph: '三', romaji: 'sān · 3' }, { glyph: '四', romaji: 'sì · 4' }, { glyph: '五', romaji: 'wǔ · 5' },
            { glyph: '六', romaji: 'liù · 6' }, { glyph: '七', romaji: 'qī · 7' }, { glyph: '八', romaji: 'bā · 8' }, { glyph: '九', romaji: 'jiǔ · 9' }, { glyph: '十', romaji: 'shí · 10' },
            { glyph: '百', romaji: 'bǎi · 100' }, { glyph: '千', romaji: 'qiān · 1000' }, { glyph: '年', romaji: 'nián · year' }, { glyph: '月', romaji: 'yuè · month' }, { glyph: '日', romaji: 'rì · day' },
            { glyph: '时', romaji: 'shí · time' }, { glyph: '今', romaji: 'jīn · today' }, { glyph: '明', romaji: 'míng · bright' }
          ]},
          { group: 'People, Family & Nature', chars: [
            { glyph: '人', romaji: 'rén · person' }, { glyph: '我', romaji: 'wǒ · I' }, { glyph: '你', romaji: 'nǐ · you' }, { glyph: '他', romaji: 'tā · he' }, { glyph: '她', romaji: 'tā · she' },
            { glyph: '们', romaji: 'men · plural' }, { glyph: '家', romaji: 'jiā · home' }, { glyph: '友', romaji: 'yǒu · friend' }, { glyph: '老', romaji: 'lǎo · old' }, { glyph: '师', romaji: 'shī · teacher' },
            { glyph: '水', romaji: 'shuǐ · water' }, { glyph: '火', romaji: 'huǒ · fire' }, { glyph: '山', romaji: 'shān · mountain' }, { glyph: '木', romaji: 'mù · tree' }, { glyph: '天', romaji: 'tiān · sky' },
            { glyph: '雨', romaji: 'yǔ · rain' }, { glyph: '风', romaji: 'fēng · wind' }, { glyph: '花', romaji: 'huā · flower' }, { glyph: '心', romaji: 'xīn · heart' }, { glyph: '手', romaji: 'shǒu · hand' }
          ]},
          { group: 'Core Verbs & Daily Life', chars: [
            { glyph: '是', romaji: 'shì · be' }, { glyph: '有', romaji: 'yǒu · have' }, { glyph: '在', romaji: 'zài · at' }, { glyph: '去', romaji: 'qù · go' }, { glyph: '来', romaji: 'lái · come' },
            { glyph: '吃', romaji: 'chī · eat' }, { glyph: '喝', romaji: 'hē · drink' }, { glyph: '看', romaji: 'kàn · look' }, { glyph: '听', romaji: 'tīng · listen' }, { glyph: '说', romaji: 'shuō · speak' },
            { glyph: '读', romaji: 'dú · read' }, { glyph: '写', romaji: 'xiě · write' }, { glyph: '学', romaji: 'xué · study' }, { glyph: '买', romaji: 'mǎi · buy' }, { glyph: '做', romaji: 'zuò · do' },
            { glyph: '想', romaji: 'xiǎng · think' }, { glyph: '知', romaji: 'zhī · know' }, { glyph: '爱', romaji: 'ài · love' }, { glyph: '给', romaji: 'gěi · give' }, { glyph: '走', romaji: 'zǒu · walk' }
          ]},
          { group: 'Qualities, Places & Grammar', chars: [
            { glyph: '好', romaji: 'hǎo · good' }, { glyph: '大', romaji: 'dà · big' }, { glyph: '小', romaji: 'xiǎo · small' }, { glyph: '多', romaji: 'duō · many' }, { glyph: '少', romaji: 'shǎo · few' },
            { glyph: '新', romaji: 'xīn · new' }, { glyph: '高', romaji: 'gāo · tall' }, { glyph: '长', romaji: 'cháng · long' }, { glyph: '快', romaji: 'kuài · fast' }, { glyph: '慢', romaji: 'màn · slow' },
            { glyph: '中', romaji: 'zhōng · middle' }, { glyph: '国', romaji: 'guó · country' }, { glyph: '语', romaji: 'yǔ · language' }, { glyph: '书', romaji: 'shū · book' }, { glyph: '车', romaji: 'chē · car' },
            { glyph: '路', romaji: 'lù · road' }, { glyph: '电', romaji: 'diàn · electric' }, { glyph: '不', romaji: 'bù · not' }, { glyph: '的', romaji: 'de · possessive' }, { glyph: '吗', romaji: 'ma · question' },
            { glyph: '和', romaji: 'hé · and' }, { glyph: '很', romaji: 'hěn · very' }
          ]}
        ]
      }
    ]
  },

  ko: {
    title: 'Korean Hangul (한글 완전 정복)',
    subtitle: 'Master ALL 40 Hangul Jamo (14 basic + 5 double consonants, 10 basic + 11 compound vowels) and Batchim rules.',
    speechLocale: 'ko-KR',
    tabs: [
      {
        id: 'ko-consonants',
        label: 'All 19 Consonants (자음)',
        note: 'All 14 basic consonants and all 5 tense double consonants (쌍자음).',
        rows: [
          { group: '14 Basic Consonants (기본 자음)', chars: [
            { glyph: 'ㄱ', romaji: 'g / k' }, { glyph: 'ㄴ', romaji: 'n' }, { glyph: 'ㄷ', romaji: 'd / t' }, { glyph: 'ㄹ', romaji: 'r / l' }, { glyph: 'ㅁ', romaji: 'm' },
            { glyph: 'ㅂ', romaji: 'b / p' }, { glyph: 'ㅅ', romaji: 's / sh' }, { glyph: 'ㅇ', romaji: 'silent / ng' }, { glyph: 'ㅈ', romaji: 'j' }, { glyph: 'ㅊ', romaji: 'ch' },
            { glyph: 'ㅋ', romaji: 'k' }, { glyph: 'ㅌ', romaji: 't' }, { glyph: 'ㅍ', romaji: 'p' }, { glyph: 'ㅎ', romaji: 'h' }
          ]},
          { group: '5 Double Consonants (쌍자음)', chars: [
            { glyph: 'ㄲ', romaji: 'kk' }, { glyph: 'ㄸ', romaji: 'tt' }, { glyph: 'ㅃ', romaji: 'pp' }, { glyph: 'ㅆ', romaji: 'ss' }, { glyph: 'ㅉ', romaji: 'jj' }
          ]}
        ]
      },
      {
        id: 'ko-vowels',
        label: 'All 21 Vowels (모음)',
        note: 'All 10 basic vowels and all 11 compound vowels (이중모음).',
        rows: [
          { group: '10 Basic Vowels (기본 모음)', chars: [
            { glyph: 'ㅏ', romaji: 'a' }, { glyph: 'ㅑ', romaji: 'ya' }, { glyph: 'ㅓ', romaji: 'eo' }, { glyph: 'ㅕ', romaji: 'yeo' }, { glyph: 'ㅗ', romaji: 'o' },
            { glyph: 'ㅛ', romaji: 'yo' }, { glyph: 'ㅜ', romaji: 'u' }, { glyph: 'ㅠ', romaji: 'yu' }, { glyph: 'ㅡ', romaji: 'eu' }, { glyph: 'ㅣ', romaji: 'i' }
          ]},
          { group: 'All 11 Compound Vowels (복합 모음)', chars: [
            { glyph: 'ㅐ', romaji: 'ae' }, { glyph: 'ㅒ', romaji: 'yae' }, { glyph: 'ㅔ', romaji: 'e' }, { glyph: 'ㅖ', romaji: 'ye' },
            { glyph: 'ㅘ', romaji: 'wa' }, { glyph: 'ㅙ', romaji: 'wae' }, { glyph: 'ㅚ', romaji: 'oe' }, { glyph: 'ㅝ', romaji: 'wo' },
            { glyph: 'ㅞ', romaji: 'we' }, { glyph: 'ㅟ', romaji: 'wi' }, { glyph: 'ㅢ', romaji: 'ui' }
          ]}
        ]
      },
      {
        id: 'ko-blocks',
        label: 'Syllables & Batchim (받침)',
        note: 'How consonants and vowels combine into CV and CVC (Batchim final consonant) syllable blocks.',
        rows: [
          { group: 'Core Syllable Blocks', chars: [
            { glyph: '가', romaji: 'ga' }, { glyph: '나', romaji: 'na' }, { glyph: '다', romaji: 'da' }, { glyph: '라', romaji: 'ra' }, { glyph: '마', romaji: 'ma' },
            { glyph: '바', romaji: 'ba' }, { glyph: '사', romaji: 'sa' }, { glyph: '아', romaji: 'a' }, { glyph: '자', romaji: 'ja' }, { glyph: '하', romaji: 'ha' }
          ]},
          { group: '7 Final Batchim Sounds (받침 대표음)', chars: [
            { glyph: '각', romaji: 'gak (-k)' }, { glyph: '간', romaji: 'gan (-n)' }, { glyph: '갇', romaji: 'gat (-t)' }, { glyph: '갈', romaji: 'gal (-l)' },
            { glyph: '감', romaji: 'gam (-m)' }, { glyph: '갑', romaji: 'gap (-p)' }, { glyph: '강', romaji: 'gang (-ng)' }, { glyph: '한', romaji: 'han (Korea)' }
          ]}
        ]
      }
    ]
  },

  ar: {
    title: 'Arabic Script (الأبجدية العربية والتشكيل)',
    subtitle: 'Master all 28 Arabic letters (RTL), short vowel diacritics (Harakat), Hamza forms, and contextual shapes.',
    speechLocale: 'ar-SA',
    dir: 'rtl',
    tabs: [
      {
        id: 'ar-alphabet',
        label: 'All 28 Letters (الحروف)',
        note: 'Arabic reads right-to-left. Each card shows the letter with its name and sound.',
        rows: [
          { group: 'Alif – Zay (أ – ز)', chars: [
            { glyph: 'ا', romaji: 'alif (aa)' }, { glyph: 'ب', romaji: 'ba (b)' }, { glyph: 'ت', romaji: 'ta (t)' }, { glyph: 'ث', romaji: 'tha (th)' },
            { glyph: 'ج', romaji: 'jim (j)' }, { glyph: 'ح', romaji: 'ha (deep h)' }, { glyph: 'خ', romaji: 'kha (kh)' },
            { glyph: 'د', romaji: 'dal (d)' }, { glyph: 'ذ', romaji: 'dhal (dh)' }, { glyph: 'ر', romaji: 'ra (r)' }, { glyph: 'ز', romaji: 'zay (z)' }
          ]},
          { group: 'Sin – Qaf (س – ق)', chars: [
            { glyph: 'س', romaji: 'sin (s)' }, { glyph: 'ش', romaji: 'shin (sh)' }, { glyph: 'ص', romaji: 'sad (emphatic s)' }, { glyph: 'ض', romaji: 'dad (emphatic d)' },
            { glyph: 'ط', romaji: 'ta (emphatic t)' }, { glyph: 'ظ', romaji: 'za (emphatic z)' }, { glyph: 'ع', romaji: 'ayn' }, { glyph: 'غ', romaji: 'ghayn (gh)' },
            { glyph: 'ف', romaji: 'fa (f)' }, { glyph: 'ق', romaji: 'qaf (q)' }
          ]},
          { group: 'Kaf – Ya (ك – ي)', chars: [
            { glyph: 'ك', romaji: 'kaf (k)' }, { glyph: 'ل', romaji: 'lam (l)' }, { glyph: 'م', romaji: 'mim (m)' }, { glyph: 'ن', romaji: 'nun (n)' },
            { glyph: 'ه', romaji: 'ha (h)' }, { glyph: 'و', romaji: 'waw (w/uu)' }, { glyph: 'ي', romaji: 'ya (y/ii)' }
          ]}
        ]
      },
      {
        id: 'ar-harakat',
        label: 'Harakat & Special Forms (التشكيل)',
        note: 'Short vowel marks (Tashkeel/Harakat) demonstrated on ب, plus Hamza, Ta Marbuta, and Lam-Alif.',
        rows: [
          { group: 'Harakat Vowel Marks on ب', chars: [
            { glyph: 'بَ', romaji: 'ba (fatha)' }, { glyph: 'بِ', romaji: 'bi (kasra)' }, { glyph: 'بُ', romaji: 'bu (damma)' }, { glyph: 'بْ', romaji: 'b (sukun)' },
            { glyph: 'بّ', romaji: 'bb (shadda)' }, { glyph: 'بً', romaji: 'ban (tanween)' }, { glyph: 'بٍ', romaji: 'bin (tanween)' }, { glyph: 'بٌ', romaji: 'bun (tanween)' }
          ]},
          { group: 'Hamza & Special Letters', chars: [
            { glyph: 'ء', romaji: 'hamza (glottal)' }, { glyph: 'أ', romaji: 'alif hamza above' }, { glyph: 'إ', romaji: 'alif hamza below' }, { glyph: 'آ', romaji: 'alif madda (aa)' },
            { glyph: 'ؤ', romaji: 'waw hamza' }, { glyph: 'ئ', romaji: 'ya hamza' }, { glyph: 'ة', romaji: 'ta marbuta (-a/at)' }, { glyph: 'ى', romaji: 'alif maqsura (-aa)' }, { glyph: 'لا', romaji: 'lam-alif (laa)' }
          ]}
        ]
      }
    ]
  },

  ru: {
    title: 'Russian Cyrillic (Русский алфавит)',
    subtitle: 'Master all 33 Cyrillic letters (uppercase & lowercase), hard/soft vowel pairs, and pronunciation signs.',
    speechLocale: 'ru-RU',
    tabs: [
      {
        id: 'ru-cyrillic',
        label: 'All 33 Letters (Аа – Яя)',
        note: 'Complete Russian Cyrillic alphabet with uppercase/lowercase pairs and phonetic values.',
        rows: [
          { group: 'А – Й (11)', chars: [
            { glyph: 'Аа', romaji: 'a' }, { glyph: 'Бб', romaji: 'b' }, { glyph: 'Вв', romaji: 'v' }, { glyph: 'Гг', romaji: 'g' }, { glyph: 'Дд', romaji: 'd' },
            { glyph: 'Ее', romaji: 'ye' }, { glyph: 'Ёё', romaji: 'yo' }, { glyph: 'Жж', romaji: 'zh' }, { glyph: 'Зз', romaji: 'z' }, { glyph: 'Ии', romaji: 'i' }, { glyph: 'Йй', romaji: 'y (short)' }
          ]},
          { group: 'К – Х (12)', chars: [
            { glyph: 'Кк', romaji: 'k' }, { glyph: 'Лл', romaji: 'l' }, { glyph: 'Мм', romaji: 'm' }, { glyph: 'Нн', romaji: 'n' }, { glyph: 'Оо', romaji: 'o' },
            { glyph: 'Пп', romaji: 'p' }, { glyph: 'Рр', romaji: 'r (rolled)' }, { glyph: 'Сс', romaji: 's' }, { glyph: 'Тт', romaji: 't' }, { glyph: 'Уу', romaji: 'u' }, { glyph: 'Фф', romaji: 'f' }, { glyph: 'Хх', romaji: 'kh' }
          ]},
          { group: 'Ц – Я (10)', chars: [
            { glyph: 'Цц', romaji: 'ts' }, { glyph: 'Чч', romaji: 'ch' }, { glyph: 'Шш', romaji: 'sh (hard)' }, { glyph: 'Щщ', romaji: 'shch (soft)' },
            { glyph: 'Ъъ', romaji: 'hard sign' }, { glyph: 'Ыы', romaji: 'y (deep i)' }, { glyph: 'Ьь', romaji: 'soft sign' },
            { glyph: 'Ээ', romaji: 'e' }, { glyph: 'Юю', romaji: 'yu' }, { glyph: 'Яя', romaji: 'ya' }
          ]}
        ]
      },
      {
        id: 'ru-vowels',
        label: 'Hard & Soft Vowels (Гласные)',
        note: 'Russian has 5 hard vowels and 5 matching soft (iotated) vowels that palatalize the preceding consonant.',
        rows: [
          { group: '5 Hard Vowels', chars: [
            { glyph: 'А', romaji: 'a' }, { glyph: 'О', romaji: 'o' }, { glyph: 'У', romaji: 'u' }, { glyph: 'Э', romaji: 'e' }, { glyph: 'Ы', romaji: 'y' }
          ]},
          { group: '5 Matching Soft Vowels', chars: [
            { glyph: 'Я', romaji: 'ya (pairs А)' }, { glyph: 'Ё', romaji: 'yo (pairs О)' }, { glyph: 'Ю', romaji: 'yu (pairs У)' }, { glyph: 'Е', romaji: 'ye (pairs Э)' }, { glyph: 'И', romaji: 'i (pairs Ы)' }
          ]}
        ]
      }
    ]
  },

  es: {
    title: 'Spanish Alphabet, Accents & Sounds (Español)',
    subtitle: 'Master all 27 Spanish letters (A–Z + Ñ), stressed accents, digraphs, and inverted punctuation.',
    speechLocale: 'es-ES',
    tabs: [
      {
        id: 'es-alphabet',
        label: 'Full Alphabet (A–Z + Ñ · 27)',
        note: 'All 27 official letters of the Spanish alphabet with Spanish letter names.',
        rows: [
          { group: 'A – I', chars: [
            { glyph: 'A', romaji: 'a (ah)' }, { glyph: 'B', romaji: 'be' }, { glyph: 'C', romaji: 'ce' }, { glyph: 'D', romaji: 'de' }, { glyph: 'E', romaji: 'e (eh)' },
            { glyph: 'F', romaji: 'efe' }, { glyph: 'G', romaji: 'ge' }, { glyph: 'H', romaji: 'hache (silent)' }, { glyph: 'I', romaji: 'i (ee)' }
          ]},
          { group: 'J – R', chars: [
            { glyph: 'J', romaji: 'jota (h)' }, { glyph: 'K', romaji: 'ka' }, { glyph: 'L', romaji: 'ele' }, { glyph: 'M', romaji: 'eme' }, { glyph: 'N', romaji: 'ene' },
            { glyph: 'Ñ', romaji: 'eñe (ny)' }, { glyph: 'O', romaji: 'o (oh)' }, { glyph: 'P', romaji: 'pe' }, { glyph: 'Q', romaji: 'cu' }, { glyph: 'R', romaji: 'erre' }
          ]},
          { group: 'S – Z', chars: [
            { glyph: 'S', romaji: 'ese' }, { glyph: 'T', romaji: 'te' }, { glyph: 'U', romaji: 'u (oo)' }, { glyph: 'V', romaji: 'uve' },
            { glyph: 'W', romaji: 'uve doble' }, { glyph: 'X', romaji: 'equis' }, { glyph: 'Y', romaji: 'ye' }, { glyph: 'Z', romaji: 'zeta' }
          ]}
        ]
      },
      {
        id: 'es-special',
        label: 'Accents, Digraphs & Marks',
        note: 'Stressed vowel accents (tildes), key digraphs, and Spanish opening punctuation.',
        rows: [
          { group: 'Stressed Vowels & Diaeresis', chars: [
            { glyph: 'á', romaji: 'stressed a' }, { glyph: 'é', romaji: 'stressed e' }, { glyph: 'í', romaji: 'stressed i' },
            { glyph: 'ó', romaji: 'stressed o' }, { glyph: 'ú', romaji: 'stressed u' }, { glyph: 'ü', romaji: 'pronounced u (güe)' }
          ]},
          { group: 'Digraphs & Punctuation', chars: [
            { glyph: 'ñ', romaji: 'ny (mañana)' }, { glyph: 'ch', romaji: 'ch (chico)' }, { glyph: 'll', romaji: 'y (llamo)' },
            { glyph: 'rr', romaji: 'rolled r (perro)' }, { glyph: '¿', romaji: 'open question' }, { glyph: '¡', romaji: 'open exclaim' }
          ]}
        ]
      }
    ]
  },

  fr: {
    title: 'French Alphabet, Accents & Nasal Vowels (Français)',
    subtitle: 'Master all 26 letters, all 16 French accents & ligatures, and essential nasal vowel combinations.',
    speechLocale: 'fr-FR',
    tabs: [
      {
        id: 'fr-alphabet',
        label: 'Full Alphabet (A–Z · 26)',
        note: 'All 26 letters of the French alphabet with French pronunciation names.',
        rows: [
          { group: 'A – I', chars: [
            { glyph: 'A', romaji: 'ah' }, { glyph: 'B', romaji: 'bay' }, { glyph: 'C', romaji: 'say' }, { glyph: 'D', romaji: 'day' }, { glyph: 'E', romaji: 'euh' },
            { glyph: 'F', romaji: 'eff' }, { glyph: 'G', romaji: 'zhay' }, { glyph: 'H', romaji: 'ash' }, { glyph: 'I', romaji: 'ee' }
          ]},
          { group: 'J – R', chars: [
            { glyph: 'J', romaji: 'zhee' }, { glyph: 'K', romaji: 'kah' }, { glyph: 'L', romaji: 'ell' }, { glyph: 'M', romaji: 'emm' }, { glyph: 'N', romaji: 'enn' },
            { glyph: 'O', romaji: 'oh' }, { glyph: 'P', romaji: 'pay' }, { glyph: 'Q', romaji: 'kew' }, { glyph: 'R', romaji: 'air' }
          ]},
          { group: 'S – Z', chars: [
            { glyph: 'S', romaji: 'ess' }, { glyph: 'T', romaji: 'tay' }, { glyph: 'U', romaji: 'ew' }, { glyph: 'V', romaji: 'vay' },
            { glyph: 'W', romaji: 'double-vay' }, { glyph: 'X', romaji: 'eeks' }, { glyph: 'Y', romaji: 'ee-grek' }, { glyph: 'Z', romaji: 'zed' }
          ]}
        ]
      },
      {
        id: 'fr-accents',
        label: 'All 16 Accents & Combos',
        note: 'All French diacritics, ligatures (œ, æ), and essential nasal/vowel spelling rules.',
        rows: [
          { group: 'All 16 Accents & Ligatures', chars: [
            { glyph: 'é', romaji: 'aigu (ay)' }, { glyph: 'è', romaji: 'grave (eh)' }, { glyph: 'ê', romaji: 'circonflexe (eh)' }, { glyph: 'ë', romaji: 'tréma' },
            { glyph: 'à', romaji: 'a grave' }, { glyph: 'â', romaji: 'a circonflexe' }, { glyph: 'ç', romaji: 'cédille (s)' }, { glyph: 'ù', romaji: 'u grave' },
            { glyph: 'û', romaji: 'u circonflexe' }, { glyph: 'ü', romaji: 'u tréma' }, { glyph: 'î', romaji: 'i circonflexe' }, { glyph: 'ï', romaji: 'i tréma' },
            { glyph: 'ô', romaji: 'o circonflexe' }, { glyph: 'œ', romaji: 'e dans l’o' }, { glyph: 'æ', romaji: 'e dans l’a' }, { glyph: 'ÿ', romaji: 'y tréma' }
          ]},
          { group: 'Nasal Vowels & Key Digraphs', chars: [
            { glyph: 'an', romaji: 'nasal ahn' }, { glyph: 'en', romaji: 'nasal ahn' }, { glyph: 'in', romaji: 'nasal an' }, { glyph: 'on', romaji: 'nasal ohn' },
            { glyph: 'un', romaji: 'nasal euhn' }, { glyph: 'eau', romaji: 'oh' }, { glyph: 'ou', romaji: 'oo' }, { glyph: 'oi', romaji: 'wa' },
            { glyph: 'ch', romaji: 'sh' }, { glyph: 'gn', romaji: 'ny (montagne)' }
          ]}
        ]
      }
    ]
  },

  en: {
    title: 'English Alphabet, Phonemes & Digraphs',
    subtitle: 'Master all 26 English letters, short & long vowels, consonant digraphs, diphthongs, and silent letters.',
    speechLocale: 'en-US',
    tabs: [
      {
        id: 'en-alphabet',
        label: 'Full Alphabet (A–Z · 26)',
        note: 'All 26 English letters with clear phonetic pronunciation.',
        rows: [
          { group: 'A – I', chars: [
            { glyph: 'A', romaji: 'ay / æ' }, { glyph: 'B', romaji: 'bee' }, { glyph: 'C', romaji: 'see (k/s)' }, { glyph: 'D', romaji: 'dee' }, { glyph: 'E', romaji: 'ee / eh' },
            { glyph: 'F', romaji: 'ef' }, { glyph: 'G', romaji: 'jee (g/j)' }, { glyph: 'H', romaji: 'aitch' }, { glyph: 'I', romaji: 'eye / ih' }
          ]},
          { group: 'J – R', chars: [
            { glyph: 'J', romaji: 'jay' }, { glyph: 'K', romaji: 'kay' }, { glyph: 'L', romaji: 'el' }, { glyph: 'M', romaji: 'em' }, { glyph: 'N', romaji: 'en' },
            { glyph: 'O', romaji: 'oh / aw' }, { glyph: 'P', romaji: 'pee' }, { glyph: 'Q', romaji: 'kyoo' }, { glyph: 'R', romaji: 'ar' }
          ]},
          { group: 'S – Z', chars: [
            { glyph: 'S', romaji: 'es' }, { glyph: 'T', romaji: 'tee' }, { glyph: 'U', romaji: 'yoo / uh' }, { glyph: 'V', romaji: 'vee' },
            { glyph: 'W', romaji: 'double-u' }, { glyph: 'X', romaji: 'eks' }, { glyph: 'Y', romaji: 'why' }, { glyph: 'Z', romaji: 'zee / zed' }
          ]}
        ]
      },
      {
        id: 'en-digraphs',
        label: 'Digraphs, Diphthongs & Silent Letters',
        note: 'Essential English multi-letter sound patterns for fluent reading and spelling.',
        rows: [
          { group: 'Consonant Digraphs', chars: [
            { glyph: 'th', romaji: 'think / this' }, { glyph: 'sh', romaji: 'ship' }, { glyph: 'ch', romaji: 'chair' }, { glyph: 'ph', romaji: 'phone (f)' },
            { glyph: 'wh', romaji: 'where' }, { glyph: 'ng', romaji: 'sing' }, { glyph: 'ck', romaji: 'clock (k)' }, { glyph: 'gh', romaji: 'laugh / night' }
          ]},
          { group: 'Vowel Teams & Diphthongs', chars: [
            { glyph: 'ai', romaji: 'rain (ay)' }, { glyph: 'ea', romaji: 'eat (ee)' }, { glyph: 'ee', romaji: 'see (ee)' }, { glyph: 'oa', romaji: 'boat (oh)' },
            { glyph: 'oo', romaji: 'moon / book' }, { glyph: 'ou', romaji: 'house (ow)' }, { glyph: 'ow', romaji: 'now / snow' }, { glyph: 'oi', romaji: 'coin (oy)' }
          ]},
          { group: 'Common Silent-Letter Pairs', chars: [
            { glyph: 'kn', romaji: 'know (n)' }, { glyph: 'wr', romaji: 'write (r)' }, { glyph: 'mb', romaji: 'climb (m)' }, { glyph: 'gn', romaji: 'sign (n)' }
          ]}
        ]
      }
    ]
  }
};

export function getScriptSetForCourse(course) {
  const code = course?.targetLang?.code || 'ja';
  return SCRIPT_SETS[code] || SCRIPT_SETS.ja;
}
