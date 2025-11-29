'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSheet } from '@/lib/api';
import { ChordSheet } from '@/types';

export default function UploadPage() {
    const router = useRouter();
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = async (files: FileList) => {
        setUploading(true);
        setStatus(null);
        const file = files[0];

        try {
            if (file.name.endsWith('.json')) {
                // Handle single JSON file
                const text = await file.text();
                const sheet = JSON.parse(text) as ChordSheet;
                await createSheet(sheet);
                setStatus({ type: 'success', message: `Successfully uploaded "${sheet.title}"` });
            } else if (file.name.endsWith('.zip')) {
                // Handle ZIP file (bulk upload)
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/sheets/upload/bulk', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Upload failed');
                }

                setStatus({
                    type: 'success',
                    message: `Uploaded ${result.uploaded} songs. ${result.failed > 0 ? `(${result.failed} failed)` : ''}`,
                });
            } else {
                throw new Error('Invalid file type. Please upload .json or .zip files.');
            }
        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Upload failed',
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Upload Songs 📤</h1>
                        <p className="text-gray-400">Add songs to your library from JSON or ZIP files</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        ← Back to Library
                    </button>
                </header>

                <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                    <div
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive
                                ? 'border-yellow-400 bg-gray-700/50'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".json,.zip"
                            className="hidden"
                            onChange={handleChange}
                        />

                        <div className="space-y-4">
                            <div className="text-6xl">📄</div>
                            <h3 className="text-xl font-bold">Drag & Drop files here</h3>
                            <p className="text-gray-400">
                                Supports <strong>.json</strong> (single song) or <strong>.zip</strong> (bulk upload)
                            </p>
                            <button
                                onClick={() => inputRef.current?.click()}
                                className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-6 py-2 rounded-lg font-bold transition-colors"
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Select Files'}
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div
                            className={`mt-6 p-4 rounded-lg ${status.type === 'success'
                                    ? 'bg-green-900/50 border border-green-500/50 text-green-200'
                                    : 'bg-red-900/50 border border-red-500/50 text-red-200'
                                }`}
                        >
                            {status.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
