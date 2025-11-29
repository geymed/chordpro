'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSheet, deleteSheet } from '@/lib/api';
import { ChordSheet } from '@/types';
import ChordLine from '@/components/ChordLine';
import AutoScrollControl from '@/components/AutoScrollControl';

export default function SheetPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [sheet, setSheet] = useState<ChordSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getSheet(id)
      .then(setSheet)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSheet(id);
      router.push('/');
    } catch (error) {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete song. Please try again.');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Song not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-yellow-400 hover:text-yellow-300"
          >
            ← Back to Library
          </button>
        </div>
      </div>
    );
  }

  const isRTL = sheet.language === 'he';
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button and Delete Button */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Library</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showConfirm
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-red-400'
              }`}
          >
            {showConfirm ? (
              isDeleting ? 'Deleting...' : 'Confirm Delete?'
            ) : (
              <>
                <span>🗑️</span>
                <span>Delete</span>
              </>
            )}
          </button>
        </div>

        {/* Song Header */}
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-4xl font-bold text-white mb-2">{sheet.title}</h1>
          <p className="text-gray-400 text-lg mb-4">{sheet.artist}</p>

          <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span>{sheet.language === 'he' ? 'עברית' : 'English'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Added {formatDate(sheet.dateAdded)}</span>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-700 my-6"></div>

          {/* Key and Tempo */}
          <div className="flex items-center gap-6 text-sm">
            {sheet.key && (
              <div className="flex items-center gap-2">
                <span>🔧</span>
                <span className="text-gray-400">Key:</span>
                <span className="text-yellow-400 font-semibold">{sheet.key}</span>
              </div>
            )}
            {sheet.tempo && (
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span className="text-gray-400">Tempo:</span>
                <span className="text-yellow-400 font-semibold">{sheet.tempo}</span>
              </div>
            )}
            {sheet.capo !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Capo:</span>
                <span className="text-yellow-400 font-semibold">{sheet.capo}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-gray-700 my-6"></div>
        </div>

        {/* Chord Sheet Content */}
        <div className={`space-y-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          {sheet.sections.map((section) => (
            <div key={section.id} className="space-y-4">
              <h2 className="text-yellow-400 font-bold text-lg mb-4">{section.label}</h2>
              {section.lines.map((line, idx) => (
                <ChordLine key={idx} line={line} rtl={isRTL} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <AutoScrollControl />
    </div>
  );
}
