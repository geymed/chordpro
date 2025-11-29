import { Command } from 'commander';
import ApiClient from '../lib/api-client';
import { readChordSheetFile } from '../lib/file-handler';

export function uploadCommand(): Command {
  return new Command('upload')
    .description('Upload a chord sheet file to the online library')
    .option('-f, --file <path>', 'Path to chord sheet file')
    .option('-a, --api-url <url>', 'API base URL', 'http://localhost:3000')
    .action(async (options) => {
      try {
        if (!options.file) {
          console.error('❌ Error: Must provide --file option');
          process.exit(1);
        }

        console.log(`📤 Uploading to: ${options.apiUrl}...`);
        
        const client = new ApiClient(options.apiUrl);

        // Check API health
        const isHealthy = await client.checkHealth();
        if (!isHealthy) {
          console.error(`❌ Cannot connect to API at ${options.apiUrl}`);
          console.error('   Make sure the server is running and the URL is correct');
          process.exit(1);
        }

        console.log(`📄 Reading file: ${options.file}...`);
        const result = await client.uploadSheetFile(options.file);

        if (result.success) {
          console.log('✅ Upload successful!');
          console.log(`   Sheet ID: ${result.id}`);
        } else {
          console.error('❌ Upload failed:');
          console.error(`   ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

