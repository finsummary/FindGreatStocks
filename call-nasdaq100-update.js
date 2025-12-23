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
    const response = await fetch(`${RAILWAY_URL}/api/index/manage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove',
        index: 'nasdaq100',
        symbols: symbolsToRemove,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Removal started:', JSON.stringify(data, null, 2));
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
  
  // Сначала добавляем компании в таблицу через универсальный endpoint
  try {
    console.log('📝 Step 1: Inserting companies into nasdaq100_companies table...');
    const insertResponse = await fetch(`${RAILWAY_URL}/api/index/manage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        index: 'nasdaq100',
        symbols: symbolsToAdd,
      }),
    });

    if (insertResponse.ok) {
      const insertData = await insertResponse.json();
      console.log('✅ Companies inserted:', JSON.stringify(insertData, null, 2));
    } else {
      console.error(`⚠️ Insert warning: ${insertResponse.status}`);
      const errorText = await insertResponse.text();
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('⚠️ Insert error (may already exist):', error.message);
  }

  // Затем запускаем заполнение данных
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    console.log('\n📊 Step 2: Populating financial data for new companies...');
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

