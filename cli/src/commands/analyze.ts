import { Command } from 'commander';
import { ollamaClient } from '../lib/ollama-client';
import { writeChordSheetFile } from '../lib/file-handler';
import { extractFromPdf, extractFromUrl, extractFromTextFile } from '../lib/content-extractor';
import * as fs from 'fs';

export function analyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze a chord sheet from URL, image, or text file')
    .option('-u, --url <url>', 'URL to analyze')
    .option('-i, --image <path>', 'Image file path')
    .option('-t, --text <path>', 'Text file path')
    .option('-p, --pdf <path>', 'PDF file path')
    .option('-o, --output <path>', 'Output file path (or directory for multiple songs)', 'song.json')
    .option('-m, --model <model>', 'Ollama model', 'llama3.1:8b')
    .action(async (options) => {
      try {
        // Check if Ollama is available
        console.log('Checking Ollama connection...');
        const isHealthy = await ollamaClient.checkHealth();
        if (!isHealthy) {
          console.error('❌ Cannot connect to Ollama. Make sure Ollama is running.');
          console.error('   Start Ollama: ollama serve');
          console.error('   Or install: https://ollama.ai');
          process.exit(1);
        }

        // Validate input options
        if (!options.url && !options.image && !options.text && !options.pdf) {
          console.error('❌ Error: Must provide either --url, --image, --text, or --pdf');
          process.exit(1);
        }

        let inputText: string = '';
        let source = '';

        if (options.text) {
          if (!fs.existsSync(options.text)) {
            console.error(`❌ Error: Text file not found: ${options.text}`);
            process.exit(1);
          }
          inputText = await extractFromTextFile(options.text);
          source = 'text-file';
        } else if (options.pdf) {
          if (!fs.existsSync(options.pdf)) {
            console.error(`❌ Error: PDF file not found: ${options.pdf}`);
            process.exit(1);
          }
          console.log(`📄 Extracting text from PDF: ${options.pdf}...`);
          inputText = await extractFromPdf(options.pdf);
          source = 'pdf';
        } else if (options.url) {
          console.log(`🌐 Extracting text from URL: ${options.url}...`);
          inputText = await extractFromUrl(options.url);
          source = 'url';
        } else if (options.image) {
          // TODO: Implement image OCR or use vision model
          console.error('❌ Image analysis not yet fully implemented (requires OCR)');
          process.exit(1);
        }

        console.log(`📝 Analyzing extracted text with model: ${options.model}...`);

        const sheets = await ollamaClient.analyzeChordSheet(
          {
            text: inputText,
            source,
          },
          options.model
        );

        console.log(`✅ Analysis complete! Found ${sheets.length} song(s).`);

        if (sheets.length === 1) {
          const sheet = sheets[0];
          console.log(`   Title: ${sheet.title}`);
          console.log(`   Artist: ${sheet.artist}`);

          // Determine metadata
          const metadata: { source?: string; sourceUrl?: string } = { source };
          if (options.url) metadata.sourceUrl = options.url;

          writeChordSheetFile(options.output, sheet, metadata);
          console.log(`💾 Saved to: ${options.output}`);
        } else {
          // Handle multiple songs
          const outputDir = options.output.endsWith('.json') ? options.output.replace('.json', '') : options.output;

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          sheets.forEach((sheet, index) => {
            const safeTitle = sheet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${outputDir}/${safeTitle || `song_${index + 1}`}.json`;

            const metadata: { source?: string; sourceUrl?: string } = { source };
            if (options.url) metadata.sourceUrl = options.url;

            writeChordSheetFile(filename, sheet, metadata);
            console.log(`   💾 Saved: ${filename}`);
          });
          console.log(`✅ Saved all ${sheets.length} songs to directory: ${outputDir}`);
        }

      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

