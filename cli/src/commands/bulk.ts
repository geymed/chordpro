import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
const archiver = require('archiver');
import ApiClient from '../lib/api-client';
import { readChordSheetFilesFromDirectory } from '../lib/file-handler';

export function bulkCommand(): Command {
  const createZipCommand = new Command('create-zip')
    .alias('zip')
    .description('Create a ZIP file from a directory of chord sheet files')
    .argument('<input-dir>', 'Input directory containing JSON files')
    .option('-o, --output <path>', 'Output ZIP file path', 'songs.zip')
    .action(async (inputDir: string, options) => {
      try {
        if (!fs.existsSync(inputDir)) {
          console.error(`❌ Error: Directory not found: ${inputDir}`);
          process.exit(1);
        }

        console.log(`📦 Creating ZIP from: ${inputDir}...`);

        const output = fs.createWriteStream(options.output);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`✅ Created ${options.output} (${archive.pointer()} bytes)`);
        });

        archive.on('error', (err: any) => {
          throw err;
        });

        archive.pipe(output);

        const files = fs.readdirSync(inputDir);
        let fileCount = 0;

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(inputDir, file);
            archive.file(filePath, { name: file });
            fileCount++;
          }
        }

        await archive.finalize();
        console.log(`✅ Created ZIP: ${options.output}`);
        console.log(`   Files included: ${fileCount}`);
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  const uploadZipCommand = new Command('upload-zip')
    .description('Upload a ZIP file containing multiple chord sheet files')
    .argument('<zip-file>', 'Path to ZIP file')
    .option('-a, --api-url <url>', 'API base URL', 'http://localhost:3000')
    .action(async (zipFile: string, options) => {
      try {
        if (!fs.existsSync(zipFile)) {
          console.error(`❌ Error: ZIP file not found: ${zipFile}`);
          process.exit(1);
        }

        console.log(`📤 Uploading ZIP to: ${options.apiUrl}...`);

        const client = new ApiClient(options.apiUrl);

        // Check API health
        const isHealthy = await client.checkHealth();
        if (!isHealthy) {
          console.error(`❌ Cannot connect to API at ${options.apiUrl}`);
          console.error('   Make sure the server is running and the URL is correct');
          process.exit(1);
        }

        const result = await client.uploadBulk(zipFile);

        if (result.success) {
          console.log('✅ Bulk upload successful!');
          console.log(`   Uploaded: ${result.uploaded} files`);
          if (result.failed > 0) {
            console.log(`   Failed: ${result.failed} files`);
            console.log('\n   Errors:');
            for (const error of result.errors) {
              console.log(`     - ${error.file}: ${error.error}`);
            }
          }
        } else {
          console.error('❌ Bulk upload failed');
          if (result.errors.length > 0) {
            for (const error of result.errors) {
              console.error(`   ${error.file}: ${error.error}`);
            }
          }
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  const validateDirCommand = new Command('validate-dir')
    .description('Validate all chord sheet files in a directory')
    .argument('<dir>', 'Directory containing JSON files')
    .action(async (dir: string) => {
      try {
        if (!fs.existsSync(dir)) {
          console.error(`❌ Error: Directory not found: ${dir}`);
          process.exit(1);
        }

        console.log(`🔍 Validating files in: ${dir}...`);

        const sheets = readChordSheetFilesFromDirectory(dir);

        console.log(`✅ Validated ${sheets.length} files`);
        console.log('\n   Files:');
        for (const sheet of sheets) {
          console.log(`     - ${sheet.title} by ${sheet.artist}`);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return new Command('bulk')
    .description('Bulk operations for chord sheets')
    .addCommand(createZipCommand)
    .addCommand(uploadZipCommand)
    .addCommand(validateDirCommand);
}

