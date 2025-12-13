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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!sheet) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/sheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheet),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8d5b7' }}>
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8d5b7' }}>
        <div className="text-center">
          <h1 className="text-2xl text-gray-900 mb-4 font-serif">Song not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Library
          </button>
        </div>
      </div>
    );
  }

  const isRTL = sheet.language === 'he';
  // Check if title/artist actually contain Hebrew
  const titleHasHebrew = /[\u0590-\u05FF]/.test(sheet.title + (sheet.artist || ''));
  const titleIsRTL = titleHasHebrew;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  return (
    <div className="min-h-screen bg-wood text-parchment font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        {/* Compact Header Row */}
        <div className={`mb-3 flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
          <button
            onClick={() => router.push('/')}
            className="text-parchment hover:text-white px-3 py-1.5 rounded-md hover:bg-parchment/20 transition-colors flex items-center gap-2 font-medium text-sm"
          >
            <span>←</span>
            <span>Back to Library</span>
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="bg-parchment/80 text-wood px-3 py-1.5 rounded-md hover:bg-parchment transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium text-sm"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 font-medium text-sm ${showConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-parchment/80 hover:bg-parchment text-wood'
                }`}
            >
              {showConfirm ? (
                isDeleting ? 'Deleting...' : 'Confirm?'
              ) : (
                <>
                  <span>🗑️</span>
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Song Title Row */}
        <div className="mb-3" dir={titleIsRTL ? 'rtl' : 'ltr'} style={{ textAlign: titleIsRTL ? 'right' : 'left' }}>
          <h1 className="text-2xl font-vintage font-bold text-parchment leading-tight" dir={titleIsRTL ? 'rtl' : 'ltr'}>{sheet?.title}</h1>
          <p className="text-base text-parchment/80" dir={titleIsRTL ? 'rtl' : 'ltr'}>{sheet?.artist}</p>
        </div>

        {/* Song Card Container - Maximized */}
        <div id="song-content" className="bg-parchment rounded-lg p-6 sm:p-8 border border-gray-400 shadow-lg text-gray-900 max-h-[calc(100vh-140px)] overflow-y-auto">
          {/* Chord Sheet Content */}
          <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'} style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
            {sheet?.sections.map((section) => {
              const labelHasHebrew = /[\u0590-\u05FF]/.test(section.label);
              const sectionHasHebrew = section.lines.some(line =>
                line.words.some(w => w.word && /[\u0590-\u05FF]/.test(w.word))
              );
              const sectionIsRTL = sectionHasHebrew;
              const labelIsRTL = labelHasHebrew;

              return (
                <div key={section.id} className="space-y-4" dir={sectionIsRTL ? 'rtl' : 'ltr'} style={{ direction: sectionIsRTL ? 'rtl' : 'ltr' }}>
                  <h2 className="text-gray-800 font-vintage font-bold text-xl mb-4 tracking-wide uppercase" dir={labelIsRTL ? 'rtl' : 'ltr'} style={{ direction: labelIsRTL ? 'rtl' : 'ltr', textAlign: labelIsRTL ? 'right' : 'left', width: '100%' }}>{section.label}</h2>
                  {section.lines.map((line, lineIdx) => (
                    <ChordLine
                      key={lineIdx}
                      line={line}
                      rtl={isRTL}
                      editable={isEditing}
                      onLineChange={(updatedLine) => {
                        if (!sheet) return;
                        const updatedSections = [...sheet.sections];
                        const sectionIndex = sheet.sections.findIndex(s => s.id === section.id);
                        updatedSections[sectionIndex].lines[lineIdx] = updatedLine;
                        setSheet({ ...sheet, sections: updatedSections });
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <AutoScrollControl targetId="song-content" />
    </div>
  );
}
