const fs = require('fs');
const path = require('path');

async function testExtraction() {
    try {
        const buffer = fs.readFileSync(path.join(__dirname, 'songs.pdf'));
        console.log('File read, size:', buffer.length);

        // Lazy load pdf-parse
        let pdf = require('pdf-parse');

        // Handle default export if present
        if (pdf.default) {
            pdf = pdf.default;
        }

        let text = '';

        // Check for class-based API (v2.x style)
        if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
            console.log('Using PDFParse class API');
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdf.PDFParse(uint8Array);
            const result = await parser.getText();
            console.log('getText returned type:', typeof result);
            console.log('getText returned value:', result);
            text = result ? result.toString() : '';

            // Let's try the standard way for this version
            console.log('Total pages:', parser.doc ? parser.doc.numPages : 'unknown');

            // Try getting specific page if possible
            // The prototype showed getPageText
            try {
                const page1 = await parser.getPageText(1);
                console.log('Page 1 text length:', page1.length);
                console.log('Page 1 preview:', page1.substring(0, 50));
            } catch (e) {
                console.log('getPageText failed:', e.message);
            }
        } else if (typeof pdf === 'function') {
            console.log('Using pdf-parse function API');
            const data = await pdf(buffer);
            text = data.text;
        } else {
            throw new Error('Unknown API');
        }

        console.log('Extraction successful!');
        console.log('Text length:', text.length);
        console.log('Preview:', text.substring(0, 200));
    } catch (error) {
        console.error('Extraction failed:', error);
    }
}

testExtraction();
