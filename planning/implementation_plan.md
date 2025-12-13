# ChordVault: Image Reference & Unified Editing

## Goals
1. Keep original image for reference during editing
2. Consistent editing experience across library and upload preview

---

## Proposed Changes

### Phase 1: Image Reference Feature

#### [MODIFY] `types.ts`
- `imagePath` already exists - we'll use it to store image URLs

#### [NEW] `lib/image-storage.ts`
- Store uploaded images (base64 or blob URL for now)
- In production: upload to cloud storage

#### [MODIFY] `app/sheet/[id]/page.tsx`
- Add collapsible panel showing original image
- Toggle button: "Show Reference Image"

#### [MODIFY] `app/upload/image/page.tsx`
- Keep image preview visible during editing (already partly there)
- Ensure image is saved when song is saved

---

### Phase 2: Unified Editing Component

#### [NEW] `components/SongEditor.tsx`
- Shared editor component used by both:
  - `app/sheet/[id]/page.tsx` (editing saved songs)
  - `app/upload/image/page.tsx` (editing before save)
- Props: sections, onSectionsChange, referenceImage?
- Same word/chord editing UI in both places

---

## Verification
- Import song from image → verify image saved
- View song → click "Show Image" → see original
- Edit song in library → same UI as upload preview
