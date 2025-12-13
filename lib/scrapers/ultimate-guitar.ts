import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChordSheet } from '@/types';
import { parseGridTextToChordSheet } from '@/lib/analysis/chord-parser';

export async function scrapeUltimateGuitar(url: string): Promise<ChordSheet> {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // UG stores data in a script tag with window.UGAPP.store.page.data
        const scriptContent = $('body').find('script').filter((i, el) => {
            return $(el).html()?.includes('window.UGAPP.store.page.data') || false;
        }).html();

        if (!scriptContent) {
            throw new Error('Could not find song data on page');
        }

        // Extract JSON
        const jsonMatch = scriptContent.match(/window\.UGAPP\.store\.page\.data\s*=\s*({.+});/);
        if (!jsonMatch || !jsonMatch[1]) {
            throw new Error('Could not parse song data');
        }

        const data = JSON.parse(jsonMatch[1]);
        const tab = data.tab_view?.wiki_tab;
        const meta = data.tab;

        if (!tab || !tab.content) {
            throw new Error('No tab content found');
        }

        // Clean content: remove [ch], [/ch], [tab], [/tab] tags
        let content = tab.content
            .replace(/\[\/?ch\]/g, '')
            .replace(/\[\/?tab\]/g, '');

        // Parse using our existing parser
        const sheet = parseGridTextToChordSheet(content);

        // Enrich with metadata
        sheet.title = meta.song_name || sheet.title;
        sheet.artist = meta.artist_name || sheet.artist;

        // Try to find key and capo
        if (data.tab_view?.meta) {
            const keyObj = data.tab_view.meta.find((m: any) => m.name === 'tonality');
            if (keyObj) sheet.key = keyObj.value;

            const capoObj = data.tab_view.meta.find((m: any) => m.name === 'capo');
            if (capoObj) sheet.capo = capoObj.value;
        }

        return sheet;

    } catch (error) {
        throw new Error(`Failed to scrape Ultimate Guitar: ${error instanceof Error ? error.message : String(error)}`);
    }
}
