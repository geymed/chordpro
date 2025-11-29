import { NextRequest, NextResponse } from 'next/server';
import { analyzeChordSheetWithOllama } from '@/lib/ollama-analyzer';
import { extractFromUrl, extractFromPdf } from '@/lib/content-extractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for Vercel/Next.js

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, model = 'llama3.1:8b', pageRange } = body;

    // Protect route in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Local analysis is not available in production' },
        { status: 403 }
      );
    }

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing type or content' },
        { status: 400 }
      );
    }

    type PageData = string | { type: 'image'; imageBase64: string; pageNumber: number };
    let pagesToAnalyze: PageData[] = [];

    // Parse page range if provided
    let targetPages: number[] = [];
    if (pageRange) {
      try {
        const parts = pageRange.split(',').map((p: string) => p.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) targetPages.push(i);
            }
          } else {
            const num = Number(part);
            if (!isNaN(num)) targetPages.push(num);
          }
        }
        // Remove duplicates and sort
        targetPages = [...new Set(targetPages)].sort((a, b) => a - b);
      } catch (e) {
        console.warn('Failed to parse page range:', e);
      }
    }

    // Extract text based on type
    if (type === 'text') {
      pagesToAnalyze = [content];
    } else if (type === 'url') {
      try {
        const text = await extractFromUrl(content);
        pagesToAnalyze = [text];
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to extract from URL: ${error instanceof Error ? error.message : String(error)}` },
          { status: 400 }
        );
      }
    } else if (type === 'pdf') {
      try {
        // content is expected to be base64 string
        const buffer = Buffer.from(content, 'base64');

        // Render PDF pages as images instead of extracting text
        const { renderPdfPageToImage } = require('@/lib/pdf-to-image');

        // Determine which pages to render
        const pagesToRender = targetPages.length > 0 ? targetPages : [1]; // Default to first page if no range specified

        console.log(`Rendering ${pagesToRender.length} PDF pages as images...`);

        // Render each page as base64 image
        const imagePromises = pagesToRender.map(pageNum => renderPdfPageToImage(buffer, pageNum));
        const images = await Promise.all(imagePromises);

        // Store images for vision model analysis
        // We'll analyze each image separately
        pagesToAnalyze = images.map((img, idx) => ({
          type: 'image',
          imageBase64: img,
          pageNumber: pagesToRender[idx]
        }));

        console.log(`Rendered ${pagesToAnalyze.length} pages as images`);
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to render PDF: ${error instanceof Error ? error.message : String(error)}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be text, url, or pdf' },
        { status: 400 }
      );
    }

    let allSheets: any[] = [];

    // Analyze pages
    // For text/url, it's just 1 "page" (the whole content)
    // For PDF, it's actual pages.

    // If we have many pages, we process them sequentially to show progress in logs
    // and avoid overwhelming the LLM.

    const totalPages = pagesToAnalyze.length;

    // Safety limit for now to avoid running for hours on 1500 pages
    // The user can split the PDF manually if they want *everything* or we can implement a "range" feature later.
    // But for now, let's process up to 20 pages if it's a PDF, or maybe just warn?
    // The user said "split it to pages", implying they want it all.
    // But 1500 pages * 10s/page = 4 hours.
    // I'll add a hard limit of 50 pages for this iteration and log a warning.
    const MAX_PAGES = 50;
    const limit = Math.min(totalPages, MAX_PAGES);

    if (totalPages > MAX_PAGES) {
      console.warn(`PDF has ${totalPages} pages. Only analyzing the first ${MAX_PAGES} to prevent timeout.`);
    }

    for (let i = 0; i < limit; i++) {
      const pageData = pagesToAnalyze[i];

      // Check if it's an image object or text string
      const isImage = typeof pageData === 'object' && pageData.type === 'image';
      const pageContent = isImage ? null : pageData as string;
      const imageBase64 = isImage ? (pageData as any).imageBase64 : null;
      const pageNumber = isImage ? (pageData as any).pageNumber : i + 1;

      if (!isImage && !pageContent?.trim()) continue; // Skip empty text pages

      console.log(`Analyzing page ${pageNumber} (${i + 1}/${limit})...`);

      if (!isImage) {
        // Log text preview
        console.log('--- Text sent to Ollama (First 200 chars) ---');
        console.log(pageContent!.substring(0, 200));
        console.log('------------------------------------------------');
      } else {
        console.log('--- Sending image to vision model ---');
      }

      try {
        // We treat each page as a potential song source.
        // We might want to pass context if a song spans pages, but for now let's assume 1 page = 1 song or part of song.
        // For multi-song pages, the LLM should return an array.
        const sheets = await analyzeChordSheetWithOllama({
          text: isImage ? undefined : pageContent!,
          imageBase64: isImage ? imageBase64 : undefined,
          model: model || 'llama3.1:8b',
        });

        if (sheets && sheets.length > 0) {
          console.log(`Found ${sheets.length} songs on page ${i + 1}`);
          allSheets = [...allSheets, ...sheets];
        }
      } catch (err) {
        console.error(`Error analyzing page ${i + 1}:`, err);
      }
    }

    // Deduplicate songs based on title and artist
    const uniqueSheets = allSheets.filter((sheet, index, self) =>
      index === self.findIndex((t) => (
        t.title === sheet.title && t.artist === sheet.artist
      ))
    );

    return NextResponse.json({ sheets: uniqueSheets });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
