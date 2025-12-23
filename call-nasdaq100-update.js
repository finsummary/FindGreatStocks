/**
 * Скрипт для обновления NASDAQ 100: добавление и удаление компаний
 * 
 * Компании для добавления: ALNY, FER, INSM, MPWR, STX, WDC
 * Компании для удаления: BIIB, CDW, GFS, LULU, ON, TTD
 */

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://findgreatstocks-production.up.railway.app';

async function removeCompanies() {
  console.log('🗑️ Removing companies from NASDAQ 100...\n');
  const symbolsToRemove = ['BIIB', 'CDW', 'GFS', 'LULU', 'ON', 'TTD'];
  
  try {
    const response = await fetch(`${RAILWAY_URL}/api/nasdaq100/remove-companies-auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbolsToRemove,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Removal completed:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Error: ${response.status}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function addCompanies() {
  console.log('\n🚀 Adding companies to NASDAQ 100...\n');
  const symbolsToAdd = ['ALNY', 'FER', 'INSM', 'MPWR', 'STX', 'WDC'];
  
  // Компании будут автоматически добавлены скриптом populate-new-nasdaq100-companies.ts
  // Просто запускаем заполнение данных
  try {
    console.log('📊 Populating financial data for new companies...');
    const populateResponse = await fetch(`${RAILWAY_URL}/api/nasdaq100/populate-new-companies-auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (populateResponse.ok) {
      const populateData = await populateResponse.json();
      console.log('✅ Data population started:', JSON.stringify(populateData, null, 2));
      console.log('💡 Check Railway logs for progress...');
    } else {
      console.error(`❌ Error: ${populateResponse.status}`);
      const errorText = await populateResponse.text();
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  // Сначала удаляем старые компании
  await removeCompanies();
  
  // Ждем немного перед добавлением новых
  console.log('\n⏳ Waiting 5 seconds before adding new companies...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Затем добавляем новые компании
  await addCompanies();
}

main();

