const fs = require('fs');
const path = require('path');

async function testManualPaging() {
    try {
        const buffer = fs.readFileSync(path.join(__dirname, 'songs.pdf'));
        console.log('File read, size:', buffer.length);

        let pdf = require('pdf-parse');
        if (pdf.default) pdf = pdf.default;

        if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
            console.log('Using Class API');
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdf.PDFParse(uint8Array);

            // Wait for the document to be ready? 
            // The constructor might start loading, but we might need to wait.
            // Usually PDF.js loading is async. 
            // But pdf-parse constructor seems synchronous in my previous test?
            // No, previous test called `await parser.getText()`.
            // Maybe I need to call something to ensure `doc` is ready.
            // Let's try calling `getText` first to ensure load, or check if there is a `load` method.
            // inspect-pdf showed `load` in prototype.

            // await parser.load(); // Let's try this if it exists

            // Or just try accessing doc after a small delay or check if it's a promise?
            // inspect-pdf said instance is object, not promise.

            // Let's try to trigger loading.
            // If I call getText(), it surely loads.
            // But I want to avoid full text extraction if possible.

            // Let's try calling load()
            if (parser.load) {
                console.log('Calling load()...');
                await parser.load();
            }

            const doc = parser.doc;
            if (!doc) {
                console.log('Doc is null');
                return;
            }

            console.log('Num pages:', doc.numPages);

            // Get page 1
            const page = await doc.getPage(1);
            console.log('Got page 1');

            const textContent = await page.getTextContent();
            console.log('Got text content, items:', textContent.items.length);

            let text = '';
            for (let item of textContent.items) {
                text += item.str + ' ';
            }

            console.log('Page 1 text preview:', text.substring(0, 100));

        } else {
            console.log('Not using Class API, skipping test');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testManualPaging();
