# Chord Validation Rules

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Production-Ready Strict Validation

---

## Overview

This document describes the strict chord validation rules used in ChordVault. All chords are validated before being saved to the database to ensure data integrity and consistency.

**Key Principle:** Only valid chords are accepted. Invalid chords are rejected (not fixed or corrected).

---

## Validation Process

1. **Parse** - Attempt to parse the chord string into a structured `Chord` object
2. **Validate Structure** - Check that the chord structure is valid
3. **Normalize** - Convert back to standardized string format
4. **Reject** - If parsing or validation fails, the chord is rejected (set to `undefined`)

---

## Valid Chord Components

### 1. Root Note

**Required:** Yes  
**Valid Values:** `A`, `B`, `C`, `D`, `E`, `F`, `G`  
**Case:** Case-insensitive (converted to uppercase)

**Examples:**
- ✅ `C`, `A`, `F`
- ❌ `H` (not a valid note)
- ❌ `C#` (accidental comes after note, see below)

---

### 2. Accidental

**Required:** No  
**Valid Values:** `#` (sharp) or `b` (flat)  
**Position:** Immediately after root note

**Examples:**
- ✅ `C#`, `Bb`, `F#`
- ✅ `C` (no accidental - valid)
- ❌ `C♯` (Unicode sharp - not accepted, use `#`)
- ❌ `C♭` (Unicode flat - not accepted, use `b`)

**Note:** Unicode symbols (`♯`, `♭`) are automatically converted to ASCII (`#`, `b`) during validation.

---

### 3. Quality

**Required:** No (defaults to `major` if not specified)  
**Valid Values:**

| Quality | Notation | Example |
|---------|----------|---------|
| Major | (none) or `maj` | `C`, `Cmaj7` |
| Minor | `m` | `Cm`, `Am7` |
| Diminished | `dim` | `Cdim`, `C#dim` |
| Augmented | `aug` | `Caug`, `F#aug` |
| Suspended 2nd | `sus2` | `Csus2`, `Dsus2` |
| Suspended 4th | `sus4` | `Csus4`, `Gsus4` |

**Examples:**
- ✅ `C` (major - default)
- ✅ `Cm` (minor)
- ✅ `Cdim` (diminished)
- ✅ `Caug` (augmented)
- ✅ `Csus2` (suspended 2nd)
- ✅ `Csus4` (suspended 4th)
- ❌ `Csus` (must specify sus2 or sus4)
- ❌ `Cmin` (use `Cm` instead)

**Special Cases:**
- `maj` is only used with extensions (e.g., `Cmaj7`, `Cmaj9`)
- `dim` can be truncated to `di` in OCR (automatically fixed)
- `sus` without number defaults to `sus4`

---

### 4. Extension

**Required:** No  
**Valid Values:** `5`, `6`, `7`, `9`, `11`, `13`  
**Position:** After quality (or after root if no quality)

**Examples:**
- ✅ `C7`, `Am7`, `Fmaj7`
- ✅ `C9`, `Dm9`, `Gmaj9`
- ✅ `C11`, `Am11`
- ✅ `C13`, `Fmaj13`
- ✅ `C6`, `Am6` (6th chords)
- ✅ `C5` (power chord)
- ❌ `C8` (not a valid extension)
- ❌ `C15` (not a valid extension)
- ❌ `C4` (use `sus4` instead)

**Common Patterns:**
- `C7` = Dominant 7th
- `Cmaj7` = Major 7th (explicit `maj` required)
- `Cm7` = Minor 7th
- `Cmmaj7` = Minor-Major 7th (minor triad with major 7th extension)
- `C9` = Dominant 9th
- `C6` = Major 6th
- `C5` = Power chord (root + 5th)

---

### 5. Add

**Required:** No  
**Valid Values:** `2`, `4`, `6`, `9`  
**Notation:** `add` followed by number

**Examples:**
- ✅ `Cadd2`, `Cadd4`, `Cadd6`, `Cadd9`
- ✅ `Amadd9`, `F#add2`
- ❌ `Cadd3` (not a valid add)
- ❌ `Cadd12` (not a valid add)
- ❌ `Cadd` (must specify number)

**Note:** Add chords add a note to a basic triad without changing the chord quality.

---

### 6. Inversion (Slash Chords)

**Required:** No  
**Valid Values:** `A`, `B`, `C`, `D`, `E`, `F`, `G`  
**Notation:** `/` followed by note

**Examples:**
- ✅ `C/E` (C major with E in bass)
- ✅ `Am/C` (A minor with C in bass)
- ✅ `F#/A#` (F# with A# in bass - note: accidental in bass note is parsed but simplified)
- ❌ `C/H` (H is not a valid note)
- ❌ `C/Invalid` (invalid bass note)

**Note:** Inversions specify a different bass note than the root.

---

### 7. Special Cases

**Valid Special Chords:**

| Notation | Meaning | Example |
|----------|---------|---------|
| `N.C.` or `NC` | No Chord | `N.C.` |
| `x` or `X` | Muted/No chord | `x` |

**Examples:**
- ✅ `N.C.`
- ✅ `NC`
- ✅ `x`
- ✅ `X`

---

## Complete Chord Examples

### Basic Chords
- ✅ `C` - C major
- ✅ `Cm` - C minor
- ✅ `C#` - C sharp major
- ✅ `Bb` - B flat major
- ✅ `F#m` - F sharp minor

### Extended Chords
- ✅ `C7` - C dominant 7th
- ✅ `Cmaj7` - C major 7th
- ✅ `Cm7` - C minor 7th
- ✅ `Cmmaj7` - C minor-major 7th (minor triad with major 7th)
- ✅ `C9` - C dominant 9th
- ✅ `Cmaj9` - C major 9th
- ✅ `Cm9` - C minor 9th
- ✅ `Cmmaj9` - C minor-major 9th
- ✅ `C11` - C dominant 11th
- ✅ `C13` - C dominant 13th

### 6th and 5th Chords
- ✅ `C6` - C major 6th
- ✅ `Am6` - A minor 6th
- ✅ `C5` - C power chord

### Altered Chords
- ✅ `Cdim` - C diminished
- ✅ `Caug` - C augmented
- ✅ `Csus2` - C suspended 2nd
- ✅ `Csus4` - C suspended 4th

### Add Chords
- ✅ `Cadd2` - C add 2
- ✅ `Cadd4` - C add 4
- ✅ `Cadd6` - C add 6
- ✅ `Cadd9` - C add 9

### Slash Chords (Inversions)
- ✅ `C/E` - C major with E bass
- ✅ `Am/C` - A minor with C bass
- ✅ `F/G` - F major with G bass

### Complex Chords
- ✅ `C#m7` - C sharp minor 7th
- ✅ `Bb7` - B flat dominant 7th
- ✅ `F#maj7` - F sharp major 7th
- ✅ `F#mmaj7` - F sharp minor-major 7th (used in "Something" by The Beatles)
- ✅ `Gm9` - G minor 9th
- ✅ `Dm7add9` - D minor 7th add 9
- ✅ `Am7/C` - A minor 7th with C bass

---

## Invalid Chord Examples

### Invalid Extensions
- ❌ `C8` - 8th is not a valid extension
- ❌ `C15` - 15th is not a valid extension
- ❌ `C4` - Use `Csus4` instead

### Invalid Adds
- ❌ `Cadd3` - 3rd is not a valid add
- ❌ `Cadd12` - 12th is not a valid add
- ❌ `Cadd` - Must specify number

### Invalid Quality
- ❌ `Cmin` - Use `Cm` instead
- ❌ `Cmajor` - Use `C` or `Cmaj7` instead
- ❌ `Csus` - Must specify `sus2` or `sus4`

### Invalid Root Notes
- ❌ `H` - Not a valid note (use B instead)
- ❌ `Cb` - C flat is enharmonic to B (not commonly used)

### Invalid Format
- ❌ `C7m` - Quality must come before extension (use `Cm7`)
- ❌ `C/Invalid` - Invalid bass note
- ❌ `C#b` - Cannot have both sharp and flat
- ❌ `Cdim7` - Diminished 7th is `Cdim` with extension `7`, but structure may be invalid

### Invalid Characters
- ❌ `C♯` - Unicode sharp (use `#`)
- ❌ `C♭` - Unicode flat (use `b`)
- ❌ `C 7` - Spaces are removed, but may cause parsing issues

---

## Validation Rules Summary

### ✅ What Gets Accepted

1. **Valid root note** (A-G)
2. **Valid accidental** (# or b, optional)
3. **Valid quality** (m, maj, dim, aug, sus2, sus4, or none for major)
4. **Valid extension** (5, 6, 7, 9, 11, 13, or none)
5. **Valid add** (add2, add4, add6, add9, or none)
6. **Valid inversion** (slash chord with valid note, or none)
7. **Special cases** (N.C., x)

### ❌ What Gets Rejected

1. Invalid root note
2. Invalid extension numbers (not in allowed list)
3. Invalid add numbers (not in allowed list)
4. Invalid inversion note
5. Invalid quality notation
6. Malformed chord strings
7. Chords that fail to parse

---

## Normalization

All valid chords are normalized to a consistent format:

**Normalization Rules:**
- Root note: Always uppercase (`C`, not `c`)
- Accidental: Always ASCII (`#`, not `♯`)
- Quality: Standardized (`m` not `min`, `dim` not `di`)
- Extension: Standardized format
- Add: Standardized format (`add9` not `add 9`)
- Inversion: Standardized format (`/E` not `/ e`)

**Examples:**
- `c#m7` → `C#m7`
- `Bb maj 9` → `Bbmaj9`
- `am add9` → `Amadd9`
- `C/E` → `C/E` (unchanged)

---

## OCR Error Handling

During OCR processing, common errors are automatically fixed:

**Auto-Fixes (Lenient Mode):**
- `di` → `dim` (truncated diminished)
- `diminished` → `dim`
- `minor` → `m`
- `major` → (removed, or `maj` if with extension)
- `♯` → `#`
- `♭` → `b`
- Extra spaces removed

**Note:** These fixes are applied during OCR processing. In strict validation mode (on save), only valid chords are accepted.

---

## Implementation Details

### Validation Functions

1. **`validateChordStrict(chordStr)`**
   - Strict validation - only accepts valid chords
   - Returns normalized chord string or `undefined`
   - Used when saving to database

2. **`validateChord(chordStr)`** (Lenient)
   - Tries to fix common OCR errors
   - Used during OCR processing
   - Falls back to strict validation

3. **`getChordValidationErrors(chordStr)`**
   - Returns array of error messages
   - Useful for user feedback

### Where Validation Happens

1. **On Save** - API route (`/api/sheets`) uses strict validation
2. **In Editor** - Client-side validation for instant feedback
3. **On Import** - Ultimate Guitar and OCR results are validated

---

## Testing Chord Validation

### Test Valid Chords

```javascript
// All should pass
validateChordStrict('C')        // ✅ 'C'
validateChordStrict('Am7')      // ✅ 'Am7'
validateChordStrict('F#m')      // ✅ 'F#m'
validateChordStrict('Bb7')      // ✅ 'Bb7'
validateChordStrict('Gmaj7')    // ✅ 'Gmaj7'
validateChordStrict('Dsus4')    // ✅ 'Dsus4'
validateChordStrict('C/E')      // ✅ 'C/E'
validateChordStrict('Cadd9')    // ✅ 'Cadd9'
validateChordStrict('N.C.')     // ✅ 'N.C.'
```

### Test Invalid Chords

```javascript
// All should return undefined
validateChordStrict('C15')      // ❌ undefined (invalid extension)
validateChordStrict('Cadd12')   // ❌ undefined (invalid add)
validateChordStrict('C/Invalid') // ❌ undefined (invalid inversion)
validateChordStrict('H')        // ❌ undefined (invalid root)
validateChordStrict('C8')       // ❌ undefined (invalid extension)
```

---

## Chord Notation Reference

### Standard Notation Patterns

| Pattern | Example | Meaning |
|---------|---------|---------|
| `[Note]` | `C` | Major chord |
| `[Note]m` | `Cm` | Minor chord |
| `[Note]#` or `[Note]b` | `C#`, `Bb` | Sharp/Flat |
| `[Note]dim` | `Cdim` | Diminished |
| `[Note]aug` | `Caug` | Augmented |
| `[Note]sus2` | `Csus2` | Suspended 2nd |
| `[Note]sus4` | `Csus4` | Suspended 4th |
| `[Note][Extension]` | `C7`, `C9` | Extended chord |
| `[Note]maj[Extension]` | `Cmaj7` | Major extension |
| `[Note]m[Extension]` | `Cm7` | Minor extension |
| `[Note]mmaj[Extension]` | `Cmmaj7` | Minor-major extension (minor triad with major 7th) |
| `[Note]add[Number]` | `Cadd9` | Add chord |
| `[Note]/[Bass]` | `C/E` | Slash chord |

---

## FAQ

### Q: Why are some extensions not allowed (like 8, 15)?

**A:** These are not standard chord extensions in music theory. Valid extensions are: 5 (power chord), 6, 7, 9, 11, 13.

### Q: Can I use `Cmin` instead of `Cm`?

**A:** No. The standard notation is `Cm` for minor chords. `Cmin` will be rejected.

### Q: What about `C7sus4` or other complex combinations?

**A:** Currently, suspended chords with extensions are not fully supported. Use `Csus4` or `C7` separately.

### Q: Why is `C4` rejected but `Csus4` accepted?

**A:** `C4` is ambiguous. `Csus4` clearly indicates a suspended 4th chord.

### Q: Can I use `C/E#` for inversions?

**A:** Currently, only the note letter is validated in inversions. `C/E#` would be parsed as `C/E` (accidental in bass note is simplified).

### Q: What happens to invalid chords?

**A:** Invalid chords are rejected and set to `undefined`. They are not saved to the database.

---

## References

- [Music Theory: Chord Extensions](https://www.musictheory.net/lessons/40)
- [Standard Chord Notation](https://en.wikipedia.org/wiki/Chord_notation)
- [Guitar Chord Notation](https://www.guitar-chord.org/chord-notation.html)

---

## Changelog

### Version 1.0 (2025-01-XX)
- Initial strict validation implementation
- Support for all standard chord types
- Rejection of invalid chords
- Normalization to consistent format

---

**For questions or issues, refer to the code in:**
- `lib/strict-chord-validator.ts` - Strict validation logic
- `lib/chord-utils.ts` - Chord parsing and string conversion
- `lib/chord-validator.ts` - Lenient validation (OCR fixes)

