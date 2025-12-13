'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createWorker } from 'tesseract.js';
import { processOCRText } from '@/lib/ocr-utils';
import { createSheet, getSheet, updateSheet } from '@/lib/api';
import { ChordSheet, ChordSection } from '@/types';
import { validateChordSheet } from '@/lib/chord-validator';
import { validateOCRWithImage } from '@/lib/llm-validator';
import { validateAll, validateChordSheetStructure, type ValidationResult } from '@/lib/client-validator';
import Link from 'next/link';

interface ImageData {
    file: File;
    preview: string;
    processed: boolean;
}

type ImportMode = 'image' | 'url' | 'text';

function ImageUploadPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const [importMode, setImportMode] = useState<ImportMode>('text');
    const [ugUrl, setUgUrl] = useState('');
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [images, setImages] = useState<ImageData[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [processingImageIndex, setProcessingImageIndex] = useState<number>(-1);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [loadingSheet, setLoadingSheet] = useState(false);

    // Editor State
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [sections, setSections] = useState<ChordSection[]>([]);
    const [saving, setSaving] = useState(false);

    // Load existing sheet if editing
    useEffect(() => {
        if (editId) {
            setLoadingSheet(true);
            getSheet(editId)
                .then((sheet) => {
                    if (sheet) {
                        setTitle(sheet.title);
                        setArtist(sheet.artist);
                        setSections(sheet.sections);
                        // Load image if available
                        if (sheet.imageData) {
                            const blob = dataURLtoBlob(sheet.imageData);
                            addImageFromBlob(blob);
                        }
                        setStatus('Loaded song for editing');
                    }
                })
                .catch((error) => {
                    console.error('Failed to load sheet:', error);
                    alert('Failed to load song for editing');
                })
                .finally(() => {
                    setLoadingSheet(false);
                });
        }
    }, [editId]);

    // Helper to convert data URL to blob
    const dataURLtoBlob = (dataURL: string): Blob => {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    // Handle File Selection (multiple files)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newImages: ImageData[] = [];
        let loadedCount = 0;

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                newImages.push({
                    file,
                    preview: reader.result as string,
                    processed: false
                });
                loadedCount++;
                if (loadedCount === files.length) {
                    setImages(prev => [...prev, ...newImages]);
                    if (images.length === 0) {
                        setSelectedImageIndex(0);
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    };

    // Add image from paste
    const addImageFromBlob = (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
            const newImage: ImageData = {
                file: blob as File,
                preview: reader.result as string,
                processed: false
            };
            setImages(prev => {
                const updated = [...prev, newImage];
                if (prev.length === 0) {
                    setSelectedImageIndex(0);
                }
                return updated;
            });
        };
        reader.readAsDataURL(blob);
    };

    // Remove image
    const handleRemoveImage = (index: number) => {
        setImages(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) {
                setSections([]);
                setTitle('');
                setArtist('');
            }
            if (selectedImageIndex >= updated.length) {
                setSelectedImageIndex(Math.max(0, updated.length - 1));
            }
            return updated;
        });
    };

    // Clear all images and reset
    const handleClearAll = () => {
        setImages([]);
        setSelectedImageIndex(0);
        setSections([]);
        setTitle('');
        setArtist('');
        setProcessing(false);
        setProgress(0);
        setStatus('');
        setUgUrl('');
        setPastedText('');
    };

    // Parse pasted text into chord sheet
    // Handles multiple formats:
    // 1. Plain lyrics (words only)
    // 2. ChordPro format: [C]Hello [Am]world
    // 3. Chord lines above lyrics (alternating)
    const handleParseText = () => {
        if (!pastedText.trim()) {
            alert('Please paste some lyrics');
            return;
        }

        setProcessing(true);
        setStatus('Parsing text...');

        try {
            const lines = pastedText.split('\n').filter(l => l.trim());
            const sections: ChordSection[] = [];
            let currentSection: ChordSection = {
                id: `section-${sections.length}`,
                label: 'Verse',
                lines: []
            };

            // Check if text contains ChordPro format [C]chord markers
            const hasChordProFormat = /\[[A-G][#b]?[^\]]*\]/.test(pastedText);
            
            // Check if text has alternating chord/lyric lines
            const chordPattern = /\b[A-G][#b]?(m(?:aj|in|aj7)?|maj|min|aug|dim|sus[24]?|add[2469]|M)?\d*(\/[A-G][#b]?)?\b/gi;
            let hasAlternatingFormat = false;
            if (lines.length >= 2) {
                const firstLineChords = (lines[0].match(chordPattern) || []).length;
                const secondLineChords = (lines[1].match(chordPattern) || []).length;
                const firstLineWords = lines[0].trim().split(/\s+/).length;
                const secondLineWords = lines[1].trim().split(/\s+/).length;
                // If first line has many chords but few words, and second has few chords but many words
                hasAlternatingFormat = firstLineChords / firstLineWords > 0.4 && secondLineChords / secondLineWords < 0.2;
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Check if it's a section header - any text in square brackets is a section
                // Supports: [Intro], [Verse 1], [Chorus], [Bridge], [Custom Section], etc.
                const sectionMatch = line.match(/^\[([^\]]+)\]/);
                if (sectionMatch) {
                    if (currentSection.lines.length > 0) {
                        sections.push(currentSection);
                    }
                    const sectionLabel = sectionMatch[1].trim();
                    currentSection = {
                        id: `section-${sections.length + 1}`,
                        label: sectionLabel,
                        lines: []
                    };
                    continue;
                }
                
                // Also support section headers without brackets (Verse 1:, Chorus:, etc.)
                const sectionMatchNoBrackets = line.match(/^((?:Verse|Chorus|Bridge|Intro|Outro|Solo|Instrumental)(?:\s+\d+)?.*?):?$/i);
                if (sectionMatchNoBrackets && line.trim().length < 50) { // Only if it's a short line (likely a header)
                    if (currentSection.lines.length > 0) {
                        sections.push(currentSection);
                    }
                    const sectionLabel = sectionMatchNoBrackets[1].trim();
                    currentSection = {
                        id: `section-${sections.length + 1}`,
                        label: sectionLabel,
                        lines: []
                    };
                    continue;
                }

                // Handle ChordPro format: [C]Hello [Am]world
                if (hasChordProFormat && /\[[A-G]/.test(line)) {
                    const words: Array<{ word: string; chord?: string }> = [];
                    const chordProRegex = /\[([A-G][#b]?[^\]]*)\]([^\[]*)/g;
                    let lastIndex = 0;
                    let match;

                    while ((match = chordProRegex.exec(line)) !== null) {
                        // Add text before this chord
                        const textBefore = line.substring(lastIndex, match.index).trim();
                        if (textBefore) {
                            textBefore.split(/\s+/).forEach(word => {
                                if (word.trim()) words.push({ word: word.trim() });
                            });
                        }
                        
                        const chord = match[1];
                        const textAfter = match[2].trim();
                        
                        // Split text after chord into words, first word gets the chord
                        const wordsAfter = textAfter.split(/\s+/).filter(w => w.trim());
                        if (wordsAfter.length > 0) {
                            words.push({ word: wordsAfter[0], chord });
                            wordsAfter.slice(1).forEach(word => {
                                words.push({ word });
                            });
                        } else {
                            // Chord with no word after - add empty word with chord
                            words.push({ word: '', chord });
                        }
                        
                        lastIndex = match.index + match[0].length;
                    }
                    
                    // Add remaining text
                    const remaining = line.substring(lastIndex).trim();
                    if (remaining) {
                        remaining.split(/\s+/).forEach(word => {
                            if (word.trim()) words.push({ word: word.trim() });
                        });
                    }

                    if (words.length > 0) {
                        currentSection.lines.push({ words });
                    }
                    continue;
                }

                // Handle alternating chord/lyric lines
                // Check if this line looks like a chord line (has chords with potentially lots of spacing)
                const lineChords = (line.match(chordPattern) || []).length;
                const lineWords = line.trim().split(/\s+/).filter(w => w.trim()).length;
                const isChordLine = lineChords > 0 && (lineChords / Math.max(lineWords, 1) > 0.3 || lineWords <= 5);
                
                if (isChordLine) {
                    // This is a chord line, check if next line is lyrics
                    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
                    const nextLineChords = nextLine ? (nextLine.match(chordPattern) || []).length : 0;
                    const nextLineWords = nextLine ? nextLine.split(/\s+/).filter(w => w.trim()).length : 0;
                    const isNextLyricLine = nextLine && nextLineWords > 0 && (nextLineChords / Math.max(nextLineWords, 1) < 0.2);
                    
                    if (isNextLyricLine) {
                        // Use position-based matching for better alignment
                        // Extract chord positions from the chord line (preserving spacing)
                        const chordMatches: Array<{ chord: string; startPos: number; endPos: number }> = [];
                        let match;
                        const globalPattern = new RegExp(chordPattern.source, 'gi');
                        while ((match = globalPattern.exec(line)) !== null) {
                            chordMatches.push({
                                chord: match[0],
                                startPos: match.index,
                                endPos: match.index + match[0].length
                            });
                        }
                        
                        // Extract word positions from the lyric line
                        const lyricWords: Array<{ word: string; startPos: number; endPos: number }> = [];
                        let currentPos = 0;
                        const lyricWordList = nextLine.split(/\s+/).filter(w => w.trim());
                        
                        lyricWordList.forEach(word => {
                            const startPos = nextLine.indexOf(word, currentPos);
                            if (startPos !== -1) {
                                const endPos = startPos + word.length;
                                lyricWords.push({ word, startPos, endPos });
                                currentPos = endPos;
                            }
                        });
                        
                        // Match chords to words using proportional alignment
                        const normalizedChordLine = line.replace(/\s+/g, ' ').trim();
                        const normalizedLyricLine = nextLine.replace(/\s+/g, ' ').trim();
                        const chordLineLength = normalizedChordLine.length;
                        const lyricLineLength = normalizedLyricLine.length;
                        
                        const words: Array<{ word: string; chord?: string }> = [];
                        
                        lyricWords.forEach(({ word, startPos, endPos }) => {
                            const wordCenterNorm = ((startPos + endPos) / 2) / lyricLineLength;
                            const wordStartNorm = startPos / lyricLineLength;
                            const wordEndNorm = endPos / lyricLineLength;
                            
                            // Find the best matching chord
                            let bestChord: string | undefined = undefined;
                            let bestScore = -Infinity;
                            
                            chordMatches.forEach(({ chord, startPos: chordStart, endPos: chordEnd }) => {
                                const chordStartNorm = chordStart / chordLineLength;
                                const chordEndNorm = chordEnd / chordLineLength;
                                const chordCenterNorm = (chordStart + chordEnd) / 2 / chordLineLength;
                                
                                // Calculate overlap
                                const overlap = Math.max(0, Math.min(wordEndNorm, chordEndNorm) - Math.max(wordStartNorm, chordStartNorm));
                                const distance = Math.abs(chordCenterNorm - wordCenterNorm);
                                
                                // Score: prefer chords that overlap or are close
                                const score = overlap * 2 - distance;
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestChord = chord;
                                }
                            });
                            
                            // Only assign chord if it's reasonably close (within 30% of line)
                            if (bestScore > -0.3) {
                                words.push({ word, chord: bestChord });
                            } else {
                                words.push({ word });
                            }
                        });
                        
                        currentSection.lines.push({ words });
                        i++; // Skip next line since we consumed it
                        continue;
                    } else if (lineChords > 0) {
                        // Chord-only line (like "D   C E" in intro) - extract all chords
                        const chordMatches: string[] = [];
                        let match;
                        const globalPattern = new RegExp(chordPattern.source, 'gi');
                        while ((match = globalPattern.exec(line)) !== null) {
                            chordMatches.push(match[0]);
                        }
                        if (chordMatches.length > 0) {
                            currentSection.lines.push({
                                words: chordMatches.map(chord => ({ word: '', chord }))
                            });
                        }
                        continue;
                    }
                }

                // Plain lyrics - split into words
                const words = line.split(/\s+/).filter(w => w.trim());
                currentSection.lines.push({
                    words: words.map(word => ({ word, chord: undefined }))
                });
            }

            if (currentSection.lines.length > 0) {
                sections.push(currentSection);
            }

            if (sections.length === 0) {
                // If no sections created, create one with all lines
                const allLines = pastedText.split('\n').filter(l => l.trim());
                sections.push({
                    id: 'section-0',
                    label: 'Verse',
                    lines: allLines.map(line => ({
                        words: line.trim().split(/\s+/).filter(w => w.trim()).map(word => ({ word, chord: undefined }))
                    }))
                });
            }

            setSections(sections);
            setStatus('Text parsed! You can now add or edit chords.');
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error('Failed to parse text:', error);
            alert('Failed to parse text');
        } finally {
            setProcessing(false);
        }
    };

    // Fetch from Ultimate Guitar URL
    const handleFetchFromUrl = async () => {
        if (!ugUrl.trim()) {
            alert('Please enter an Ultimate Guitar URL');
            return;
        }

        if (!ugUrl.includes('ultimate-guitar.com')) {
            alert('Please enter a valid Ultimate Guitar URL');
            return;
        }

        setFetchingUrl(true);
        setStatus('Fetching from Ultimate Guitar...');

        try {
            const formData = new FormData();
            formData.append('url', ugUrl);
            formData.append('type', 'url');

            const response = await fetch('/api/analyze/local', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch from Ultimate Guitar');
            }

            const result = await response.json();
            const sheet = result.sheet as ChordSheet;

            // Validate chords
            const validatedSheet = validateChordSheet(sheet);
            
            // Populate editor
            setTitle(validatedSheet.title || sheet.title || '');
            setArtist(validatedSheet.artist || sheet.artist || '');
            setSections(validatedSheet.sections || sheet.sections || []);

            // Run client-side validation
            const clientValidation = validateChordSheetStructure(validatedSheet);
            setValidationResult(clientValidation);

            setStatus('Successfully imported from Ultimate Guitar!');
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error('Failed to fetch from URL:', error);
            alert(error instanceof Error ? error.message : 'Failed to fetch from Ultimate Guitar');
        } finally {
            setFetchingUrl(false);
        }
    };

    // Handle Clipboard Paste
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Only handle image paste if in image mode
            if (importMode !== 'image') return;
            
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        addImageFromBlob(blob);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [importMode]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Enter or Cmd+Enter: Add line in current section
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && sections.length > 0) {
                e.preventDefault();
                const lastSectionIdx = sections.length - 1;
                const newSections = [...sections];
                newSections[lastSectionIdx].lines.push({ words: [{ word: '' }] });
                setSections(newSections);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sections]);

    // Run OCR on all images
    const runOCR = async () => {
        if (images.length === 0) return;

        setProcessing(true);
        setStatus('Initializing OCR engine...');

        try {
            // Support both English and Hebrew
            const worker = await createWorker('eng+heb', 1, {
                logger: (m: any) => {
                    if (m.status === 'recognizing text') {
                        const imageProgress = m.progress || 0;
                        const totalProgress = ((processingImageIndex + imageProgress) / images.length) * 100;
                        setProgress(Math.round(totalProgress));
                        setStatus(`Processing image ${processingImageIndex + 1}/${images.length}: ${Math.round(imageProgress * 100)}%`);
                    } else {
                        setStatus(`Image ${processingImageIndex + 1}/${images.length}: ${m.status}`);
                    }
                }
            });

            const allSections: ChordSection[] = [];
            let firstTitle = '';
            let firstArtist = '';
            let allOCRText = ''; // Collect all OCR text for validation

            // Process each image sequentially
            for (let i = 0; i < images.length; i++) {
                setProcessingImageIndex(i);
                setStatus(`Processing image ${i + 1}/${images.length}...`);

                const { data: { text } } = await worker.recognize(images[i].file);
                allOCRText += text + '\n'; // Accumulate OCR text
            const processed = processOCRText(text);

                // Use title/artist from first image only
                if (i === 0) {
                    firstTitle = processed.title || 'Untitled Song';
                    firstArtist = processed.artist || 'Unknown Artist';
                }

                // Add sections from this image
                if (processed.sections && processed.sections.length > 0) {
                    allSections.push(...processed.sections);
                }

                // Mark image as processed
                setImages(prev => prev.map((img, idx) =>
                    idx === i ? { ...img, processed: true } : img
                ));
            }

            // Validate chords with parseChord first
            const processedSheet: Partial<ChordSheet> = {
                title: firstTitle,
                artist: firstArtist,
                sections: allSections
            };

            const validatedSheet = validateChordSheet(processedSheet);

            // Client-side lightweight validation (instant feedback)
            const clientValidation = validateAll(
                images[0]?.file || null,
                allOCRText, // OCR text from all images
                validatedSheet
            );
            setValidationResult(clientValidation);

            // Use LLM vision to validate OCR results against the image
            // Use the first image for validation (or could validate each image separately)
            if (images.length > 0) {
                setStatus('Validating with AI...');
                try {
                    const llmValidatedSheet = await validateOCRWithImage(images[0].file, validatedSheet);
                    setTitle(llmValidatedSheet.title || firstTitle);
                    setArtist(llmValidatedSheet.artist || firstArtist);
                    setSections(llmValidatedSheet.sections || allSections);
                } catch (error) {
                    console.error('LLM validation failed, using OCR results:', error);
                    // Fall back to validated sheet if LLM fails
                    setTitle(validatedSheet.title || firstTitle);
                    setArtist(validatedSheet.artist || firstArtist);
                    setSections(validatedSheet.sections || allSections);
                }
            } else {
                setTitle(validatedSheet.title || firstTitle);
                setArtist(validatedSheet.artist || firstArtist);
                setSections(validatedSheet.sections || allSections);
            }

            await worker.terminate();
        } catch (err) {
            console.error(err);
            alert('Failed to process images');
        } finally {
            setProcessing(false);
            setStatus('');
            setProcessingImageIndex(-1);
        }
    };

    // Save to Library
    const handleSave = async () => {
        if (!title || sections.length === 0) {
            alert('Please ensure the song has a title and at least one section.');
            return;
        }

        setSaving(true);
        try {
            // Detect if text contains Hebrew characters - check only actual text content
            const allText = title + ' ' + artist + ' ' +
                sections.flatMap(s =>
                    s.lines.flatMap(l =>
                        l.words.map(w => w.word || '').join(' ')
                    )
                ).join(' ');
            const hasHebrew = /[\u0590-\u05FF]/.test(allText);

            // Get image data if available (limit size to avoid database issues)
            let imageData: string | undefined = undefined;
            if (images.length > 0 && images[0].preview) {
                const preview = images[0].preview;
                // Limit image data to 1MB (base64 is ~33% larger than binary)
                // This prevents database issues with very large images
                if (preview.length < 1_500_000) { // ~1MB base64
                    imageData = preview;
                } else {
                    console.warn('Image data too large, skipping save');
                    // Optionally show a warning to user
                }
            }

            if (editId) {
                // Update existing sheet
                const existingSheet = await getSheet(editId);
                if (!existingSheet) {
                    throw new Error('Sheet not found');
                }
                const updatedSheet: ChordSheet = {
                    ...existingSheet,
                    title,
                    artist,
                    sections,
                    language: hasHebrew ? 'he' : 'en',
                    imageData: imageData || existingSheet.imageData,
                };
                await updateSheet(updatedSheet);
            } else {
                // Create new sheet
            const newSheet: Omit<ChordSheet, 'id' | 'dateAdded'> = {
                title,
                artist,
                sections,
                key: 'C', // Default, user can edit later
                    language: hasHebrew ? 'he' : 'en',
                    imageData,
            };
            await createSheet(newSheet);
            }
            router.push('/');
        } catch (err) {
            console.error('Save error:', err);
            let errorMessage = 'Failed to save song';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message);
            }
            // Show detailed error to help debug production issues
            alert(`Failed to save song: ${errorMessage}\n\nCheck browser console for details.`);
        } finally {
            setSaving(false);
        }
    };

    // Update Section
    const updateSection = (index: number, field: keyof ChordSection, value: any) => {
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setSections(newSections);
    };

    // Update Line
    const updateLine = (sectionIndex: number, lineIndex: number, field: 'words', value: any) => {
        const newSections = [...sections];
        const newLines = [...newSections[sectionIndex].lines];
        newLines[lineIndex] = { ...newLines[lineIndex], [field]: value };
        newSections[sectionIndex].lines = newLines;
        setSections(newSections);
    };

    // Add/Remove helpers
    const addSection = () => {
        setSections([
            ...sections,
            { id: `sec-${Date.now()}`, label: 'New Section', lines: [{ words: [{ word: '' }] }] }
        ]);
    };

    const addLine = (sectionIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].lines.push({ words: [{ word: '' }] });
        setSections(newSections);
    };

    return (
        <div className="min-h-screen bg-wood text-parchment flex flex-col font-sans">
            {/* Header */}
            <header className="bg-wood/90 border-b border-parchment/20 p-4 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-parchment/80 hover:text-parchment transition-colors">← Back</Link>
                    <h1 className="text-xl font-vintage font-bold text-parchment">Import Song</h1>
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={() => {
                                setImportMode('text');
                                handleClearAll();
                            }}
                            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                                importMode === 'text'
                                    ? 'bg-parchment text-wood'
                                    : 'bg-wood/50 text-parchment/80 hover:bg-wood/70'
                            }`}
                        >
                            📝 Paste Text
                        </button>
                        <button
                            onClick={() => {
                                setImportMode('image');
                                handleClearAll();
                            }}
                            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                                importMode === 'image'
                                    ? 'bg-parchment text-wood'
                                    : 'bg-wood/50 text-parchment/80 hover:bg-wood/70'
                            }`}
                        >
                            📷 Image
                        </button>
                        <button
                            onClick={() => {
                                setImportMode('url');
                                handleClearAll();
                            }}
                            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                                importMode === 'url'
                                    ? 'bg-parchment text-wood'
                                    : 'bg-wood/50 text-parchment/80 hover:bg-wood/70'
                            }`}
                        >
                            🔗 Ultimate Guitar
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {sections.length > 0 && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save to Library'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Image Upload & Preview, URL Input, or Text Paste */}
                <div className="w-1/2 border-r border-parchment/20 flex flex-col bg-black/20">
                    {importMode === 'text' ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="w-full max-w-2xl space-y-6">
                                <div className="text-center mb-6">
                                    <div className="text-6xl mb-4">📝</div>
                                    <h3 className="text-xl font-bold mb-2 text-parchment">Paste Song Lyrics</h3>
                                    <p className="text-parchment/60">Paste your lyrics here. You can add chords later!</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <textarea
                                        value={pastedText}
                                        onChange={(e) => setPastedText(e.target.value)}
                                        placeholder={`Example:
[Verse]
This is a line of lyrics
Another line here

[Chorus]
Chorus lyrics go here
More chorus lyrics`}
                                        className="w-full h-96 bg-wood/50 text-parchment px-4 py-3 rounded-lg border border-parchment/30 focus:outline-none focus:border-parchment focus:ring-2 focus:ring-parchment/20 font-mono text-sm resize-none"
                                        onPaste={(e) => {
                                            // Auto-parse on paste if text looks like lyrics
                                            setTimeout(() => {
                                                const text = e.currentTarget.value;
                                                if (text.trim() && text.split('\n').length > 2) {
                                                    // Check if it looks like structured lyrics
                                                    const hasMultipleLines = text.split('\n').length >= 3;
                                                    const hasSectionMarkers = /\[(Verse|Chorus|Bridge|Intro|Outro)\]/i.test(text);
                                                    
                                                    if (hasMultipleLines && (hasSectionMarkers || text.split('\n').length >= 5)) {
                                                        // Auto-parse after a short delay
                                                        setTimeout(() => {
                                                            handleParseText();
                                                        }, 500);
                                                    }
                                                }
                                            }, 100);
                                        }}
                                    />
                                    <button
                                        onClick={handleParseText}
                                        disabled={processing || !pastedText.trim()}
                                        className="w-full bg-parchment text-wood px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-white transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {processing ? 'Parsing...' : 'Create Song'}
                                    </button>
                                    {status && (
                                        <div className={`p-3 rounded-lg text-sm ${
                                            status.includes('parsed') || status.includes('Success')
                                                ? 'bg-green-900/50 text-green-200' 
                                                : 'bg-yellow-900/50 text-yellow-200'
                                        }`}>
                                            {status}
                                        </div>
                                    )}
                                </div>

                                <div className="text-parchment/40 text-sm mt-4">
                                    <p className="mb-2">💡 Tips:</p>
                                    <ul className="list-disc list-inside space-y-1 text-parchment/60">
                                        <li>Paste lyrics line by line</li>
                                        <li>Use [Verse], [Chorus], [Bridge] to create sections</li>
                                        <li>Supports ChordPro format: [C]Hello [Am]world</li>
                                        <li>Supports alternating lines: chords above, lyrics below</li>
                                        <li>You can add/edit chords later by clicking on the chord boxes</li>
                                        <li>Supports both Hebrew (RTL) and English (LTR)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : importMode === 'url' ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="w-full max-w-2xl space-y-6">
                                <div className="text-center mb-6">
                                    <div className="text-6xl mb-4">🔗</div>
                                    <h3 className="text-xl font-bold mb-2 text-parchment">Import from Ultimate Guitar</h3>
                                    <p className="text-parchment/60">Paste an Ultimate Guitar chord sheet URL</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <input
                                        type="url"
                                        value={ugUrl}
                                        onChange={(e) => setUgUrl(e.target.value)}
                                        placeholder="https://www.ultimate-guitar.com/tab/..."
                                        className="w-full bg-wood/50 text-parchment px-4 py-3 rounded-lg border border-parchment/30 focus:outline-none focus:border-parchment focus:ring-2 focus:ring-parchment/20"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !fetchingUrl) {
                                                handleFetchFromUrl();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleFetchFromUrl}
                                        disabled={fetchingUrl || !ugUrl.trim()}
                                        className="w-full bg-parchment text-wood px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-white transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {fetchingUrl ? 'Fetching...' : 'Import Song'}
                                    </button>
                                    {status && (
                                        <div className={`p-3 rounded-lg text-sm ${
                                            status.includes('Success') 
                                                ? 'bg-green-900/50 text-green-200' 
                                                : 'bg-yellow-900/50 text-yellow-200'
                                        }`}>
                                            {status}
                                        </div>
                                    )}
                                </div>

                                <div className="text-parchment/40 text-sm mt-4">
                                    <p className="mb-2">💡 Tip: Copy the URL from your browser's address bar when viewing a chord sheet on Ultimate Guitar.</p>
                                    <p>Example: <code className="bg-wood/30 px-2 py-1 rounded">https://www.ultimate-guitar.com/tab/...</code></p>
                                </div>
                            </div>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="border-2 border-dashed border-parchment/40 rounded-xl p-12 text-center hover:border-parchment transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-6xl mb-4">📷</div>
                                <h3 className="text-xl font-bold mb-2 text-parchment">Upload Chord Sheet(s)</h3>
                                <p className="text-parchment/60">Click to select multiple images, or paste from clipboard (Ctrl/Cmd+V)</p>
                                <p className="text-parchment/40 text-sm mt-2">You can add multiple images for long songs</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {/* Image List/Tabs */}
                            <div className="bg-black/40 border-b border-parchment/20 p-2 flex gap-2 overflow-x-auto">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors min-w-0 ${selectedImageIndex === idx
                                            ? 'bg-parchment text-wood font-bold'
                                            : 'bg-wood/50 text-parchment/60 hover:bg-wood/70'
                                            }`}
                                    >
                                        <span className="text-sm font-semibold whitespace-nowrap">
                                            Page {idx + 1}
                                        </span>
                                        {img.processed && (
                                            <span className="text-xs">✓</span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage(idx);
                                            }}
                                            className="ml-1 hover:bg-black/20 rounded px-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                    className="px-3 py-2 bg-wood/50 hover:bg-wood/70 text-parchment/80 rounded-lg transition-colors whitespace-nowrap"
                                    title="Add more images (or paste with Ctrl/Cmd+V)"
                                >
                                    + Add
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="px-3 py-2 text-xs text-gray-500 flex items-center whitespace-nowrap">
                                    <span>or paste (Ctrl/Cmd+V)</span>
                                </div>
                            </div>

                            {/* Selected Image Preview */}
                        <div className="flex-1 relative overflow-auto bg-black flex items-center justify-center">
                            <img
                                    src={images[selectedImageIndex]?.preview}
                                    alt={`Preview ${selectedImageIndex + 1}`}
                                className="max-w-full max-h-full object-contain"
                            />
                            {processing && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                                    <div className="w-64 bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
                                        <div
                                            className="bg-yellow-400 h-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-yellow-400 font-bold animate-pulse">{status}</p>
                                </div>
                            )}
                            {!processing && sections.length === 0 && (
                                <button
                                    onClick={runOCR}
                                        className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-parchment text-wood px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white transition-transform hover:scale-105 z-10 border-2 border-wood"
                                >
                                        {images.length > 1 ? `Scan ${images.length} Images` : 'Scan & Extract Text'}
                                </button>
                            )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Editor */}
                <div className="w-1/2 flex flex-col bg-parchment text-gray-900 overflow-hidden border-l border-gray-400 shadow-inner">
                    {sections.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-600 p-8 text-center">
                            <div>
                                <p className="text-xl mb-2 font-vintage font-bold">Ready to Edit</p>
                                {importMode === 'text' ? (
                                    <p>Paste your lyrics in the left panel and click "Create Song".</p>
                                ) : importMode === 'image' ? (
                                <p>Upload an image and click "Scan" to extract chords and lyrics.</p>
                                ) : (
                                    <p>Enter an Ultimate Guitar URL and click "Import Song" to load the chord sheet.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Keyboard Shortcuts Help */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                <strong>Keyboard Shortcuts:</strong> Tab/Shift+Tab = navigate, Enter = add word, Ctrl+Enter = add line, Ctrl+Arrow = move between words
                            </div>
                            
                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 bg-white/50 p-4 rounded-lg border border-gray-300">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1 font-bold">Song Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 font-vintage font-bold focus:ring-2 focus:ring-wood/20 focus:border-wood"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1 font-bold">Artist</label>
                                    <input
                                        type="text"
                                        value={artist}
                                        onChange={(e) => setArtist(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-wood/20 focus:border-wood"
                                    />
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="space-y-6">
                                {sections.map((section, sIdx) => (
                                    <div key={section.id} className="bg-white/40 rounded-lg p-4 border border-gray-300">
                                        <div className="flex justify-between mb-4">
                                            <input
                                                type="text"
                                                value={section.label}
                                                onChange={(e) => updateSection(sIdx, 'label', e.target.value)}
                                                className="bg-transparent text-gray-900 font-vintage font-bold uppercase tracking-wider focus:outline-none text-lg"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newSections = sections.filter((_, i) => i !== sIdx);
                                                    setSections(newSections);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {section.lines.map((line: any, lIdx: number) => {
                                                // Check direction based on first word
                                                const firstWord = line.words[0]?.word || '';
                                                const hasHebrew = /[\u0590-\u05FF]/.test(firstWord);
                                                const direction = hasHebrew ? 'rtl' : 'ltr';

                                                return (
                                                    <div key={lIdx} className="group relative p-4 bg-white/60 rounded border border-gray-200 shadow-sm" dir={direction}>
                                                        {/* Word-by-word editor */}
                                                        <div className={`flex gap-3 flex-wrap items-end ${direction === 'rtl' ? 'flex-row-reverse' : ''}`} dir={direction}>
                                                            {line.words.map((wordObj: any, wIdx: number) => {
                                                                const wordHasHebrew = /[\u0590-\u05FF]/.test(wordObj.word);
                                                                const wordDir = wordHasHebrew ? 'rtl' : 'ltr';
                                                                const chordInputId = `chord-${sIdx}-${lIdx}-${wIdx}`;
                                                                const wordInputId = `word-${sIdx}-${lIdx}-${wIdx}`;

                                                                return (
                                                                    <div key={wIdx} className="flex flex-col items-center gap-1 group/word relative">
                                                                        {/* Chord input */}
                                                                    <input
                                                                            id={chordInputId}
                                                                        type="text"
                                                                        value={wordObj.chord || ''}
                                                                        onChange={(e) => {
                                                                            const newWords = [...line.words];
                                                                            newWords[wIdx] = { ...newWords[wIdx], chord: e.target.value || undefined };
                                                                            updateLine(sIdx, lIdx, 'words', newWords);
                                                                        }}
                                                                            onKeyDown={(e) => {
                                                                                // Tab: move to word input, then next chord
                                                                                if (e.key === 'Tab' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    const wordInput = document.getElementById(wordInputId);
                                                                                    if (wordInput) {
                                                                                        wordInput.focus();
                                                                                    }
                                                                                }
                                                                                // Shift+Tab: move to previous chord
                                                                                if (e.key === 'Tab' && e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    if (wIdx > 0) {
                                                                                        const prevChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx - 1}`);
                                                                                        if (prevChordInput) prevChordInput.focus();
                                                                                    }
                                                                                }
                                                                                // Enter: add new word after this one
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    const newWords = [...line.words];
                                                                                    newWords.splice(wIdx + 1, 0, { word: '', chord: undefined });
                                                                                    updateLine(sIdx, lIdx, 'words', newWords);
                                                                                    setTimeout(() => {
                                                                                        const nextWordInput = document.getElementById(`word-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                        if (nextWordInput) nextWordInput.focus();
                                                                                    }, 10);
                                                                                }
                                                                                // Arrow keys for navigation
                                                                                if (e.key === 'ArrowRight' && e.ctrlKey) {
                                                                                    e.preventDefault();
                                                                                    const nextChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                    if (nextChordInput) nextChordInput.focus();
                                                                                }
                                                                                if (e.key === 'ArrowLeft' && e.ctrlKey) {
                                                                                    e.preventDefault();
                                                                                    if (wIdx > 0) {
                                                                                        const prevChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx - 1}`);
                                                                                        if (prevChordInput) prevChordInput.focus();
                                                                                    }
                                                                                }
                                                                            }}
                                                                            placeholder="C"
                                                                            className="w-20 bg-white text-blue-800 font-bold font-mono text-sm px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-300 transition-all hover:border-blue-400"
                                                                            title="Chord (Tab/Shift+Tab to navigate, Enter to add word, Ctrl+Arrow to move)"
                                                                        />
                                                                        {/* Word input - editable and prominent, aligned with chord box */}
                                                                        <input
                                                                            id={wordInputId}
                                                                            type="text"
                                                                            value={wordObj.word || ''}
                                                                            onChange={(e) => {
                                                                                const newWords = [...line.words];
                                                                                newWords[wIdx] = { ...newWords[wIdx], word: e.target.value };
                                                                                updateLine(sIdx, lIdx, 'words', newWords);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                // Tab: move to next chord input
                                                                                if (e.key === 'Tab' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    const nextChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                    if (nextChordInput) {
                                                                                        nextChordInput.focus();
                                                                                    } else {
                                                                                        // If last word, add new word
                                                                                        const newWords = [...line.words, { word: '', chord: undefined }];
                                                                                        updateLine(sIdx, lIdx, 'words', newWords);
                                                                                        setTimeout(() => {
                                                                                            const newChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                            if (newChordInput) newChordInput.focus();
                                                                                        }, 10);
                                                                                    }
                                                                                }
                                                                                // Shift+Tab: move to previous word
                                                                                if (e.key === 'Tab' && e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    if (wIdx > 0) {
                                                                                        const prevWordInput = document.getElementById(`word-${sIdx}-${lIdx}-${wIdx - 1}`);
                                                                                        if (prevWordInput) prevWordInput.focus();
                                                                                    } else {
                                                                                        const prevChordInput = document.getElementById(`chord-${sIdx}-${lIdx}-${wIdx}`);
                                                                                        if (prevChordInput) prevChordInput.focus();
                                                                                    }
                                                                                }
                                                                                // Enter: add new word after this one
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    const newWords = [...line.words];
                                                                                    newWords.splice(wIdx + 1, 0, { word: '', chord: undefined });
                                                                                    updateLine(sIdx, lIdx, 'words', newWords);
                                                                                    setTimeout(() => {
                                                                                        const nextWordInput = document.getElementById(`word-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                        if (nextWordInput) nextWordInput.focus();
                                                                                    }, 10);
                                                                                }
                                                                                // Arrow keys for navigation
                                                                                if (e.key === 'ArrowRight' && e.ctrlKey) {
                                                                                    e.preventDefault();
                                                                                    const nextWordInput = document.getElementById(`word-${sIdx}-${lIdx}-${wIdx + 1}`);
                                                                                    if (nextWordInput) nextWordInput.focus();
                                                                                }
                                                                                if (e.key === 'ArrowLeft' && e.ctrlKey) {
                                                                                    e.preventDefault();
                                                                                    if (wIdx > 0) {
                                                                                        const prevWordInput = document.getElementById(`word-${sIdx}-${lIdx}-${wIdx - 1}`);
                                                                                        if (prevWordInput) prevWordInput.focus();
                                                                                    }
                                                                                }
                                                                            }}
                                                                            placeholder="word"
                                                                            dir={wordDir}
                                                                            className="w-20 bg-transparent text-gray-900 font-serif text-base px-2 py-1.5 rounded text-center focus:outline-none focus:ring-2 focus:ring-wood/30 border border-transparent hover:border-gray-300 transition-all"
                                                                            title="Word (Tab/Shift+Tab to navigate, Enter to add word, Ctrl+Arrow to move)"
                                                                        />
                                                                        {/* Remove button - positioned absolutely to not affect alignment */}
                                                                        {line.words.length > 1 && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newWords = line.words.filter((_: any, i: number) => i !== wIdx);
                                                                                    updateLine(sIdx, lIdx, 'words', newWords);
                                                                                }}
                                                                                className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/word:opacity-100 text-red-400 hover:text-red-300 text-xs px-1 transition-opacity"
                                                                                title="Remove word (Del)"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                </div>
                                                                );
                                                            })}
                                                            {/* Add word button */}
                                                            <button
                                                                onClick={() => {
                                                                    const newWords = [...line.words, { word: '' }];
                                                                    updateLine(sIdx, lIdx, 'words', newWords);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-sm px-2 py-1 border border-dashed border-gray-300 rounded hover:border-gray-400 transition-opacity"
                                                                title="Add word"
                                                            >
                                                                + Word
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                const newSections = [...sections];
                                                                newSections[sIdx].lines = newSections[sIdx].lines.filter((_: any, i: number) => i !== lIdx);
                                                                setSections(newSections);
                                                            }}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm font-medium"
                                                        >
                                                            ✕ Remove
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            <button
                                                onClick={() => addLine(sIdx)}
                                                className="text-xs text-gray-500 hover:text-gray-700 mt-2 px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                                                title="Add new line (Ctrl+Enter)"
                                            >
                                                + Add Line
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addSection}
                                    className="w-full py-4 border-2 border-dashed border-gray-400 rounded-lg text-gray-500 hover:border-gray-600 hover:text-gray-700 transition-colors"
                                >
                                    + Add Section
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

export default function ImageUploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-wood text-parchment flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl mb-4">Loading...</div>
                </div>
            </div>
        }>
            <ImageUploadPageContent />
        </Suspense>
    );
}
