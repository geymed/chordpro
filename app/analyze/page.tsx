'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChordSheet } from '@/types';

export default function AnalyzePage() {
  const router = useRouter();
  const [method, setMethod] = useState<'url' | 'file' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState('llama3.1:8b');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ChordSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [saveToDb, setSaveToDb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkOllamaHealth = async () => {
    try {
      const response = await fetch('/api/analyze/local');
      const data = await response.json();
      setOllamaAvailable(data.available);
      
      if (data.available) {
        // Try to get available models (optional)
        // For now, we'll just use the default
      }
    } catch (err) {
      setOllamaAvailable(false);
    }
  };

  // Check Ollama availability on mount
  useEffect(() => {
    checkOllamaHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      
      if (method === 'url' && url) {
        formData.append('url', url);
      } else if (method === 'file' && file) {
        formData.append('file', file);
      } else if (method === 'text' && text) {
        formData.append('text', text);
      } else {
        setError('Please provide input based on the selected method');
        setAnalyzing(false);
        return;
      }

      if (model) {
        formData.append('model', model);
      }

      if (saveToDb) {
        formData.append('save', 'true');
      }

      const response = await fetch('/api/analyze/local', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.sheet);
      
      if (saveToDb && data.sheet) {
        // Redirect to the sheet page
        router.push(`/sheet/${data.sheet.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!result) return;

    try {
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        throw new Error('Failed to save to library');
      }

      const saved = await response.json();
      router.push(`/sheet/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-serif mb-2">Local Chord Sheet Analysis</h1>
          <p className="text-gray-400">Analyze chord sheets locally using Ollama</p>
        </div>

        {/* Ollama Status */}
        {ollamaAvailable === false && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">
              ⚠️ Ollama is not available. Make sure Ollama is running:
            </p>
            <code className="block mt-2 text-sm bg-gray-800 p-2 rounded">
              ollama serve
            </code>
          </div>
        )}

        {ollamaAvailable === true && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-300">✅ Ollama is available and ready</p>
          </div>
        )}

        {/* Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Input Method</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMethod('url')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'url'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              URL
            </button>
            <button
              onClick={() => setMethod('file')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'file'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setMethod('text')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'text'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Paste Text
            </button>
          </div>
        </div>

        {/* URL Input */}
        {method === 'url' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Chord Sheet URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tabs.ultimate-guitar.com/..."
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-yellow-400"
            />
          </div>
        )}

        {/* File Upload */}
        {method === 'file' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Upload File</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".txt,.text,image/*"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-yellow-400"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        )}

        {/* Text Input */}
        {method === 'text' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Paste Chord Sheet Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your chord sheet text here..."
              rows={10}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-yellow-400 font-mono text-sm"
            />
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Ollama Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="llama3.1:8b"
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-yellow-400"
          />
          <p className="mt-1 text-xs text-gray-500">
            Default: llama3.1:8b. Make sure the model is pulled: <code>ollama pull llama3.1:8b</code>
          </p>
        </div>

        {/* Save to Database Option */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={(e) => setSaveToDb(e.target.checked)}
              className="w-4 h-4 text-yellow-400 bg-gray-800 border-gray-700 rounded focus:ring-yellow-400"
            />
            <span>Save to library immediately after analysis</span>
          </label>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || ollamaAvailable === false}
          className="w-full bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg border-2 border-black hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Chord Sheet'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-serif mb-4">Analysis Results</h2>
            
            <div className="mb-4">
              <p className="text-lg font-semibold">{result.title}</p>
              <p className="text-gray-400">by {result.artist}</p>
              {result.key && <p className="text-sm text-gray-500">Key: {result.key}</p>}
              {result.tempo && <p className="text-sm text-gray-500">Tempo: {result.tempo}</p>}
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Sections: {result.sections.length}</p>
              {result.sections.map((section, idx) => (
                <div key={idx} className="mb-2 text-sm">
                  <span className="text-yellow-400">{section.label}</span> ({section.type})
                </div>
              ))}
            </div>

            {!saveToDb && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveToLibrary}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Save to Library
                </button>
                <button
                  onClick={() => router.push(`/sheet/${result.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  View Full Sheet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

