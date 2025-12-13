'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createWorker } from 'tesseract.js';
import { processOCRText } from '@/lib/ocr-utils';
import { createSheet } from '@/lib/api';
import { ChordSheet, ChordSection } from '@/types';
import { validateChordSheet } from '@/lib/chord-validator';
import { validateOCRWithImage } from '@/lib/llm-validator';
import { validateAll, type ValidationResult } from '@/lib/client-validator';
import Link from 'next/link';

interface ImageData {
    file: File;
    preview: string;
    processed: boolean;
}

export default function ImageUploadPage() {
    const router = useRouter();
    const [images, setImages] = useState<ImageData[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [processingImageIndex, setProcessingImageIndex] = useState<number>(-1);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Editor State
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [sections, setSections] = useState<ChordSection[]>([]);
    const [saving, setSaving] = useState(false);

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
    };

    // Handle Clipboard Paste
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
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
    }, []);

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

            const newSheet: Omit<ChordSheet, 'id' | 'dateAdded'> = {
                title,
                artist,
                sections,
                key: 'C', // Default, user can edit later
                language: hasHebrew ? 'he' : 'en'
            };

            await createSheet(newSheet);
            router.push('/');
        } catch (err) {
            console.error(err);
            alert('Failed to save song');
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
                    <h1 className="text-xl font-vintage font-bold text-parchment">Import from Image</h1>
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

                {/* Left Panel: Image Upload & Preview */}
                <div className="w-1/2 border-r border-parchment/20 flex flex-col bg-black/20">
                    {images.length === 0 ? (
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
                                <p>Upload an image and click "Scan" to extract chords and lyrics.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
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

                                                                return (
                                                                    <div key={wIdx} className="flex flex-col items-center gap-1 group/word relative">
                                                                        {/* Chord input */}
                                                                        <input
                                                                            type="text"
                                                                            value={wordObj.chord || ''}
                                                                            onChange={(e) => {
                                                                                const newWords = [...line.words];
                                                                                newWords[wIdx] = { ...newWords[wIdx], chord: e.target.value || undefined };
                                                                                updateLine(sIdx, lIdx, 'words', newWords);
                                                                            }}
                                                                            placeholder="-"
                                                                            className="w-20 bg-white text-blue-800 font-bold font-mono text-sm px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-300"
                                                                        />
                                                                        {/* Word input - editable and prominent, aligned with chord box */}
                                                                        <input
                                                                            type="text"
                                                                            value={wordObj.word || ''}
                                                                            onChange={(e) => {
                                                                                const newWords = [...line.words];
                                                                                newWords[wIdx] = { ...newWords[wIdx], word: e.target.value };
                                                                                updateLine(sIdx, lIdx, 'words', newWords);
                                                                            }}
                                                                            placeholder="word"
                                                                            dir={wordDir}
                                                                            className="w-20 bg-transparent text-gray-900 font-serif text-base px-2 py-1.5 rounded text-center focus:outline-none focus:ring-2 focus:ring-wood/30 border border-transparent hover:border-gray-300"
                                                                        />
                                                                        {/* Remove button - positioned absolutely to not affect alignment */}
                                                                        {line.words.length > 1 && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newWords = line.words.filter((_: any, i: number) => i !== wIdx);
                                                                                    updateLine(sIdx, lIdx, 'words', newWords);
                                                                                }}
                                                                                className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/word:opacity-100 text-red-400 hover:text-red-300 text-xs px-1"
                                                                                title="Remove word"
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
                                                className="text-xs text-gray-500 hover:text-gray-300 mt-2"
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
