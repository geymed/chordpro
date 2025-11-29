const pdf = require('pdf-parse');
console.log('PDFParse type:', typeof pdf.PDFParse);

try {
    // Create a dummy buffer
    const buffer = Buffer.from('dummy');
    const uint8Array = new Uint8Array(buffer);
    // Try calling it with new
    const instance = new pdf.PDFParse(uint8Array);
    console.log('Instance type:', typeof instance);
    console.log('Instance keys:', Object.keys(instance));
    // console.log('Instance:', instance);

    if (instance instanceof Promise) {
        console.log('Instance IS a Promise!');
        instance.catch(e => console.log('Promise error:', e.message));
    } else {
        console.log('Instance is NOT a Promise.');
        // Try calling getText
        try {
            // Maybe we need to load it?
            // await instance.load(); 
            // But let's try getText directly first or see if it returns a promise
            const textPromise = instance.getText();
            console.log('getText result type:', typeof textPromise);
            if (textPromise instanceof Promise) {
                textPromise.then(t => console.log('Text result:', t))
                    .catch(e => console.log('getText error:', e.message));
            }
        } catch (e) {
            console.log('getText sync error:', e.message);
        }
    }
} catch (e) {
    console.log('Error:', e);
}
