import { NextRequest, NextResponse } from 'next/server';
import { analyzeChordSheet } from '@/lib/llm-analyzer';
import { createSheet } from '@/lib/db';

// POST /api/analyze - Analyze a chord sheet from URL or image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const url = formData.get('url') as string | null;
    const file = formData.get('image') as File | null;

    if (!url && !file) {
      return NextResponse.json(
        { error: 'Either URL or image file is required' },
        { status: 400 }
      );
    }

    let options: { url?: string; imageBase64?: string; imageUrl?: string } = {};

    if (url) {
      // Validate URL
      try {
        new URL(url);
        options.url = url;
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    } else if (file) {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      options.imageBase64 = base64;
    }

    // Analyze the chord sheet using LLM
    const sheet = await analyzeChordSheet(options);

    // Optionally save to database immediately
    const saveToDb = formData.get('save') === 'true';
    if (saveToDb) {
      await createSheet(sheet);
    }

    return NextResponse.json({
      success: true,
      sheet,
      message: saveToDb ? 'Chord sheet analyzed and saved' : 'Chord sheet analyzed'
    });
  } catch (error: any) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze chord sheet',
        details: error.message
      },
      { status: 500 }
    );
  }
}

