'use client';

import { ChordSheet } from '@/types';
import Link from 'next/link';
import { deleteSheet } from '@/lib/api';
import { useState } from 'react';

interface SongCardProps {
  sheet: ChordSheet;
  onDelete?: () => void;
}

export default function SongCard({ sheet, onDelete }: SongCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSheet(sheet.id);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete song. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const sectionCount = sheet.sections.length;
  const hasCapo = sheet.capo !== undefined;

  // Check if title/artist contain Hebrew
  const titleHasHebrew = /[\u0590-\u05FF]/.test(sheet.title + (sheet.artist || ''));
  const isRTL = titleHasHebrew;

  return (
    <div className="rounded-lg p-6 bg-parchment hover:bg-white transition-colors border border-gray-400 shadow-md relative group" dir={isRTL ? 'rtl' : 'ltr'}>
      <Link href={`/sheet/${sheet.id}`} className="block">
        <h3 className="text-xl font-vintage font-bold text-gray-900 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>{sheet.title}</h3>
        <p className="text-gray-600 mb-4 font-medium" dir={isRTL ? 'rtl' : 'ltr'}>{sheet.artist}</p>
        <div className={`flex items-center gap-4 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>🌐</span>
            <span dir={sheet.language === 'he' ? 'rtl' : 'ltr'}>{sheet.language === 'he' ? 'עברית' : 'English'}</span>
          </div>
          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>🎵</span>
            <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}{hasCapo ? ' • Capo' : ''}</span>
          </div>
          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>📅</span>
            <span>Added {formatDate(sheet.dateAdded)}</span>
          </div>
        </div>
      </Link>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 opacity-0 group-hover:opacity-100 transition-opacity ${showConfirm ? 'opacity-100' : ''
          } ${showConfirm
            ? 'bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium'
            : 'text-gray-400 hover:text-red-600 text-xl'
          }`}
        title={showConfirm ? 'Click again to confirm' : 'Delete song'}
      >
        {showConfirm ? (isDeleting ? 'Deleting...' : 'Confirm?') : '🗑️'}
      </button>
    </div>
  );
}

