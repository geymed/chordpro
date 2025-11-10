import { ChordSheet } from '@/types';

// Shared in-memory storage for API routes
// In production, replace this with a database
let sheets: ChordSheet[] | null = null;

export function getDefaultSheets(): ChordSheet[] {
  return [
    {
      id: '1',
      title: "Knockin' on Heaven's Door",
      artist: 'Bob Dylan',
      language: 'en',
      key: 'G',
      tempo: 'Moderate',
      dateAdded: '2024-01-15',
      sections: [
        {
          id: 'v1',
          type: 'verse',
          label: 'VERSE 1',
          lines: [
            { chords: ['G', '', '', 'D'], lyrics: 'Mama, take this badge off of me' },
            { chords: ['', '', 'Am', ''], lyrics: "I can't use it anymore" },
            { chords: ['G', '', '', 'D'], lyrics: "It's gettin' dark, too dark to see" },
            { chords: ['', '', 'Am', ''], lyrics: "I feel like I'm knockin' on heaven's door" },
          ],
        },
        {
          id: 'c1',
          type: 'chorus',
          label: 'CHORUS',
          lines: [
            { chords: ['G', '', '', 'D'], lyrics: 'Knock, knock, knockin\' on heaven\'s door' },
            { chords: ['G', '', '', 'D'], lyrics: 'Knock, knock, knockin\' on heaven\'s door' },
          ],
        },
      ],
    },
    {
      id: '2',
      title: 'שיר לשלום',
      titleEn: 'Song for Peace',
      artist: 'מתי כספי',
      artistEn: 'Matti Caspi',
      language: 'he',
      key: 'Am',
      tempo: 'Medium',
      dateAdded: '2024-01-20',
      sections: [
        {
          id: 'v1',
          type: 'verse',
          label: 'בית 1',
          lines: [
            { chords: ['Dm', 'Am'], lyrics: 'תנו לשמש לעלות' },
            { chords: ['Am', 'E7'], lyrics: 'לבוקר להאיר' },
            { chords: ['Dm', 'Am'], lyrics: 'תנו לשלום לפרוח' },
            { chords: ['Am', 'E7'], lyrics: 'בלב של כל איש' },
          ],
        },
        {
          id: 'c1',
          type: 'chorus',
          label: 'פזמון',
          lines: [
            { chords: ['F', 'Am'], lyrics: 'שירו שיר לשלום' },
            { chords: ['Am', 'E7'], lyrics: 'בצעקה גדולה' },
            { chords: ['F', 'Am'], lyrics: 'שירו שיר לשלום' },
            { chords: ['Am', 'E7'], lyrics: 'אל תגידו יום יבוא' },
          ],
        },
      ],
    },
    {
      id: '3',
      title: 'Stand By Me',
      artist: 'Ben E. King',
      language: 'en',
      key: 'A',
      tempo: 'Moderate',
      dateAdded: '2024-02-01',
      sections: [
        {
          id: 'v1',
          type: 'verse',
          label: 'VERSE 1',
          lines: [
            { chords: ['A', '', '', 'F#m'], lyrics: 'When the night has come' },
            { chords: ['D', 'E', 'A'], lyrics: 'And the land is dark' },
            { chords: ['F#m', '', '', 'D'], lyrics: 'And the moon is the only light we\'ll see' },
            { chords: ['A', '', '', 'F#m'], lyrics: 'No I won\'t be afraid' },
            { chords: ['D', 'E', 'A'], lyrics: 'Oh I won\'t be afraid' },
            { chords: ['F#m', '', 'D', 'E'], lyrics: 'Just as long as you stand, stand by me' },
          ],
        },
        {
          id: 'c1',
          type: 'chorus',
          label: 'CHORUS',
          lines: [
            { chords: ['A'], lyrics: 'So darling, darling' },
            { chords: ['F#m'], lyrics: 'Stand by me, oh stand by me' },
            { chords: ['D', 'E', 'A'], lyrics: 'Oh stand, stand by me, stand by me' },
          ],
        },
      ],
    },
    {
      id: '4',
      title: 'אני ואתה',
      titleEn: 'You and I',
      artist: 'אריק איינשטיין',
      artistEn: 'Arik Einstein',
      language: 'he',
      key: 'C',
      tempo: 'Slow',
      capo: 3,
      dateAdded: '2024-02-05',
      sections: [
        {
          id: 'v1',
          type: 'verse',
          label: 'בית 1',
          lines: [
            { chords: ['C', 'Am'], lyrics: 'אני ואתה נשנה את העולם' },
            { chords: ['F', 'G'], lyrics: 'אני ואתה אז יבואו כבר כולם' },
            { chords: ['C', 'Am'], lyrics: 'אמרו לי שזה בלתי אפשרי' },
            { chords: ['F', 'G', 'C'], lyrics: 'אבל זה לא בלתי אפשרי' },
          ],
        },
        {
          id: 'c1',
          type: 'chorus',
          label: 'פזמון',
          lines: [
            { chords: ['Am', 'F'], lyrics: 'אני ואתה נשנה את העולם' },
            { chords: ['G', 'C'], lyrics: 'אני ואתה אז יבואו כבר כולם' },
          ],
        },
      ],
    },
  ];
}

export function initializeSheets(): ChordSheet[] {
  if (sheets === null) {
    sheets = getDefaultSheets();
  }
  return sheets;
}

export function getSheets(): ChordSheet[] {
  return initializeSheets();
}

export function getSheet(id: string): ChordSheet | null {
  const allSheets = initializeSheets();
  return allSheets.find(s => s.id === id) || null;
}

export function saveSheet(sheet: ChordSheet): void {
  const allSheets = initializeSheets();
  const index = allSheets.findIndex(s => s.id === sheet.id);
  if (index >= 0) {
    allSheets[index] = sheet;
  } else {
    allSheets.push(sheet);
  }
  sheets = allSheets;
}

export function deleteSheet(id: string): boolean {
  const allSheets = initializeSheets();
  const index = allSheets.findIndex(s => s.id === id);
  if (index >= 0) {
    allSheets.splice(index, 1);
    sheets = allSheets;
    return true;
  }
  return false;
}

