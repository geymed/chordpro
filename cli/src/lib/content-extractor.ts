import * as fs from 'fs';
const pdf = require('pdf-parse');
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function extractFromPdf(path: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(path);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function extractFromUrl(url: string): Promise<string> {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Remove scripts, styles, and other non-content elements
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();

        // Try to find common main content areas
        const contentSelectors = ['main', 'article', '#content', '.content', '.main', '#main'];
        let text = '';

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                text = element.text();
                break;
            }
        }

        // Fallback to body if no main content found
        if (!text) {
            text = $('body').text();
        }

        // Clean up whitespace
        return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function extractFromTextFile(path: string): Promise<string> {
    try {
        return fs.readFileSync(path, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : String(error)}`);
    }
}
