'use client';

import { ChordSheet } from '@/types';
import Link from 'next/link';

interface SongCardProps {
  sheet: ChordSheet;
}

export default function SongCard({ sheet }: SongCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const sectionCount = sheet.sections.length;
  const hasCapo = sheet.capo !== undefined;

  return (
    <Link href={`/sheet/${sheet.id}`}>
      <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-2">{sheet.title}</h3>
        <p className="text-gray-400 mb-4">{sheet.artist}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span>🌐</span>
            <span>{sheet.language === 'he' ? 'עברית' : 'English'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🎵</span>
            <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}{hasCapo ? ' • Capo' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>Added {formatDate(sheet.dateAdded)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

