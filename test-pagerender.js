const fs = require('fs');
const path = require('path');

async function testPageRender() {
    try {
        const buffer = fs.readFileSync(path.join(__dirname, 'songs.pdf'));
        console.log('File read, size:', buffer.length);

        let pdf = require('pdf-parse');
        if (pdf.default) pdf = pdf.default;

        // Custom render function to extract text per page
        function render_page(pageData) {
            // check documents https://mozilla.github.io/pdf.js/
            // ret.text = ret.text ? ret.text : "";

            let render_options = {
                //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
                normalizeWhitespace: false,
                //do not attempt to combine same line TextItem's. The default value is `false`.
                disableCombineTextItems: false
            }

            return pageData.getTextContent(render_options)
                .then(function (textContent) {
                    let lastY, text = '';
                    // console.log('Items:', textContent.items.length);
                    for (let item of textContent.items) {
                        if (lastY == item.transform[5] || !lastY) {
                            text += item.str;
                        }
                        else {
                            text += '\n' + item.str;
                        }
                        lastY = item.transform[5];
                    }
                    // Return text for this page with a special delimiter we can split on later, 
                    // or just return it. 
                    // pdf-parse concatenates these. 
                    // But we can maybe capture them in a side-effect array?
                    return text;
                });
        }

        let options = {
            pagerender: render_page
        }

        // Note: The class-based API (new PDFParse) might not support options the same way 
        // as the function API. Let's check if we can pass options to the constructor or getText.

        if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
            console.log('Using Class API with options?');
            const uint8Array = new Uint8Array(buffer);
            // Looking at previous debug, constructor takes (data, options)
            const parser = new pdf.PDFParse(uint8Array, options);

            // We need to see if we can intercept pages. 
            // If the library just joins them, we might need to use a side channel.

            // Let's try to monkey-patch or just use the side channel in render_page
            global.pageTexts = [];

            function capturing_render_page(pageData) {
                return pageData.getTextContent()
                    .then(function (textContent) {
                        let lastY, text = '';
                        for (let item of textContent.items) {
                            if (lastY == item.transform[5] || !lastY) {
                                text += item.str;
                            }
                            else {
                                text += '\n' + item.str;
                            }
                            lastY = item.transform[5];
                        }
                        global.pageTexts.push(text);
                        return text;
                    });
            }

            const parserWithCapture = new pdf.PDFParse(uint8Array, { pagerender: capturing_render_page });
            await parserWithCapture.getText();

            console.log('Captured pages:', global.pageTexts.length);
            if (global.pageTexts.length > 0) {
                console.log('Page 1 preview:', global.pageTexts[0].substring(0, 100));
            }

        } else {
            console.log('Using Function API');
            global.pageTexts = [];
            function capturing_render_page(pageData) {
                return pageData.getTextContent()
                    .then(function (textContent) {
                        let lastY, text = '';
                        for (let item of textContent.items) {
                            if (lastY == item.transform[5] || !lastY) {
                                text += item.str;
                            }
                            else {
                                text += '\n' + item.str;
                            }
                            lastY = item.transform[5];
                        }
                        global.pageTexts.push(text);
                        return text;
                    });
            }

            await pdf(buffer, { pagerender: capturing_render_page });
            console.log('Captured pages:', global.pageTexts.length);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testPageRender();
