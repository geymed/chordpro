const { fromBuffer } = require('pdf2pic');

/**
 * Renders a PDF page to a PNG image and returns base64
 * Uses pdf2pic which wraps GraphicsMagick/ImageMagick
 */
async function renderPdfPageToImage(pdfBuffer: Buffer, pageNumber: number): Promise<string> {
    try {
        // Configure pdf2pic
        const options = {
            density: 150,           // DPI for image quality
            saveFilename: "temp",   // Temporary filename
            savePath: "/tmp",       // Temporary directory
            format: "png",          // Output format
            width: 2000,            // Max width
            height: 2800,           // Max height
            preserveAspectRatio: true,
        };

        const converter = fromBuffer(pdfBuffer, options);

        // Convert the specific page
        const pageToConvert = pageNumber;
        const result = await converter(pageToConvert, { responseType: "base64" });

        if (!result || !result.base64) {
            throw new Error('Failed to convert PDF page to image');
        }

        return result.base64;
    } catch (error) {
        throw new Error(`Failed to render PDF page: ${error instanceof Error ? error.message : String(error)}`);
    }
}

module.exports = { renderPdfPageToImage };
