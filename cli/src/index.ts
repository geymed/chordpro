#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze';
import { validateCommand } from './commands/validate';
import { uploadCommand } from './commands/upload';
import { bulkCommand } from './commands/bulk';

const program = new Command();

program
  .name('chordpro')
  .description('CLI tool for analyzing and managing chord sheets')
  .version('1.0.0');

program
  .addCommand(analyzeCommand())
  .addCommand(validateCommand())
  .addCommand(uploadCommand())
  .addCommand(bulkCommand());

program.parse();


