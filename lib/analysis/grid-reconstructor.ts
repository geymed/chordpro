import { createWorker } from 'tesseract.js';

interface CharObj {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    confidence: number;
}

/**
 * Reconstructs the visual grid of a chord sheet image by preserving whitespace
 * Uses Tesseract.js for local OCR
 * Respects Tesseract's Block structure to handle multi-column layouts
 */
export async function reconstructChordSheet(imageBuffer: Buffer): Promise<string> {
    const worker = await createWorker('heb+eng');

    try {
        const ret = await worker.recognize(imageBuffer);
        const { data } = ret;

        console.log(`Tesseract found ${data.blocks?.length || 0} blocks`);

        let fullText = '';

        // Process each block independently to preserve column layout
        if (data.blocks) {
            for (const block of data.blocks) {
                const blockChars: CharObj[] = [];

                // Flatten block content to characters
                block.paragraphs?.forEach(paragraph => {
                    paragraph.lines?.forEach(line => {
                        line.words?.forEach(word => {
                            word.symbols?.forEach(symbol => {
                                const { bbox, text, confidence } = symbol;
                                if (confidence > 30) {
                                    blockChars.push({
                                        text,
                                        x: bbox.x0,
                                        y: bbox.y0,
                                        w: bbox.x1 - bbox.x0,
                                        h: bbox.y1 - bbox.y0,
                                        confidence
                                    });
                                }
                            });
                        });
                    });
                });

                if (blockChars.length === 0) continue;

                // Reconstruct grid for this block
                const blockText = reconstructBlockGrid(blockChars);
                fullText += blockText + '\n\n'; // Separate blocks with double newline
            }
        }

        return fullText;
    } finally {
        await worker.terminate();
    }
}

function reconstructBlockGrid(chars: CharObj[]): string {
    // 1. Cluster into Lines (Y-Axis)
    // Sort by Y, then group if they overlap vertically
    chars.sort((a, b) => a.y - b.y);

    const lines: CharObj[][] = [];
    let currentLine: CharObj[] = [];
    let currentLineY = -1;
    let currentLineHeight = 0;

    chars.forEach(char => {
        const centerY = char.y + char.h / 2;

        if (currentLine.length === 0) {
            currentLine.push(char);
            currentLineY = centerY;
            currentLineHeight = char.h;
        } else {
            // If within 60% of height of the current line's average height
            if (Math.abs(centerY - currentLineY) < (currentLineHeight * 0.6)) {
                currentLine.push(char);
                // Update average Y and Height
                currentLineY = (currentLineY * currentLine.length + centerY) / (currentLine.length + 1);
                currentLineHeight = (currentLineHeight * currentLine.length + char.h) / (currentLine.length + 1);
            } else {
                lines.push(currentLine);
                currentLine = [char];
                currentLineY = centerY;
                currentLineHeight = char.h;
            }
        }
    });
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    // 2. Process each line to re-insert spaces
    const recoveredLines = lines.map(line => {
        // Sort X-axis (LTR) - Visual order
        line.sort((a, b) => a.x - b.x);

        if (line.length === 0) return '';

        // Estimate character width for this line (median width)
        const sortedWidths = [...line].sort((a, b) => a.w - b.w);
        const medianWidth = sortedWidths[Math.floor(sortedWidths.length / 2)].w;

        // Heuristic: A "space" is roughly the width of a character
        const SPACE_THRESHOLD = medianWidth * 0.6;

        let lineStr = line[0].text;

        for (let i = 0; i < line.length - 1; i++) {
            const curr = line[i];
            const next = line[i + 1];

            const gap = next.x - (curr.x + curr.w);

            if (gap > SPACE_THRESHOLD) {
                // Calculate how many spaces fit in this gap
                const spacesToAdd = Math.floor(gap / (medianWidth * 0.8));
                lineStr += ' '.repeat(Math.max(1, spacesToAdd));
            }
            lineStr += next.text;
        }
        return lineStr;
    });

    return recoveredLines.join('\n');
}
