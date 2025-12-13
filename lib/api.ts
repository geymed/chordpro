import { ChordSheet } from '@/types';

const API_BASE = '/api/sheets';

export async function getSheets(): Promise<ChordSheet[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch sheets');
  return response.json();
}

export async function getSheet(id: string): Promise<ChordSheet | null> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch sheet');
  return response.json();
}

export async function createSheet(sheet: Omit<ChordSheet, 'id' | 'dateAdded'>): Promise<ChordSheet> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sheet),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || errorData.details || `Server error (HTTP status ${response.status}): ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function updateSheet(sheet: ChordSheet): Promise<ChordSheet> {
  const response = await fetch(`${API_BASE}/${sheet.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sheet),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || errorData.details || `Server error (HTTP status ${response.status}): ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function deleteSheet(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete sheet');
}

