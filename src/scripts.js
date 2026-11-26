/**
 * Script & Character Trainer datasets per language.
 * Powers the Duolingo-style Characters tab (Hiragana, Katakana, Malayalam script, Spanish accents).
 */

export const SCRIPT_SETS = {
  ja: {
    title: 'Japanese Scripts (Kana & Kanji)',
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
      },
      {
        id: 'kanji',
        label: 'Basic Kanji (基本漢字)',
        note: '86 essential JLPT N5 foundational Kanji grouped by theme. Tap any Kanji to trace and master it in 3 passes.',
        rows: [
          { group: 'Numbers & Money', chars: [
            { glyph: '一', romaji: 'ichi · 1' }, { glyph: '二', romaji: 'ni · 2' }, { glyph: '三', romaji: 'san · 3' }, { glyph: '四', romaji: 'yon · 4' }, { glyph: '五', romaji: 'go · 5' },
            { glyph: '六', romaji: 'roku · 6' }, { glyph: '七', romaji: 'nana · 7' }, { glyph: '八', romaji: 'hachi · 8' }, { glyph: '九', romaji: 'kyuu · 9' }, { glyph: '十', romaji: 'juu · 10' },
            { glyph: '百', romaji: 'hyaku · 100' }, { glyph: '千', romaji: 'sen · 1000' }, { glyph: '万', romaji: 'man · 10k' }, { glyph: '円', romaji: 'en · yen' }
          ]},
          { group: 'Time & Days', chars: [
            { glyph: '日', romaji: 'nichi · sun/day' }, { glyph: '月', romaji: 'tsuki · moon/month' }, { glyph: '火', romaji: 'hi · fire' }, { glyph: '水', romaji: 'mizu · water' }, { glyph: '木', romaji: 'ki · tree' },
            { glyph: '金', romaji: 'kane · gold/money' }, { glyph: '土', romaji: 'tsuchi · earth' }, { glyph: '年', romaji: 'toshi · year' }, { glyph: '時', romaji: 'toki · time' }, { glyph: '分', romaji: 'fun · minute' },
            { glyph: '半', romaji: 'han · half' }, { glyph: '今', romaji: 'ima · now' }, { glyph: '週', romaji: 'shuu · week' }, { glyph: '毎', romaji: 'mai · every' }
          ]},
          { group: 'People & Body', chars: [
            { glyph: '人', romaji: 'hito · person' }, { glyph: '私', romaji: 'watashi · I' }, { glyph: '子', romaji: 'ko · child' }, { glyph: '女', romaji: 'onna · woman' }, { glyph: '男', romaji: 'otoko · man' },
            { glyph: '父', romaji: 'chichi · father' }, { glyph: '母', romaji: 'haha · mother' }, { glyph: '友', romaji: 'tomo · friend' }, { glyph: '先', romaji: 'saki · ahead' }, { glyph: '生', romaji: 'sei · life' },
            { glyph: '名', romaji: 'na · name' }, { glyph: '目', romaji: 'me · eye' }, { glyph: '口', romaji: 'kuchi · mouth' }, { glyph: '手', romaji: 'te · hand' }, { glyph: '足', romaji: 'ashi · foot' }, { glyph: '耳', romaji: 'mimi · ear' }
          ]},
          { group: 'Nature & Directions', chars: [
            { glyph: '山', romaji: 'yama · mountain' }, { glyph: '川', romaji: 'kawa · river' }, { glyph: '雨', romaji: 'ame · rain' }, { glyph: '天', romaji: 'ten · heaven' }, { glyph: '気', romaji: 'ki · spirit/air' },
            { glyph: '花', romaji: 'hana · flower' }, { glyph: '空', romaji: 'sora · sky' }, { glyph: '上', romaji: 'ue · up' }, { glyph: '下', romaji: 'shita · down' }, { glyph: '左', romaji: 'hidari · left' },
            { glyph: '右', romaji: 'migi · right' }, { glyph: '中', romaji: 'naka · inside' }, { glyph: '外', romaji: 'soto · outside' }, { glyph: '北', romaji: 'kita · north' }, { glyph: '南', romaji: 'minami · south' },
            { glyph: '東', romaji: 'higashi · east' }, { glyph: '西', romaji: 'nishi · west' }
          ]},
          { group: 'Places, Verbs & Adjectives', chars: [
            { glyph: '国', romaji: 'kuni · country' }, { glyph: '学', romaji: 'gaku · study' }, { glyph: '校', romaji: 'kou · school' }, { glyph: '駅', romaji: 'eki · station' }, { glyph: '店', romaji: 'mise · shop' },
            { glyph: '家', romaji: 'ie · house' }, { glyph: '道', romaji: 'michi · road' }, { glyph: '車', romaji: 'kuruma · car' }, { glyph: '電', romaji: 'den · electric' }, { glyph: '本', romaji: 'hon · book' },
            { glyph: '語', romaji: 'go · language' }, { glyph: '見', romaji: 'miru · see' }, { glyph: '聞', romaji: 'kiku · hear' }, { glyph: '行', romaji: 'iku · go' }, { glyph: '来', romaji: 'kuru · come' },
            { glyph: '食', romaji: 'taberu · eat' }, { glyph: '飲', romaji: 'nomu · drink' }, { glyph: '読', romaji: 'yomu · read' }, { glyph: '書', romaji: 'kaku · write' },
            { glyph: '大', romaji: 'ookii · big' }, { glyph: '小', romaji: 'chiisai · small' }, { glyph: '新', romaji: 'atarashii · new' }, { glyph: '古', romaji: 'furui · old' },
            { glyph: '高', romaji: 'takai · tall/high' }, { glyph: '安', romaji: 'yasui · cheap' }
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
    title: 'Spanish Letters, Accents & Handwriting',
    subtitle: 'Practice writing Spanish special letters, accents, words, and full sentences.',
    speechLocale: 'es-ES',
    tabs: [
      {
        id: 'es-special',
        label: 'Accents & Unique Sounds',
        note: 'Spanish spelling is highly phonetic once you master ñ, rolled rr, ll, and accent marks.',
        rows: [
          { group: 'Distinctive Letters', chars: [
            { glyph: 'ñ', romaji: 'ny (mañana)' }, { glyph: 'll', romaji: 'y (llamo)' }, { glyph: 'rr', romaji: 'rolled r' }, { glyph: 'j', romaji: 'h (jugo)' }, { glyph: 'h', romaji: 'silent (hola)' }, { glyph: '¿', romaji: 'open question' }, { glyph: '¡', romaji: 'open exclaim' }
          ]},
          { group: 'Stressed Vowels', chars: [
            { glyph: 'á', romaji: 'stressed a' }, { glyph: 'é', romaji: 'stressed e' }, { glyph: 'í', romaji: 'stressed i' }, { glyph: 'ó', romaji: 'stressed o' }, { glyph: 'ú', romaji: 'stressed u' }, { glyph: 'ü', romaji: 'pronounced u' }
          ]}
        ]
      },
      {
        id: 'es-alphabet',
        label: 'Alphabet (A–Z)',
        note: 'Practice crisp handwriting across the Spanish alphabet.',
        rows: [
          { group: 'A–I', chars: [
            { glyph: 'A', romaji: 'ah' }, { glyph: 'B', romaji: 'beh' }, { glyph: 'C', romaji: 'seh' }, { glyph: 'D', romaji: 'deh' }, { glyph: 'E', romaji: 'eh' }, { glyph: 'F', romaji: 'efe' }, { glyph: 'G', romaji: 'heh' }, { glyph: 'H', romaji: 'hache' }, { glyph: 'I', romaji: 'ee' }
          ]},
          { group: 'J–R', chars: [
            { glyph: 'J', romaji: 'hota' }, { glyph: 'K', romaji: 'kah' }, { glyph: 'L', romaji: 'ele' }, { glyph: 'M', romaji: 'eme' }, { glyph: 'N', romaji: 'ene' }, { glyph: 'Ñ', romaji: 'eñe' }, { glyph: 'O', romaji: 'oh' }, { glyph: 'P', romaji: 'peh' }, { glyph: 'Q', romaji: 'koo' }, { glyph: 'R', romaji: 'ere' }
          ]},
          { group: 'S–Z', chars: [
            { glyph: 'S', romaji: 'ese' }, { glyph: 'T', romaji: 'teh' }, { glyph: 'U', romaji: 'oo' }, { glyph: 'V', romaji: 'oo-beh' }, { glyph: 'W', romaji: 'doble u' }, { glyph: 'X', romaji: 'equis' }, { glyph: 'Y', romaji: 'ye' }, { glyph: 'Z', romaji: 'seta' }
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
