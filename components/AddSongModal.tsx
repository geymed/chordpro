'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSheet } from '@/lib/api';
import { ChordSheet } from '@/types';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSongModal({ isOpen, onClose, onSuccess }: AddSongModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'url' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (mode === 'url') {
        if (!url.trim()) {
          throw new Error('Please enter a URL');
        }
        formData.append('url', url);
      } else {
        if (!file) {
          throw new Error('Please select an image file');
        }
        formData.append('image', file);
      }
      
      formData.append('save', 'true'); // Auto-save after analysis

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to analyze chord sheet');
      }

      const result = await response.json();
      
      // Refresh the page to show the new song
      onSuccess();
      onClose();
      
      // Reset form
      setUrl('');
      setFile(null);
      setPreview(null);
      
      // Optionally navigate to the new sheet
      if (result.sheet?.id) {
        router.push(`/sheet/${result.sheet.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Add Chord Sheet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setMode('url');
                setUrl('');
                setFile(null);
                setPreview(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'url'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              From URL
            </button>
            <button
              onClick={() => {
                setMode('image');
                setUrl('');
                setFile(null);
                setPreview(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'image'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Upload Image
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'url' ? (
              <div>
                <label className="block text-gray-300 mb-2">
                  Chord Sheet URL or Image URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/chord-sheet.jpg"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-yellow-400"
                  disabled={loading}
                />
                <p className="text-sm text-gray-400 mt-2">
                  Paste a link to an image of a chord sheet
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-gray-300 mb-2">
                  Upload Chord Sheet Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-yellow-400"
                  disabled={loading}
                />
                {preview && (
                  <div className="mt-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-w-full h-auto rounded-lg border border-gray-600"
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze & Add'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>How it works:</strong> Our AI will analyze the chord sheet image and extract:
              the song title, artist, chords, lyrics, and structure. The analysis may take 10-30 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

