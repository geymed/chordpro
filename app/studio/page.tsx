'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSheet } from '@/lib/api';
import { ChordSheet } from '@/types';
import ChordLine from '@/components/ChordLine';

import { notFound } from 'next/navigation';

export default function StudioPage() {
    // Protect route in production
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'url' | 'text' | 'pdf' | 'image'>('url');
    const [input, setInput] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [pageRange, setPageRange] = useState('');
    const [model, setModel] = useState('llava');
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<ChordSheet[]>([]);
    const [error, setError] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [saving, setSaving] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setError('');
        setResults([]);
        setLogs(['Starting analysis...']);

        try {
            let content = '';
            if (activeTab === 'text' || activeTab === 'url') { // Assuming 'input' is used for both text and url
                content = input;
            } else if (activeTab === 'pdf' || activeTab === 'image') {
                const fileToProcess = activeTab === 'pdf' ? pdfFile : imageFile;
                if (!fileToProcess) {
                    throw new Error(`Please select a ${activeTab.toUpperCase()} file`);
                }
                // Convert file to base64
                content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data URL prefix
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(fileToProcess);
                });
            }

            const response = await fetch('/api/analyze/local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    content,
                    model: model, // Use selected model
                    pageRange: activeTab === 'pdf' ? pageRange : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            setResults(data.sheets);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async (sheet: ChordSheet) => {
        setSaving(sheet.id);
        try {
            await createSheet(sheet);
            alert('Song saved to library!');
        } catch (err) {
            alert('Failed to save song');
            console.error(err);
        } finally {
            setSaving(null);
        }
    };

    const handleDownload = (sheet: ChordSheet) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sheet, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${sheet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Local Studio 🎙️</h1>
                        <p className="text-gray-400">Analyze chord sheets locally using Ollama</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        ← Back to Library
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-lg">
                                {(['url', 'text', 'pdf', 'image'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                                            ? 'bg-yellow-400 text-gray-900'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {tab.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {activeTab === 'url' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">URL</label>
                                        <input
                                            type="url"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="https://tabs.ultimate-guitar.com/..."
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {activeTab === 'text' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Text Content</label>
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Paste chord sheet text here..."
                                            rows={10}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none font-mono text-sm"
                                        />
                                    </div>
                                )}

                                {activeTab === 'pdf' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">PDF File</label>
                                        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-500 transition-colors cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="text-slate-400">
                                                {pdfFile ? (
                                                    <span className="text-yellow-400 font-medium">{pdfFile.name}</span>
                                                ) : (
                                                    <span>Click or drag PDF here</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                                Page Range (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={pageRange}
                                                onChange={(e) => setPageRange(e.target.value)}
                                                placeholder="e.g., 1, 3-5, 10"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Leave empty to analyze the first 50 pages.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'image' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Image File</label>
                                        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-500 transition-colors cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="text-slate-400">
                                                {imageFile ? (
                                                    <span className="text-yellow-400 font-medium">{imageFile.name}</span>
                                                ) : (
                                                    <span>Click or drag image here (PNG, JPG, etc.)</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Upload a screenshot or photo of a chord sheet for vision-based analysis.
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing ||
                                        (activeTab === 'url' && !input) ||
                                        (activeTab === 'text' && !input) ||
                                        (activeTab === 'pdf' && !pdfFile) ||
                                        (activeTab === 'image' && !imageFile)
                                    }
                                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${analyzing
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 shadow-lg hover:shadow-yellow-400/20'
                                        }`}
                                >
                                    {analyzing ? 'Analyzing...' : 'Analyze Song'}
                                </button>

                                {error && (
                                    <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {results.length > 0 ? (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span>Found {results.length} Songs</span>
                                    <span className="text-sm font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                                        Review & Save
                                    </span>
                                </h2>

                                {results.map((sheet, idx) => (
                                    <div key={idx} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                        <div className="p-6 border-b border-gray-700 flex items-start justify-between bg-gray-800/50">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-1">{sheet.title}</h3>
                                                <p className="text-gray-400">{sheet.artist}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDownload(sheet)}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                                    title="Download JSON"
                                                >
                                                    📥 JSON
                                                </button>
                                                <button
                                                    onClick={() => handleSave(sheet)}
                                                    disabled={saving === sheet.id}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                                >
                                                    {saving === sheet.id ? 'Saving...' : '💾 Save to Library'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-900/50 max-h-[500px] overflow-y-auto">
                                            <div className={`space-y-6 ${sheet.language === 'he' ? 'text-right' : 'text-left'}`}>
                                                {sheet.sections.map((section) => (
                                                    <div key={section.id} className="space-y-2">
                                                        <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wider">
                                                            {section.label}
                                                        </h4>
                                                        {section.lines.map((line, lineIdx) => (
                                                            <ChordLine key={lineIdx} line={line} rtl={sheet.language === 'he'} />
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-800">
                                <div className="text-6xl mb-4">🎸</div>
                                <p className="text-xl font-medium">Ready to analyze</p>
                                <p className="text-sm mt-2">Select a source and click analyze to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
