import * as fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Polyfill for DOMMatrix if not available (needed for pdf-parse in Next.js)
if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix { };
}

const pdf = require('pdf-parse');

const TIMEOUT_MS = 30000;

/**
 * Reverses Hebrew words in a string while preserving English/chord text
 * This is needed because PDFs store Hebrew in visual order, but LLMs expect logical order
 */
function reverseHebrewWords(text: string): string {
    // Split by lines
    const lines = text.split('\n');

    return lines.map(line => {
        // Split line into tokens (words/chords)
        const tokens = line.split(/\s+/);

        return tokens.map(token => {
            // Check if token contains Hebrew
            if (/[\u0590-\u05FF]/.test(token)) {
                // Reverse the Hebrew word
                return token.split('').reverse().join('');
            }
            // Keep English/chords as-is
            return token;
        }).join(' ');
    }).join('\n');
}

export async function extractFromPdf(buffer: Buffer): Promise<string> {
    try {
        // Lazy load pdf-parse
        let pdf = require('pdf-parse');

        // Handle default export if present
        if (pdf.default) {
            pdf = pdf.default;
        }

        // Check for class-based API (v2.x style) - this is what is installed
        if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdf.PDFParse(uint8Array);

            // getText might return a Promise or value depending on implementation
            // Based on debug script, it returns an object but we need to await it if it's a promise
            // or just use it. But wait, debug script said getText returns object and error was "Invalid PDF structure"
            // which implies it ran.

            // Let's try the standard way for this version
            const data = await parser.getText();
            return data.text;
        }

        // Check for function-based API (v1.x style) - fallback
        if (typeof pdf === 'function') {
            const data = await pdf(buffer);
            return data.text;
        }

        throw new Error(`Unknown pdf-parse export structure. Keys: ${Object.keys(pdf)}`);
    } catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function extractPagesFromPdf(buffer: Buffer, pagesToExtract?: number[]): Promise<string[]> {
    try {
        // Lazy load pdf-parse
        let pdf = require('pdf-parse');
        if (pdf.default) pdf = pdf.default;

        if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdf.PDFParse(uint8Array);

            if (parser.load) {
                await parser.load();
            }

            const doc = parser.doc;
            if (!doc) {
                throw new Error('Failed to load PDF document');
            }

            const numPages = doc.numPages;
            console.log(`PDF loaded. Total pages: ${numPages}`);

            const pages: string[] = [];

            // Determine which pages to process
            let targetPages: number[] = [];
            if (pagesToExtract && pagesToExtract.length > 0) {
                targetPages = pagesToExtract.filter(p => p >= 1 && p <= numPages);
            } else {
                // Default to all pages
                for (let i = 1; i <= numPages; i++) targetPages.push(i);
            }

            for (const pageNum of targetPages) {
                const page = await doc.getPage(pageNum);
                const textContent = await page.getTextContent();

                let text = '';
                let lastY = -1;
                let currentLineItems: any[] = [];

                // Check for Hebrew content to determine sorting direction
                const hasHebrew = textContent.items.some((item: any) => /[\u0590-\u05FF]/.test(item.str));
                const isRTL = hasHebrew;

                if (pageNum === 285) {
                    console.log(`Page ${pageNum} isRTL: ${isRTL}`);
                }

                for (let item of textContent.items) {
                    const currentY = item.transform[5]; // Y position

                    // If Y changed significantly (e.g. > 5 units), process buffer and start new line
                    if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                        // Sort items based on language direction
                        if (isRTL) {
                            // RTL: Sort Descending X (Right to Left)
                            currentLineItems.sort((a, b) => b.transform[4] - a.transform[4]);
                        } else {
                            // LTR: Sort Ascending X (Left to Right)
                            currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);
                        }

                        let lineStr = '';
                        let lastX = -1;

                        for (let lineItem of currentLineItems) {
                            // Add spacing?
                            // For RTL, we are moving Right to Left.
                            // lastX was the previous item's X.
                            // current item's X should be smaller.
                            // Gap = lastX - (currentX + width) ? 
                            // This is getting complicated for spacing.
                            // Let's stick to simple space joining for now, it worked for LTR.

                            lineStr += (lineItem as any).str + ' ';
                        }

                        text += lineStr.trim() + '\n';
                        currentLineItems = [];
                    }

                    currentLineItems.push(item);
                    lastY = currentY;
                }

                // Process last line
                if (currentLineItems.length > 0) {
                    if (isRTL) {
                        currentLineItems.sort((a, b) => b.transform[4] - a.transform[4]);
                    } else {
                        currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);
                    }
                    let lineStr = '';
                    for (let lineItem of currentLineItems) {
                        lineStr += (lineItem as any).str + ' ';
                    }
                    text += lineStr.trim();
                }

                // Apply Hebrew word reversal for LLM compatibility
                const finalText = reverseHebrewWords(text);

                if (pageNum === 285) {
                    console.log('--- Before Hebrew reversal ---');
                    console.log(text.substring(0, 200));
                    console.log('--- After Hebrew reversal (sent to LLM) ---');
                    console.log(finalText.substring(0, 200));
                }

                pages.push(finalText);
            }
            return pages;
        }

        // Fallback for function API (unlikely to support pages easily without custom render)
        // We'll just return the whole text as one page if we can't split
        const fullText = await extractFromPdf(buffer);
        return [fullText];

    } catch (error) {
        throw new Error(`Failed to extract pages from PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function extractFromUrl(url: string): Promise<string> {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Ultimate Guitar specific extraction
        if (url.includes('ultimate-guitar.com')) {
            // Try to find the JSON store which contains the clean tab content
            const jsonStore = $('.js-store').attr('data-content');
            if (jsonStore) {
                try {
                    const data = JSON.parse(jsonStore);
                    if (data?.store?.page?.data?.tab_view?.wiki_tab?.content) {
                        let content = data.store.page.data.tab_view.wiki_tab.content;

                        // Extract metadata
                        const songName = data.store.page.data.tab?.song_name || '';
                        const artistName = data.store.page.data.tab?.artist_name || '';

                        // Clean up the content
                        content = content
                            .replace(/\[\/?(tab|ch)\]/gi, '')
                            .replace(/\\r\\n/g, '\n')
                            .replace(/\\n/g, '\n');

                        // Prepend metadata if found
                        if (songName || artistName) {
                            return `Title: ${songName}\nArtist: ${artistName}\n\n${content}`;
                        }

                        return content;
                    }
                } catch (e) {
                    console.warn('Failed to parse UG JSON store:', e);
                }
            }

            // Fallback: Look for the tab content container often found in <pre> or <code> tags
            // UG often wraps chords in <pre class="_3F2CP _3hukP"> or similar
            const preContent = $('pre').text();
            if (preContent && preContent.length > 100) {
                return preContent
                    .replace(/\[\/?(tab|ch)\]/gi, '')
                    .replace(/\r\n/g, '\n')
                    .trim();
            }
        }

        // Remove scripts, styles, and other non-content elements
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('iframe').remove();
        $('noscript').remove();

        // Try to find common main content areas
        const contentSelectors = ['main', 'article', '#content', '.content', '.main', '#main', '.js-tab-content'];
        let text = '';

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                text = element.text();
                break;
            }
        }

        // Fallback to body if no main content found
        if (!text) {
            text = $('body').text();
        }

        // Clean up the text
        let cleanedText = text
            // Replace literal \r\n or \n with actual newlines
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            // Remove UG specific tags (case insensitive)
            .replace(/\[\/?(tab|ch)\]/gi, '')
            // Replace multiple spaces/tabs with single space
            .replace(/[ \t]+/g, ' ')
            // Replace multiple newlines with max 2 newlines
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        return cleanedText;
    } catch (error) {
        throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : String(error)}`);
    }
}
