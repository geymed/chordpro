const fs = require('fs');
const path = require('path');

async function findPage() {
    try {
        const buffer = fs.readFileSync(path.join(__dirname, 'songs.pdf'));
        let pdf = require('pdf-parse');
        if (pdf.default) pdf = pdf.default;

        // We need to use the class API to iterate pages
        if (pdf.PDFParse) {
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdf.PDFParse(uint8Array);
            if (parser.load) await parser.load();
            const doc = parser.doc;

            const numPages = doc.numPages;
            console.log(`Searching ${numPages} pages...`);

            // User said page 285
            const targetPage = 285;

            console.log(`Inspecting page ${targetPage}...`);
            const page = await doc.getPage(targetPage);
            const textContent = await page.getTextContent();

            console.log('--- Sorted Extraction Preview ---');
            let sortedText = '';
            let currentLineItems = [];
            let lastY = -1;

            for (let item of textContent.items) {
                const currentY = item.transform[5];

                if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                    // End of line, process buffer
                    // Sort by X ascending (Left to Right)
                    currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);

                    // Join with spaces
                    // We could try to preserve spacing based on X differences too
                    let lineStr = '';
                    let lastX = -1;
                    for (let lineItem of currentLineItems) {
                        if (lastX !== -1 && (lineItem.transform[4] - lastX) > 10) {
                            lineStr += ' '; // Add extra space for gaps
                        }
                        lineStr += lineItem.str + ' ';
                        lastX = lineItem.transform[4] + (lineItem.width || 0); // width might not be available in simple item
                    }

                    sortedText += lineStr.trim() + '\n';
                    currentLineItems = [];
                }

                currentLineItems.push(item);
                lastY = currentY;
            }

            // Process last line
            if (currentLineItems.length > 0) {
                currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);
                let lineStr = '';
                for (let lineItem of currentLineItems) {
                    lineStr += lineItem.str + ' ';
                }
                sortedText += lineStr.trim();
            }

            console.log(sortedText);

        }
    } catch (e) {
        console.error(e);
    }
}

findPage();
