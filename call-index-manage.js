/**
 * Скрипт для управления индексами через API
 * 
 * Использование:
 * node call-index-manage.js add nasdaq100 AAPL,MSFT,GOOGL
 * node call-index-manage.js remove nasdaq100 OLD1,OLD2
 */

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://findgreatstocks-production.up.railway.app';
const ENDPOINT = `${RAILWAY_URL}/api/index/manage`;

const [action, index, symbolsStr] = process.argv.slice(2);

if (!action || !['add', 'remove'].includes(action)) {
  console.error('Usage: node call-index-manage.js <add|remove> <index> <symbol1,symbol2,...>');
  console.error('Example: node call-index-manage.js add nasdaq100 AAPL,MSFT,GOOGL');
  process.exit(1);
}

if (!index) {
  console.error('Error: Index is required');
  console.error('Available indices: sp500, nasdaq100, dowjones, ftse100');
  process.exit(1);
}

if (!symbolsStr) {
  console.error('Error: Symbols are required (comma-separated)');
  process.exit(1);
}

const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase());

async function manageIndex() {
  console.log(`🚀 ${action === 'add' ? 'Adding' : 'Removing'} companies ${action === 'add' ? 'to' : 'from'} ${index}...`);
  console.log(`📡 Symbols: ${symbols.join(', ')}\n`);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, index, symbols }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!', JSON.stringify(data, null, 2));
      console.log('💡 Check Railway logs for progress...');
    } else {
      console.error(`❌ Error: ${response.status}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manageIndex();

