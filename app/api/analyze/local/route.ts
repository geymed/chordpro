import { NextRequest, NextResponse } from 'next/server';
import { reconstructChordSheet } from '@/lib/analysis/grid-reconstructor';
import { parseGridTextToChordSheet } from '@/lib/analysis/chord-parser';
import { ChordSheet } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const type = formData.get('type') as string || (formData.get('file') ? 'file' : 'url');

        let sheet: ChordSheet | null = null;

        if (type === 'file' || formData.get('file')) {
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());

            // Save image to disk
            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filepath = `public/uploads/${filename}`;
            const { writeFile } = require('fs/promises');
            await writeFile(filepath, buffer);
            console.log(`Saved image to ${filepath}`);

            // Use Grid Reconstruction (Tesseract)
            console.log('Starting Grid Reconstruction...');
            const gridText = await reconstructChordSheet(buffer);
            console.log('Grid Text Reconstructed');

            // Parse to ChordSheet
            sheet = parseGridTextToChordSheet(gridText);
            sheet.title = file.name.replace(/\.[^/.]+$/, ""); // Use filename as title
            // Add image path to sheet (we need to update the type definition if we want to store it properly, 
            // but for now we can just return it in the response if needed, or maybe the sheet object doesn't support it yet.
            // Let's check types.ts later. For now, let's just save it.)
            sheet.imagePath = filepath;


        } else if (type === 'url' || formData.get('url')) {
            const url = formData.get('url') as string;
            if (!url) {
                return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
            }

            if (url.includes('ultimate-guitar.com')) {
                const { scrapeUltimateGuitar } = require('@/lib/scrapers/ultimate-guitar');
                console.log('Scraping Ultimate Guitar URL:', url);
                sheet = await scrapeUltimateGuitar(url);
            } else {
                return NextResponse.json({ error: 'Only Ultimate Guitar URLs are supported currently' }, { status: 501 });
            }

        } else if (type === 'text' || formData.get('text')) {
            const text = formData.get('text') as string;
            if (!text) {
                return NextResponse.json({ error: 'No text provided' }, { status: 400 });
            }

            // Use the same parser for raw text
            sheet = parseGridTextToChordSheet(text);
        }

        if (!sheet) {
            return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
        }

        return NextResponse.json({ sheet });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
