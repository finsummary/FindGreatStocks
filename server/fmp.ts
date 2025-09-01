import 'dotenv/config';

const FMP_BASE_URL = "https://financialmodelingprep.com";

export async function makeRequest(endpoint: string, retries = 3, initialDelay = 5000): Promise<any> {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
        throw new Error('FMP_API_KEY environment variable is not set');
    }

    const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    const delay = initialDelay * Math.pow(2, i);
                    console.warn(`[WARN] Rate limit hit or server error for ${endpoint}. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                const errorText = await response.text();
                if (response.status === 404) {
                     console.error(`[ERROR] FMP API error: 404 Not Found for URL: ${url}`);
                     return [];
                }
                throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText} for URL: ${url}`);
            }
            return response.json();
        } catch (error) {
            console.error(`[ATTEMPT ${i+1}/${retries}] Request failed for ${endpoint}:`, error);
            if (i < retries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                return null;
            }
        }
    }
}
