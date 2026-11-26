/**
 * Script & Character Trainer datasets per language.
 * Powers the Duolingo-style Characters tab (Hiragana, Katakana, Malayalam script, Spanish accents).
 */

export const SCRIPT_SETS = {
  ja: {
    title: 'Japanese Scripts (Kana)',
    subtitle: 'Tap any character to hear its pronunciation, then run a quick recognition drill.',
    speechLocale: 'ja-JP',
    tabs: [
      {
        id: 'hiragana',
        label: 'Hiragana (ひらがな)',
        note: 'The core phonetic alphabet used for native Japanese words and grammar endings (46 basic characters).',
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
          ]}
        ]
      },
      {
        id: 'katakana',
        label: 'Katakana (カタカナ)',
        note: 'Angular phonetic script used for loanwords (コーヒー, アプリ), foreign names, and emphasis (46 basic characters).',
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
          ]}
        ]
      }
    ]
  },
  ml: {
    title: 'Malayalam Script (മലയാളം ലിപി)',
    subtitle: 'Practice core Malayalam vowels (സ്വരങ്ങൾ) and essential consonants (വ്യഞ്ജനങ്ങൾ).',
    speechLocale: 'ml-IN',
    tabs: [
      {
        id: 'ml-vowels',
        label: 'Vowels (സ്വരങ്ങൾ)',
        note: 'Independent vowel letters used at the start of Malayalam words.',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'അ', romaji: 'a' }, { glyph: 'ആ', romaji: 'aa' }, { glyph: 'ഇ', romaji: 'i' }, { glyph: 'ഈ', romaji: 'ee' }, { glyph: 'ഉ', romaji: 'u' }, { glyph: 'ഊ', romaji: 'oo' }
          ]},
          { group: 'E, O & Diphthongs', chars: [
            { glyph: 'എ', romaji: 'e' }, { glyph: 'ഏ', romaji: 'ae' }, { glyph: 'ഐ', romaji: 'ai' }, { glyph: 'ഒ', romaji: 'o' }, { glyph: 'ഓ', romaji: 'oo' }, { glyph: 'ഔ', romaji: 'au' }
          ]}
        ]
      },
      {
        id: 'ml-consonants',
        label: 'Core Consonants (വ്യഞ്ജനങ്ങൾ)',
        note: 'High-frequency consonants with inherent "a" sound.',
        rows: [
          { group: 'K / C / T / P Series', chars: [
            { glyph: 'ക', romaji: 'ka' }, { glyph: 'ച', romaji: 'cha' }, { glyph: 'ട', romaji: 'ta' }, { glyph: 'ത', romaji: 'tha' }, { glyph: 'പ', romaji: 'pa' }
          ]},
          { group: 'Nasals & Liquids', chars: [
            { glyph: 'ന', romaji: 'na' }, { glyph: 'മ', romaji: 'ma' }, { glyph: 'യ', romaji: 'ya' }, { glyph: 'ര', romaji: 'ra' }, { glyph: 'ല', romaji: 'la' }
          ]},
          { group: 'Distinctive Malayalam Sounds', chars: [
            { glyph: 'വ', romaji: 'va' }, { glyph: 'ശ', romaji: 'sha' }, { glyph: 'സ', romaji: 'sa' }, { glyph: 'ഹ', romaji: 'ha' }, { glyph: 'ള', romaji: 'la (retroflex)' }, { glyph: 'ഴ', romaji: 'zha' }
          ]}
        ]
      }
    ]
  },
  es: {
    title: 'Spanish Special Letters & Sounds',
    subtitle: 'Master Spanish accents, ñ, rr, ll, and distinctive consonant sounds.',
    speechLocale: 'es-ES',
    tabs: [
      {
        id: 'es-special',
        label: 'Accents & Unique Sounds',
        note: 'Spanish spelling is highly phonetic once you master these key letters and stress marks.',
        rows: [
          { group: 'Distinctive Letters', chars: [
            { glyph: 'ñ', romaji: 'ny (mañana)' }, { glyph: 'll', romaji: 'y (llamo)' }, { glyph: 'rr', romaji: 'rolled r' }, { glyph: 'j', romaji: 'h (jugo)' }, { glyph: 'h', romaji: 'silent (hola)' }
          ]},
          { group: 'Stressed Vowels', chars: [
            { glyph: 'á', romaji: 'stressed a' }, { glyph: 'é', romaji: 'stressed e' }, { glyph: 'í', romaji: 'stressed i' }, { glyph: 'ó', romaji: 'stressed o' }, { glyph: 'ú', romaji: 'stressed u' }, { glyph: 'ü', romaji: 'pronounced u (pingüino)' }
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
