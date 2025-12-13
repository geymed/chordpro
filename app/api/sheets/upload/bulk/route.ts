import { NextRequest, NextResponse } from 'next/server';
import { createSheet } from '@/lib/db';
import AdmZip from 'adm-zip';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('zip') as File;
    
    if (!zipFile) {
      return NextResponse.json({ error: 'No ZIP file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    const results: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    
    for (const entry of entries) {
      if (entry.entryName.endsWith('.json')) {
        try {
          const content = entry.getData().toString('utf8');
          const file = JSON.parse(content);
          
          // Validate file structure
          if (file.version !== '1.0') {
            errors.push({ 
              file: entry.entryName, 
              error: `Unsupported file version: ${file.version}` 
            });
            continue;
          }
          
          if (!file.sheet) {
            errors.push({ 
              file: entry.entryName, 
              error: 'Invalid file structure: missing "sheet" property' 
            });
            continue;
          }
          
          // Create sheet in database
          await createSheet(file.sheet);
          results.push(entry.entryName);
        } catch (error) {
          errors.push({ 
            file: entry.entryName, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}


