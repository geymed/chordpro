import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChordSheet } from '@/types';
import { parseGridTextToChordSheet } from '@/lib/analysis/chord-parser';

export async function scrapeUltimateGuitar(url: string): Promise<ChordSheet> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });
        const $ = cheerio.load(response.data);

        // UG stores data in a script tag with window.UGAPP.store.page.data
        // Try multiple patterns to find the data
        let scriptContent: string | null = null;
        let data: any = null;

        // Method 1: Look for window.UGAPP.store.page.data
        $('body').find('script').each((i, el) => {
            const html = $(el).html() || '';
            if (html.includes('window.UGAPP') || html.includes('UGAPP.store')) {
                scriptContent = html;
                return false; // Break
            }
        });

        if (scriptContent) {
            // Try multiple regex patterns
            const patterns = [
                /window\.UGAPP\.store\.page\.data\s*=\s*({[\s\S]+?});/,
                /window\.UGAPP\.store\.page\.data\s*=\s*({.+});/,
                /UGAPP\.store\.page\.data\s*=\s*({[\s\S]+?});/,
            ];

            const scriptText: string = scriptContent;
            for (const pattern of patterns) {
                const jsonMatch = scriptText.match(pattern);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        data = JSON.parse(jsonMatch[1]);
                        if (data.tab_view?.wiki_tab?.content || data.tab) {
                            break; // Found valid data
                        }
                    } catch (e) {
                        // Try next pattern
                        continue;
                    }
                }
            }
        }

        // Method 2: Try to find data in data-content attribute (newer Ultimate Guitar format)
        if (!data) {
            $('[data-content]').each((i, el) => {
                try {
                    const dataContent = $(el).attr('data-content');
                    if (dataContent) {
                        const parsed = JSON.parse(dataContent);
                        if (parsed.store?.page?.data) {
                            data = parsed.store.page.data;
                            return false; // Found it!
                        }
                    }
                } catch (e) {
                    // Continue
                }
            });
        }

        // Method 2b: Try to find data in JSON-LD or other script tags
        if (!data) {
            $('body').find('script[type="application/json"]').each((i, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    if (json.tab_view || json.tab) {
                        data = json;
                        return false;
                    }
                } catch (e) {
                    // Continue
                }
            });
        }

        let content: string | null = null;
        let meta: any = {};

        // Debug: Log what we found
        if (data) {
            console.log('[UG Scraper] Found data:', {
                hasTabView: !!data.tab_view,
                hasWikiTab: !!data.tab_view?.wiki_tab,
                hasContent: !!data.tab_view?.wiki_tab?.content,
                contentLength: data.tab_view?.wiki_tab?.content?.length || 0,
            });
        }

        // Method 3: Extract from rendered HTML structure (fallback for dynamically loaded content)
        const hasValidContent = data?.tab_view?.wiki_tab?.content && typeof data.tab_view.wiki_tab.content === 'string' && data.tab_view.wiki_tab.content.length > 0;
        
        if (!data || !hasValidContent) {
            console.log('[UG Scraper] Using Method 3 (HTML extraction), hasValidContent:', hasValidContent);
            // Try to find the main content area
            // Ultimate Guitar typically uses classes like 'js-store', 'js-content', or specific content containers
            const contentSelectors = [
                '[class*="js-store"]',
                '[class*="js-content"]',
                '[class*="tab-content"]',
                '[class*="wiki-tab"]',
                'pre[class*="js-tab-content"]',
                'div[class*="tab-view"]',
            ];

            let contentElement: cheerio.Cheerio | null = null;
            for (const selector of contentSelectors) {
                const found = $(selector).first();
                if (found.length > 0 && found.text().trim().length > 50) {
                    contentElement = found;
                    break;
                }
            }

            // If not found, try to extract from the main content area
            if (!contentElement) {
                // Look for pre tags or divs with substantial text content
                $('pre, div[class*="content"], div[class*="tab"]').each((i, el) => {
                    const text = $(el).text().trim();
                    // Check if it looks like chord sheet content (has brackets, chords, etc.)
                    if (text.length > 100 && (text.includes('[') || /[A-G][b#]?[m]?[0-9]?/.test(text))) {
                        contentElement = $(el);
                        return false;
                    }
                });
            }

            if (contentElement && contentElement.length > 0) {
                content = contentElement.text().trim();
                
                // Try to extract metadata from the page
                const titleMatch = $('h1, [class*="title"], [class*="song-name"]').first().text().trim();
                const artistMatch = $('[class*="artist"], [class*="author"]').first().text().trim();
                
                if (titleMatch) meta.song_name = titleMatch;
                if (artistMatch) meta.artist_name = artistMatch;
            }
        } else {
            console.log('[UG Scraper] Using data from script/data-content');
            // Use data from script tag or data-content attribute
            const tab = data.tab_view?.wiki_tab;
            meta = data.tab || {};
            
            if (tab?.content) {
                console.log('[UG Scraper] Found content in tab.content, length:', tab.content.length);
                // Clean content: remove [ch], [/ch], [tab], [/tab] tags
                content = tab.content
                    .replace(/\[\/?ch\]/g, '')
                    .replace(/\[\/?tab\]/g, '');
                console.log('[UG Scraper] Cleaned content length:', content?.length || 0);
            } else {
                console.log('[UG Scraper] No content in tab.content, trying fallbacks');
                // Fallback: try to get content from other possible locations in data
                if (data.tab_view?.content) {
                    content = data.tab_view.content
                        .replace(/\[\/?ch\]/g, '')
                        .replace(/\[\/?tab\]/g, '');
                } else if (data.content) {
                    content = data.content
                        .replace(/\[\/?ch\]/g, '')
                        .replace(/\[\/?tab\]/g, '');
                }
            }
        }

        if (!content) {
            // Add more detailed error message for debugging
            const debugInfo = {
                hasData: !!data,
                hasTabView: !!data?.tab_view,
                hasWikiTab: !!data?.tab_view?.wiki_tab,
                hasContent: !!data?.tab_view?.wiki_tab?.content,
                dataKeys: data ? Object.keys(data) : [],
            };
            console.error('Scraper debug info:', JSON.stringify(debugInfo, null, 2));
            throw new Error('Could not find song data on page. The page structure may have changed, or the content is loaded dynamically. Try copying and pasting the chord sheet text directly instead.');
        }

        // Parse using our existing parser
        const sheet = parseGridTextToChordSheet(content);

        // Enrich with metadata
        sheet.title = meta?.song_name || sheet.title || 'Untitled';
        sheet.artist = meta?.artist_name || sheet.artist || 'Unknown Artist';

        // Try to find key and capo from the page HTML
        if (data?.tab_view?.meta) {
            // meta might be an array or an object
            if (Array.isArray(data.tab_view.meta)) {
                const keyObj = data.tab_view.meta.find((m: any) => m.name === 'tonality');
                if (keyObj) sheet.key = keyObj.value;

                const capoObj = data.tab_view.meta.find((m: any) => m.name === 'capo');
                if (capoObj) sheet.capo = typeof capoObj.value === 'number' ? capoObj.value : parseInt(capoObj.value, 10);
            } else if (typeof data.tab_view.meta === 'object') {
                // If meta is an object, try to get values directly
                if (data.tab_view.meta.tonality) sheet.key = data.tab_view.meta.tonality;
                if (data.tab_view.meta.capo !== undefined) {
                    sheet.capo = typeof data.tab_view.meta.capo === 'number' 
                        ? data.tab_view.meta.capo 
                        : parseInt(String(data.tab_view.meta.capo), 10);
                }
            }
        }
        
        // Fallback: Try to extract from HTML if not found in data
        if (!sheet.capo) {
            const htmlString = typeof response.data === 'string' ? response.data : '';
            const capoMatch = htmlString.match(/Capo[:\s]+(\d+)/i);
            if (capoMatch) {
                sheet.capo = parseInt(capoMatch[1], 10);
            }
        }

        return sheet;

    } catch (error) {
        throw new Error(`Failed to scrape Ultimate Guitar: ${error instanceof Error ? error.message : String(error)}. Tip: You can copy the chord sheet text from the page and paste it directly using the "Paste Text" option.`);
    }
}
