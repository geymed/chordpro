import { Command } from 'commander';
import { readChordSheetFile, validateChordSheetFileFromPath } from '../lib/file-handler';

export function validateCommand(): Command {
  return new Command('validate')
    .description('Validate a chord sheet file')
    .argument('<file>', 'Path to chord sheet file')
    .option('-v, --verbose', 'Show detailed validation output')
    .action(async (file: string, options) => {
      try {
        if (options.verbose) {
          console.log(`🔍 Validating: ${file}...`);
        }

        const isValid = validateChordSheetFileFromPath(file);
        
        if (!isValid) {
          // Try to read to get the actual error
          try {
            readChordSheetFile(file);
          } catch (error) {
            console.error('❌ Validation failed:');
            console.error(`   ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        }

        const sheet = readChordSheetFile(file);
        
        console.log('✅ File is valid!');
        if (options.verbose) {
          console.log(`   Title: ${sheet.title}`);
          console.log(`   Artist: ${sheet.artist}`);
          console.log(`   Language: ${sheet.language}`);
          console.log(`   Sections: ${sheet.sections.length}`);
          console.log(`   Key: ${sheet.key || 'N/A'}`);
          console.log(`   Tempo: ${sheet.tempo || 'N/A'}`);
          console.log(`   Capo: ${sheet.capo || 'N/A'}`);
        }
      } catch (error) {
        console.error('❌ Validation failed:');
        console.error(`   ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}


