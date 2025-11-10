'use client';

import { useState, useMemo, useEffect } from 'react';
import { getSheets } from '@/lib/api';
import { ChordSheet, Language } from '@/types';
import SongCard from '@/components/SongCard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<Language | 'all'>('all');
  const [sheets, setSheets] = useState<ChordSheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSheets()
      .then(setSheets)
      .catch(console.error)
      .finally(() => setLoading(false));
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
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-serif text-white mb-2">ChordVault</h1>
          <p className="text-gray-400 text-lg">Your personal guitar chord sheet library</p>
        </div>

        {/* Add New Button */}
        <div className="mb-8">
          <button className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg border-2 border-black hover:bg-yellow-300 transition-colors">
            + Add New Chord Sheet
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Search by title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-yellow-400"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                languageFilter === 'all'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Languages
            </button>
            <button
              onClick={() => setLanguageFilter('he')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                languageFilter === 'he'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguageFilter('en')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                languageFilter === 'en'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Song Grid */}
        {loading ? (
          <div className="text-center text-gray-500 mt-12">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSheets.map((sheet) => (
                <SongCard key={sheet.id} sheet={sheet} />
              ))}
            </div>

            {filteredSheets.length === 0 && (
              <div className="text-center text-gray-500 mt-12">
                <p>No songs found. Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

