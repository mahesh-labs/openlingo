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
  },
  ta: {
    title: 'Tamil Script (தமிழ் எழுத்துக்கள்)',
    subtitle: 'Master Tamil Uyir (12 vowels) and Mei/Uyirmei consonants (18 core consonants).',
    speechLocale: 'ta-IN',
    tabs: [
      {
        id: 'ta-vowels',
        label: 'Uyir Vowels (உயிர்)',
        note: '12 Tamil vowels (short/long pairs) plus the Aytham (ஃ).',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'அ', romaji: 'a' }, { glyph: 'ஆ', romaji: 'aa' }, { glyph: 'இ', romaji: 'i' }, { glyph: 'ஈ', romaji: 'ee' }, { glyph: 'உ', romaji: 'u' }, { glyph: 'ஊ', romaji: 'oo' }
          ]},
          { group: 'E, O & Diphthongs', chars: [
            { glyph: 'எ', romaji: 'e' }, { glyph: 'ஏ', romaji: 'ae' }, { glyph: 'ஐ', romaji: 'ai' }, { glyph: 'ஒ', romaji: 'o' }, { glyph: 'ஓ', romaji: 'oo' }, { glyph: 'ஔ', romaji: 'au' }, { glyph: 'ஃ', romaji: 'akh' }
          ]}
        ]
      },
      {
        id: 'ta-consonants',
        label: 'Consonants (மெய்)',
        note: '18 classical Tamil consonants grouped by Hard (Vallinam), Soft (Mellinam), and Medium (Idaiyinam).',
        rows: [
          { group: 'Hard Consonants (வல்லினம்)', chars: [
            { glyph: 'க', romaji: 'ka' }, { glyph: 'ச', romaji: 'cha/sa' }, { glyph: 'ட', romaji: 'ta' }, { glyph: 'த', romaji: 'tha' }, { glyph: 'ப', romaji: 'pa' }, { glyph: 'ற', romaji: 'rra' }
          ]},
          { group: 'Soft Consonants (மெல்லினம்)', chars: [
            { glyph: 'ங', romaji: 'nga' }, { glyph: 'ஞ', romaji: 'nya' }, { glyph: 'ண', romaji: 'na (retroflex)' }, { glyph: 'ந', romaji: 'na' }, { glyph: 'ம', romaji: 'ma' }, { glyph: 'ன', romaji: 'na (alveolar)' }
          ]},
          { group: 'Medium Consonants (இடையினம்)', chars: [
            { glyph: 'ய', romaji: 'ya' }, { glyph: 'ர', romaji: 'ra' }, { glyph: 'ல', romaji: 'la' }, { glyph: 'வ', romaji: 'va' }, { glyph: 'ழ', romaji: 'zha' }, { glyph: 'ள', romaji: 'la (retroflex)' }
          ]}
        ]
      }
    ]
  },
  kn: {
    title: 'Kannada Script (ಕನ್ನಡ ಲಿಪಿ)',
    subtitle: 'Practice Kannada Swaragalu (vowels) and Vyanjanagalu (consonants).',
    speechLocale: 'kn-IN',
    tabs: [
      {
        id: 'kn-vowels',
        label: 'Swaragalu (ಸ್ವರಗಳು)',
        note: 'Core Kannada independent vowel letters.',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'ಅ', romaji: 'a' }, { glyph: 'ಆ', romaji: 'aa' }, { glyph: 'ಇ', romaji: 'i' }, { glyph: 'ಈ', romaji: 'ee' }, { glyph: 'ಉ', romaji: 'u' }, { glyph: 'ಊ', romaji: 'oo' }, { glyph: 'ಋ', romaji: 'ru' }
          ]},
          { group: 'E, O & Diphthongs', chars: [
            { glyph: 'ಎ', romaji: 'e' }, { glyph: 'ಏ', romaji: 'ae' }, { glyph: 'ಐ', romaji: 'ai' }, { glyph: 'ಒ', romaji: 'o' }, { glyph: 'ಓ', romaji: 'oo' }, { glyph: 'ಔ', romaji: 'au' }
          ]}
        ]
      },
      {
        id: 'kn-consonants',
        label: 'Vyanjanagalu (ವ್ಯಂಜನಗಳು)',
        note: 'Structured consonant rows across velar, palatal, retroflex, dental, and labial sounds.',
        rows: [
          { group: 'Ka & Cha Rows', chars: [
            { glyph: 'ಕ', romaji: 'ka' }, { glyph: 'ಖ', romaji: 'kha' }, { glyph: 'ಗ', romaji: 'ga' }, { glyph: 'ಘ', romaji: 'gha' }, { glyph: 'ಚ', romaji: 'cha' }, { glyph: 'ಜ', romaji: 'ja' }
          ]},
          { group: 'Ta, Tha & Pa Rows', chars: [
            { glyph: 'ಟ', romaji: 'ta' }, { glyph: 'ಡ', romaji: 'da' }, { glyph: 'ಣ', romaji: 'na' }, { glyph: 'ತ', romaji: 'tha' }, { glyph: 'ದ', romaji: 'dha' }, { glyph: 'ನ', romaji: 'na' }, { glyph: 'ಪ', romaji: 'pa' }, { glyph: 'ಬ', romaji: 'ba' }, { glyph: 'ಮ', romaji: 'ma' }
          ]},
          { group: 'Liquids & Sibilants', chars: [
            { glyph: 'ಯ', romaji: 'ya' }, { glyph: 'ರ', romaji: 'ra' }, { glyph: 'ಲ', romaji: 'la' }, { glyph: 'ವ', romaji: 'va' }, { glyph: 'ಶ', romaji: 'sha' }, { glyph: 'ಸ', romaji: 'sa' }, { glyph: 'ಹ', romaji: 'ha' }, { glyph: 'ಳ', romaji: 'la (retroflex)' }
          ]}
        ]
      }
    ]
  },
  te: {
    title: 'Telugu Script (తెలుగు లిపి)',
    subtitle: 'Practice Telugu Achulu (vowels) and Hallulu (consonants).',
    speechLocale: 'te-IN',
    tabs: [
      {
        id: 'te-vowels',
        label: 'Achulu (అచ్చులు)',
        note: 'Core Telugu vowel letters.',
        rows: [
          { group: 'Short & Long Vowels', chars: [
            { glyph: 'అ', romaji: 'a' }, { glyph: 'ఆ', romaji: 'aa' }, { glyph: 'ఇ', romaji: 'i' }, { glyph: 'ఈ', romaji: 'ee' }, { glyph: 'ఉ', romaji: 'u' }, { glyph: 'ఊ', romaji: 'oo' }, { glyph: 'ఋ', romaji: 'ru' }
          ]},
          { group: 'E, O & Diphthongs', chars: [
            { glyph: 'ఎ', romaji: 'e' }, { glyph: 'ఏ', romaji: 'ae' }, { glyph: 'ఐ', romaji: 'ai' }, { glyph: 'ఒ', romaji: 'o' }, { glyph: 'ఓ', romaji: 'oo' }, { glyph: 'ఔ', romaji: 'au' }
          ]}
        ]
      },
      {
        id: 'te-consonants',
        label: 'Hallulu (హల్లులు)',
        note: 'Essential Telugu consonants with inherent "a" vowel.',
        rows: [
          { group: 'Ka & Cha Rows', chars: [
            { glyph: 'క', romaji: 'ka' }, { glyph: 'ఖ', romaji: 'kha' }, { glyph: 'గ', romaji: 'ga' }, { glyph: 'ఘ', romaji: 'gha' }, { glyph: 'చ', romaji: 'cha' }, { glyph: 'జ', romaji: 'ja' }
          ]},
          { group: 'Ta, Tha & Pa Rows', chars: [
            { glyph: 'ట', romaji: 'ta' }, { glyph: 'డ', romaji: 'da' }, { glyph: 'ణ', romaji: 'na' }, { glyph: 'త', romaji: 'tha' }, { glyph: 'ద', romaji: 'dha' }, { glyph: 'న', romaji: 'na' }, { glyph: 'ప', romaji: 'pa' }, { glyph: 'బ', romaji: 'ba' }, { glyph: 'మ', romaji: 'ma' }
          ]},
          { group: 'Liquids & Sibilants', chars: [
            { glyph: 'య', romaji: 'ya' }, { glyph: 'ర', romaji: 'ra' }, { glyph: 'ల', romaji: 'la' }, { glyph: 'వ', romaji: 'va' }, { glyph: 'శ', romaji: 'sha' }, { glyph: 'స', romaji: 'sa' }, { glyph: 'హ', romaji: 'ha' }, { glyph: 'ళ', romaji: 'la (retroflex)' }
          ]}
        ]
      }
    ]
  },
  hi: {
    title: 'Hindi Devanagari (हिन्दी देवनागरी)',
    subtitle: 'Master Devanagari Swar (vowels) and Vyanjan (consonants) with handwriting tracing.',
    speechLocale: 'hi-IN',
    tabs: [
      {
        id: 'hi-vowels',
        label: 'Swar (स्वर)',
        note: '11 core Devanagari vowels plus Anusvara (अं) and Visarga (अः).',
        rows: [
          { group: 'Core Vowels', chars: [
            { glyph: 'अ', romaji: 'a' }, { glyph: 'आ', romaji: 'aa' }, { glyph: 'इ', romaji: 'i' }, { glyph: 'ई', romaji: 'ee' }, { glyph: 'उ', romaji: 'u' }, { glyph: 'ऊ', romaji: 'oo' }, { glyph: 'ऋ', romaji: 'ri' }
          ]},
          { group: 'E, O & Modifiers', chars: [
            { glyph: 'ए', romaji: 'e' }, { glyph: 'ऐ', romaji: 'ai' }, { glyph: 'ओ', romaji: 'o' }, { glyph: 'औ', romaji: 'au' }, { glyph: 'अं', romaji: 'am' }, { glyph: 'अः', romaji: 'ah' }
          ]}
        ]
      },
      {
        id: 'hi-consonants',
        label: 'Vyanjan (व्यंजन)',
        note: 'Devanagari consonants are arranged scientifically by place of articulation.',
        rows: [
          { group: 'Velar & Palatal', chars: [
            { glyph: 'क', romaji: 'ka' }, { glyph: 'ख', romaji: 'kha' }, { glyph: 'ग', romaji: 'ga' }, { glyph: 'घ', romaji: 'gha' }, { glyph: 'च', romaji: 'cha' }, { glyph: 'छ', romaji: 'chha' }, { glyph: 'ज', romaji: 'ja' }, { glyph: 'झ', romaji: 'jha' }
          ]},
          { group: 'Retroflex & Dental', chars: [
            { glyph: 'ट', romaji: 'ta' }, { glyph: 'ठ', romaji: 'tha' }, { glyph: 'ड', romaji: 'da' }, { glyph: 'ण', romaji: 'na' }, { glyph: 'त', romaji: 'ta (soft)' }, { glyph: 'थ', romaji: 'tha' }, { glyph: 'द', romaji: 'da' }, { glyph: 'ध', romaji: 'dha' }, { glyph: 'न', romaji: 'na' }
          ]},
          { group: 'Labial, Liquids & Sibilants', chars: [
            { glyph: 'प', romaji: 'pa' }, { glyph: 'फ', romaji: 'pha' }, { glyph: 'ब', romaji: 'ba' }, { glyph: 'भ', romaji: 'bha' }, { glyph: 'म', romaji: 'ma' }, { glyph: 'य', romaji: 'ya' }, { glyph: 'र', romaji: 'ra' }, { glyph: 'ल', romaji: 'la' }, { glyph: 'व', romaji: 'va' }, { glyph: 'श', romaji: 'sha' }, { glyph: 'स', romaji: 'sa' }, { glyph: 'ह', romaji: 'ha' }
          ]}
        ]
      }
    ]
  },
  zh: {
    title: 'Mandarin Chinese Hanzi (汉字)',
    subtitle: 'Trace foundational Simplified Hanzi characters & radicals with Pinyin tones.',
    speechLocale: 'zh-CN',
    tabs: [
      {
        id: 'zh-core',
        label: 'Core Hanzi (基础汉字)',
        note: '50 foundational HSK 1–2 characters & semantic building blocks.',
        rows: [
          { group: 'Numbers & Basics', chars: [
            { glyph: '一', romaji: 'yī · 1' }, { glyph: '二', romaji: 'èr · 2' }, { glyph: '三', romaji: 'sān · 3' }, { glyph: '四', romaji: 'sì · 4' }, { glyph: '五', romaji: 'wǔ · 5' },
            { glyph: '六', romaji: 'liù · 6' }, { glyph: '七', romaji: 'qī · 7' }, { glyph: '八', romaji: 'bā · 8' }, { glyph: '九', romaji: 'jiǔ · 9' }, { glyph: '十', romaji: 'shí · 10' }
          ]},
          { group: 'People & Nature', chars: [
            { glyph: '人', romaji: 'rén · person' }, { glyph: '我', romaji: 'wǒ · I' }, { glyph: '你', romaji: 'nǐ · you' }, { glyph: '好', romaji: 'hǎo · good' }, { glyph: '家', romaji: 'jiā · home' },
            { glyph: '日', romaji: 'rì · sun/day' }, { glyph: '月', romaji: 'yuè · moon' }, { glyph: '水', romaji: 'shuǐ · water' }, { glyph: '火', romaji: 'huǒ · fire' }, { glyph: '山', romaji: 'shān · mountain' },
            { glyph: '木', romaji: 'mù · wood' }, { glyph: '天', romaji: 'tiān · sky' }, { glyph: '心', romaji: 'xīn · heart' }, { glyph: '手', romaji: 'shǒu · hand' }, { glyph: '口', romaji: 'kǒu · mouth' }
          ]},
          { group: 'Essential Verbs & Qualities', chars: [
            { glyph: '大', romaji: 'dà · big' }, { glyph: '小', romaji: 'xiǎo · small' }, { glyph: '中', romaji: 'zhōng · middle' }, { glyph: '国', romaji: 'guó · country' }, { glyph: '学', romaji: 'xué · study' },
            { glyph: '语', romaji: 'yǔ · language' }, { glyph: '书', romaji: 'shū · book' }, { glyph: '吃', romaji: 'chī · eat' }, { glyph: '喝', romaji: 'hē · drink' }, { glyph: '去', romaji: 'qù · go' },
            { glyph: '来', romaji: 'lái · come' }, { glyph: '看', romaji: 'kàn · look' }, { glyph: '听', romaji: 'tīng · listen' }, { glyph: '说', romaji: 'shuō · speak' }, { glyph: '爱', romaji: 'ài · love' }
          ]}
        ]
      }
    ]
  },
  ko: {
    title: 'Korean Hangul (한글)',
    subtitle: 'Master all 14 basic consonants, 5 double consonants, and 10 basic vowels.',
    speechLocale: 'ko-KR',
    tabs: [
      {
        id: 'ko-consonants',
        label: 'Consonants (자음)',
        note: 'Hangul consonant shapes reflect the position of the tongue and mouth when pronouncing them.',
        rows: [
          { group: '14 Basic Consonants', chars: [
            { glyph: 'ㄱ', romaji: 'g / k' }, { glyph: 'ㄴ', romaji: 'n' }, { glyph: 'ㄷ', romaji: 'd / t' }, { glyph: 'ㄹ', romaji: 'r / l' }, { glyph: 'ㅁ', romaji: 'm' },
            { glyph: 'ㅂ', romaji: 'b / p' }, { glyph: 'ㅅ', romaji: 's' }, { glyph: 'ㅇ', romaji: 'silent / ng' }, { glyph: 'ㅈ', romaji: 'j' }, { glyph: 'ㅊ', romaji: 'ch' },
            { glyph: 'ㅋ', romaji: 'k' }, { glyph: 'ㅌ', romaji: 't' }, { glyph: 'ㅍ', romaji: 'p' }, { glyph: 'ㅎ', romaji: 'h' }
          ]},
          { group: '5 Double Consonants', chars: [
            { glyph: 'ㄲ', romaji: 'kk' }, { glyph: 'ㄸ', romaji: 'tt' }, { glyph: 'ㅃ', romaji: 'pp' }, { glyph: 'ㅆ', romaji: 'ss' }, { glyph: 'ㅉ', romaji: 'jj' }
          ]}
        ]
      },
      {
        id: 'ko-vowels',
        label: 'Vowels (모음)',
        note: 'Hangul vowels combine vertical and horizontal strokes representing heaven, earth, and humanity.',
        rows: [
          { group: '10 Basic Vowels', chars: [
            { glyph: 'ㅏ', romaji: 'a' }, { glyph: 'ㅑ', romaji: 'ya' }, { glyph: 'ㅓ', romaji: 'eo' }, { glyph: 'ㅕ', romaji: 'yeo' }, { glyph: 'ㅗ', romaji: 'o' },
            { glyph: 'ㅛ', romaji: 'yo' }, { glyph: 'ㅜ', romaji: 'u' }, { glyph: 'ㅠ', romaji: 'yu' }, { glyph: 'ㅡ', romaji: 'eu' }, { glyph: 'ㅣ', romaji: 'i' }
          ]},
          { group: 'Common Compound Vowels', chars: [
            { glyph: 'ㅐ', romaji: 'ae' }, { glyph: 'ㅔ', romaji: 'e' }, { glyph: 'ㅘ', romaji: 'wa' }, { glyph: 'ㅝ', romaji: 'wo' }, { glyph: 'ㅢ', romaji: 'ui' }
          ]}
        ]
      }
    ]
  },
  ar: {
    title: 'Arabic Alphabet (الأبجدية العربية)',
    subtitle: 'Master all 28 Arabic letters (written right-to-left) with pronunciation and tracing.',
    speechLocale: 'ar-SA',
    dir: 'rtl',
    tabs: [
      {
        id: 'ar-alphabet',
        label: '28 Letters (الحروف)',
        note: 'Arabic is read right-to-left. Practice recognizing and drawing each letter in its isolated form.',
        rows: [
          { group: 'Alif – Zay', chars: [
            { glyph: 'ا', romaji: 'alif (a)' }, { glyph: 'ب', romaji: 'ba (b)' }, { glyph: 'ت', romaji: 'ta (t)' }, { glyph: 'ث', romaji: 'tha (th)' }, { glyph: 'ج', romaji: 'jim (j)' },
            { glyph: 'ح', romaji: 'ha (h)' }, { glyph: 'خ', romaji: 'kha (kh)' }, { glyph: 'د', romaji: 'dal (d)' }, { glyph: 'ذ', romaji: 'dhal (dh)' }, { glyph: 'ر', romaji: 'ra (r)' }, { glyph: 'ز', romaji: 'zay (z)' }
          ]},
          { group: 'Sin – Qaf', chars: [
            { glyph: 'س', romaji: 'sin (s)' }, { glyph: 'ش', romaji: 'shin (sh)' }, { glyph: 'ص', romaji: 'sad (s)' }, { glyph: 'ض', romaji: 'dad (d)' }, { glyph: 'ط', romaji: 'ta (t)' },
            { glyph: 'ظ', romaji: 'za (z)' }, { glyph: 'ع', romaji: 'ayn' }, { glyph: 'غ', romaji: 'ghayn (gh)' }, { glyph: 'ف', romaji: 'fa (f)' }, { glyph: 'ق', romaji: 'qaf (q)' }
          ]},
          { group: 'Kaf – Ya', chars: [
            { glyph: 'ك', romaji: 'kaf (k)' }, { glyph: 'ل', romaji: 'lam (l)' }, { glyph: 'م', romaji: 'mim (m)' }, { glyph: 'ن', romaji: 'nun (n)' },
            { glyph: 'ه', romaji: 'ha (h)' }, { glyph: 'و', romaji: 'waw (w/u)' }, { glyph: 'ي', romaji: 'ya (y/i)' }
          ]}
        ]
      }
    ]
  },
  fr: {
    title: 'French Accents & Alphabet (Français)',
    subtitle: 'Practice French diacritics (é, è, ê, ç, œ) and alphabet pronunciation.',
    speechLocale: 'fr-FR',
    tabs: [
      {
        id: 'fr-accents',
        label: 'Accents & Ligatures',
        note: 'Accents change vowel pronunciation and distinguish meanings in French (e.g. ou vs où).',
        rows: [
          { group: 'French Diacritics', chars: [
            { glyph: 'é', romaji: 'accent aigu (ay)' }, { glyph: 'è', romaji: 'accent grave (eh)' }, { glyph: 'ê', romaji: 'circonflexe (eh)' }, { glyph: 'ë', romaji: 'tréma' }, { glyph: 'à', romaji: 'a grave' },
            { glyph: 'â', romaji: 'a circonflexe' }, { glyph: 'ç', romaji: 'cédille (s)' }, { glyph: 'ù', romaji: 'u grave' }, { glyph: 'û', romaji: 'u circonflexe' }, { glyph: 'ô', romaji: 'o circonflexe' },
            { glyph: 'î', romaji: 'i circonflexe' }, { glyph: 'ï', romaji: 'i tréma' }, { glyph: 'œ', romaji: 'e dans l’o' }
          ]}
        ]
      }
    ]
  },
  ru: {
    title: 'Russian Cyrillic (Русский алфавит)',
    subtitle: 'Master all 33 Cyrillic letters with clear phonetic guides and handwriting practice.',
    speechLocale: 'ru-RU',
    tabs: [
      {
        id: 'ru-cyrillic',
        label: 'Cyrillic (33 Letters)',
        note: 'Russian Cyrillic is highly phonetic—learn the 33 letters to read any Russian word aloud.',
        rows: [
          { group: 'А – Й', chars: [
            { glyph: 'А', romaji: 'a' }, { glyph: 'Б', romaji: 'b' }, { glyph: 'В', romaji: 'v' }, { glyph: 'Г', romaji: 'g' }, { glyph: 'Д', romaji: 'd' },
            { glyph: 'Е', romaji: 'ye' }, { glyph: 'Ё', romaji: 'yo' }, { glyph: 'Ж', romaji: 'zh' }, { glyph: 'З', romaji: 'z' }, { glyph: 'И', romaji: 'i' }, { glyph: 'Й', romaji: 'y' }
          ]},
          { group: 'К – Х', chars: [
            { glyph: 'К', romaji: 'k' }, { glyph: 'Л', romaji: 'l' }, { glyph: 'М', romaji: 'm' }, { glyph: 'Н', romaji: 'n' }, { glyph: 'О', romaji: 'o' },
            { glyph: 'П', romaji: 'p' }, { glyph: 'Р', romaji: 'r' }, { glyph: 'С', romaji: 's' }, { glyph: 'Т', romaji: 't' }, { glyph: 'У', romaji: 'u' }, { glyph: 'Ф', romaji: 'f' }, { glyph: 'Х', romaji: 'kh' }
          ]},
          { group: 'Ц – Я', chars: [
            { glyph: 'Ц', romaji: 'ts' }, { glyph: 'Ч', romaji: 'ch' }, { glyph: 'Ш', romaji: 'sh' }, { glyph: 'Щ', romaji: 'shch' }, { glyph: 'Ъ', romaji: 'hard sign' },
            { glyph: 'Ы', romaji: 'y' }, { glyph: 'Ь', romaji: 'soft sign' }, { glyph: 'Э', romaji: 'e' }, { glyph: 'Ю', romaji: 'yu' }, { glyph: 'Я', romaji: 'ya' }
          ]}
        ]
      }
    ]
  },
  en: {
    title: 'English Alphabet & Sounds',
    subtitle: 'Practice English letters and key consonant digraphs (th, sh, ch, ph, wh, ng).',
    speechLocale: 'en-US',
    tabs: [
      {
        id: 'en-digraphs',
        label: 'Key Digraphs & Vowels',
        note: 'Master English vowel sounds and common letter combinations.',
        rows: [
          { group: 'Vowels', chars: [
            { glyph: 'A', romaji: 'ay / æ' }, { glyph: 'E', romaji: 'ee / eh' }, { glyph: 'I', romaji: 'eye / ih' }, { glyph: 'O', romaji: 'oh / aw' }, { glyph: 'U', romaji: 'you / uh' }
          ]},
          { group: 'Essential Digraphs', chars: [
            { glyph: 'th', romaji: 'think / this' }, { glyph: 'sh', romaji: 'ship' }, { glyph: 'ch', romaji: 'chair' }, { glyph: 'ph', romaji: 'phone (f)' }, { glyph: 'wh', romaji: 'where' }, { glyph: 'ng', romaji: 'sing' }
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
