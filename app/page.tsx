'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getSheets } from '@/lib/api';
import { ChordSheet, Language } from '@/types';
import SongCard from '@/components/SongCard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<Language | 'all'>('all');
  const [sheets, setSheets] = useState<ChordSheet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSheets = () => {
    setLoading(true);
    getSheets()
      .then(setSheets)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      const matchesSearch =
        sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sheet.titleEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sheet.artistEn?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLanguage = languageFilter === 'all' || sheet.language === languageFilter;

      return matchesSearch && matchesLanguage;
    });
  }, [sheets, searchQuery, languageFilter]);

  return (
    <div className="min-h-screen bg-wood text-parchment font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-vintage font-bold text-parchment mb-2">ChordVault</h1>
          <p className="text-parchment/80 text-lg">Your personal guitar chord sheet library</p>
        </div>

        {/* New Header/Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-vintage font-bold text-parchment">My Song Library 🎸</h1>
          <div className="flex gap-4">
            <Link
              href="/upload/image"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <span>📷</span>
              <span>Import from Image</span>
            </Link>

            <Link
              href="/upload"
              className="bg-parchment hover:bg-white text-wood px-4 py-2 rounded-md transition-colors flex items-center gap-2 font-medium"
            >
              <span>📤</span>
              <span>Upload JSON</span>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Search by title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-gray-900 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${languageFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-parchment text-wood hover:bg-white'
                }`}
            >
              All Languages
            </button>
            <button
              onClick={() => setLanguageFilter('he')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${languageFilter === 'he'
                ? 'bg-blue-600 text-white'
                : 'bg-parchment text-wood hover:bg-white'
                }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguageFilter('en')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${languageFilter === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-parchment text-wood hover:bg-white'
                }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Song Grid */}
        {loading ? (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-lg">Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSheets.map((sheet) => (
                <SongCard key={sheet.id} sheet={sheet} onDelete={loadSheets} />
              ))}
            </div>

            {filteredSheets.length === 0 && (
              <div className="text-center text-parchment/60 mt-12">
                <p className="text-lg">No songs found. Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

