#!/usr/bin/env tsx

/**
 * Script to populate data for newly added S&P 500 companies
 * This script will fetch and populate all financial data, metrics, and calculations
 * 
 * Usage: Update SYMBOLS array with new company tickers, then run the script
 * 
 * Standardized process:
 * 1. Base metrics (price, market cap, etc.)
 * 2. Financial data (income statement, balance sheet, cash flow)
 * 3. Returns and drawdowns
 * 4. DuPont metrics (ROE, Asset Turnover, Financial Leverage)
 * 5. Calculated metrics (Price-to-Sales, Net Profit Margin)
 * 6. ROIC (current)
 * 7. FCF margin and history
 * 8. ROIC 10Y history and stability metrics
 * 9. Debt and cash flow metrics
 * 10. Current FCF margin
 * 11. DCF metrics (must be last, requires latest_fcf and revenue_growth_10y)
 */

import { db, supabase } from './db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import { FinancialDataService } from './financial-data';
import { updateDcfMetricsForCompany } from './dcf-daily-updater';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY environment variable is required');
  process.exit(1);
}

const SYMBOLS = ['CVNA', 'CRH', 'FIX']; // Note: CRH (not CHR) - CRH plc is the correct ticker

async function populateFinancialData(symbol: string) {
  console.log(`\n📊 Fetching financial data for ${symbol}...`);
  const financialDataService = new FinancialDataService();

  try {
    // Fetch cash flow and income statements
    const cashFlowData = await financialDataService.fetchCashFlowStatement(symbol, 1);
    const incomeStatementData = await financialDataService.fetchIncomeStatement(symbol, 12);
    
    // Fetch balance sheet
    let balanceSheetData = null;
    try {
      const balanceSheetResponse = await fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
      if (balanceSheetResponse.ok) {
        const data = await balanceSheetResponse.json();
        balanceSheetData = Array.isArray(data) ? data : null;
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch balance sheet for ${symbol}`);
    }

    if (!cashFlowData || cashFlowData.length === 0 || !incomeStatementData || incomeStatementData.length === 0) {
      console.log(`⚠️ No financial statements found for ${symbol}`);
      return false;
    }

    const latestFcf = cashFlowData[0]?.freeCashFlow || null;
    const revenue = incomeStatementData[0]?.revenue || null;
    const netIncome = incomeStatementData[0]?.netIncome || null;
    const grossProfit = incomeStatementData[0]?.grossProfit || null;
    const operatingIncome = incomeStatementData[0]?.operatingIncome || null;
    const totalAssets = balanceSheetData?.[0]?.totalAssets || null;
    const totalDebt = balanceSheetData?.[0]?.totalDebt || null;
    const cashAndEquivalents = balanceSheetData?.[0]?.cashAndCashEquivalents || null;
    const totalEquity = balanceSheetData?.[0]?.totalStockholdersEquity || balanceSheetData?.[0]?.totalEquity || null;

    // Calculate 10Y Revenue Growth
    let revenueGrowth10Y: number | null = null;
    if (incomeStatementData.length >= 11) {
      const latest = incomeStatementData[0]?.revenue;
      const tenYearsAgo = incomeStatementData[10]?.revenue;
      if (latest && tenYearsAgo && latest > 0 && tenYearsAgo > 0) {
        revenueGrowth10Y = (Math.pow(latest / tenYearsAgo, 1 / 10) - 1) * 100;
      }
    }

    // Update financial data
    const { error } = await supabase
      .from('sp500_companies')
      .update({
        latest_fcf: latestFcf ? latestFcf.toString() : null,
        revenue: revenue ? revenue.toString() : null,
        net_income: netIncome ? netIncome.toString() : null,
        gross_profit: grossProfit ? grossProfit.toString() : null,
        operating_income: operatingIncome ? operatingIncome.toString() : null,
        total_assets: totalAssets ? totalAssets.toString() : null,
        total_debt: totalDebt ? totalDebt.toString() : null,
        cash_and_equivalents: cashAndEquivalents ? cashAndEquivalents.toString() : null,
        total_equity: totalEquity ? totalEquity.toString() : null,
        revenue_growth_10y: revenueGrowth10Y ? revenueGrowth10Y.toFixed(2) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating financial data for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated financial data for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fetching financial data for ${symbol}:`, error);
    return false;
  }
}

async function populateBaseMetrics(symbol: string) {
  console.log(`\n📈 Fetching base metrics for ${symbol}...`);
  const financialDataService = new FinancialDataService();

  try {
    // Fetch profile data
    const profile = await financialDataService.fetchCompanyProfile(symbol);
    if (!profile) {
      console.log(`⚠️ No profile data found for ${symbol}`);
      return false;
    }

    // Fetch quote data
    let quoteData = null;
    try {
      const quoteResponse = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`);
      if (quoteResponse.ok) {
        const quoteArray = await quoteResponse.json();
        quoteData = Array.isArray(quoteArray) && quoteArray.length > 0 ? quoteArray[0] : null;
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch quote data for ${symbol}`);
    }

    // Fetch key metrics TTM
    let keyMetrics = null;
    try {
      const kmResponse = await fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${FMP_API_KEY}`);
      if (kmResponse.ok) {
        const kmArray = await kmResponse.json();
        keyMetrics = Array.isArray(kmArray) && kmArray.length > 0 ? kmArray[0] : null;
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch key metrics for ${symbol}`);
    }

    const price = quoteData?.price || profile.price || 0;
    const change = quoteData?.change || 0;
    const previousPrice = price - change;
    const dailyChangePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
    const marketCap = quoteData?.marketCap || profile.marketCap || 0;

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        price: price ? price.toFixed(2) : null,
        daily_change: change ? change.toFixed(2) : null,
        daily_change_percent: dailyChangePercent ? dailyChangePercent.toFixed(2) : null,
        market_cap: marketCap ? marketCap.toString() : null,
        pe_ratio: keyMetrics?.peRatioTTM ? keyMetrics.peRatioTTM.toString() : quoteData?.pe ? quoteData.pe.toString() : null,
        eps: quoteData?.eps ? quoteData.eps.toString() : null,
        volume: quoteData?.volume ? Math.round(quoteData.volume).toString() : null,
        avg_volume: quoteData?.avgVolume ? Math.round(quoteData.avgVolume).toString() : null,
        day_low: quoteData?.dayLow ? quoteData.dayLow.toString() : null,
        day_high: quoteData?.dayHigh ? quoteData.dayHigh.toString() : null,
        year_low: quoteData?.yearLow ? quoteData.yearLow.toString() : null,
        year_high: quoteData?.yearHigh ? quoteData.yearHigh.toString() : null,
        logo_url: profile.image && !profile.defaultImage ? profile.image : null,
        website: profile.website || null,
        description: profile.description || null,
        ceo: profile.ceo || null,
        employees: profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees, 10) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating base metrics for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated base metrics for ${symbol}`);
    
    // DCF metrics will be updated at the end after all financial data is populated
    return true;
  } catch (error) {
    console.error(`❌ Error fetching base metrics for ${symbol}:`, error);
    return false;
  }
}

async function populateReturnsAndDrawdowns(symbol: string) {
  console.log(`\n📊 Fetching historical prices for ${symbol}...`);
  
  try {
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 12);
    const toDate = new Date();
    
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.historical || !Array.isArray(data.historical)) {
      throw new Error('Invalid data format');
    }
    
    const prices = data.historical
      .map((item: any) => ({
        date: item.date,
        close: parseFloat(item.close)
      }))
      .filter((item: any) => !isNaN(item.close))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (prices.length < 100) {
      console.log(`⚠️ Insufficient historical data for ${symbol} (${prices.length} data points)`);
      return false;
    }

    // Calculate returns
    const calculateReturn = (years: number): number | null => {
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() - years);
      
      let startPrice = prices[0]?.close;
      for (const price of prices) {
        const priceDate = new Date(price.date);
        if (priceDate <= targetDate) {
          startPrice = price.close;
        } else {
          break;
        }
      }
      
      const endPrice = prices[prices.length - 1]?.close;
      if (!startPrice || !endPrice || startPrice <= 0 || endPrice <= 0) {
        return null;
      }
      
      return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
    };

    const return3Year = calculateReturn(3);
    const return5Year = calculateReturn(5);
    const return10Year = calculateReturn(10);

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = prices[0]?.close || 0;
    for (const price of prices) {
      if (price.close > peak) {
        peak = price.close;
      }
      const drawdown = ((peak - price.close) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate AR/MDD ratios
    const arMddRatio3Year = return3Year && maxDrawdown > 0 ? return3Year / maxDrawdown : null;
    const arMddRatio5Year = return5Year && maxDrawdown > 0 ? return5Year / maxDrawdown : null;
    const arMddRatio10Year = return10Year && maxDrawdown > 0 ? return10Year / maxDrawdown : null;

    // Update database
    const { error } = await supabase
      .from('sp500_companies')
      .update({
        return_3_year: return3Year ? return3Year.toFixed(2) : null,
        return_5_year: return5Year ? return5Year.toFixed(2) : null,
        return_10_year: return10Year ? return10Year.toFixed(2) : null,
        max_drawdown_10_year: maxDrawdown > 0 ? maxDrawdown.toFixed(2) : null,
        max_drawdown_5_year: maxDrawdown > 0 ? maxDrawdown.toFixed(2) : null,
        max_drawdown_3_year: maxDrawdown > 0 ? maxDrawdown.toFixed(2) : null,
        ar_mdd_ratio_3_year: arMddRatio3Year ? arMddRatio3Year.toFixed(4) : null,
        ar_mdd_ratio_5_year: arMddRatio5Year ? arMddRatio5Year.toFixed(4) : null,
        ar_mdd_ratio_10_year: arMddRatio10Year ? arMddRatio10Year.toFixed(4) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating returns/drawdowns for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated returns and drawdowns for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fetching historical prices for ${symbol}:`, error);
    return false;
  }
}

async function populateDuPontMetrics(symbol: string) {
  console.log(`\n📊 Calculating DuPont metrics for ${symbol}...`);
  
  try {
    const { data: company, error: fetchError } = await supabase
      .from('sp500_companies')
      .select('revenue, net_income, total_assets, total_equity')
      .eq('symbol', symbol)
      .single();

    if (fetchError || !company) {
      console.log(`⚠️ Could not fetch company data for ${symbol}`);
      return false;
    }

    const revenue = company.revenue ? parseFloat(company.revenue) : null;
    const netIncome = company.net_income ? parseFloat(company.net_income) : null;
    const totalAssets = company.total_assets ? parseFloat(company.total_assets) : null;
    const totalEquity = company.total_equity ? parseFloat(company.total_equity) : null;

    let assetTurnover = null;
    let financialLeverage = null;
    let roe = null;

    if (revenue && totalAssets && totalAssets > 0) {
      assetTurnover = revenue / totalAssets;
    }

    if (totalAssets && totalEquity && totalEquity > 0) {
      financialLeverage = totalAssets / totalEquity;
    }

    if (netIncome && totalEquity && totalEquity > 0) {
      roe = netIncome / totalEquity; // Store as decimal (0.15 for 15%), will be multiplied by 100 in UI
    }

    // Calculate DuPont ROE = Net Profit Margin × Asset Turnover × Financial Leverage
    let dupontRoe = null;
    if (netIncome && revenue && revenue > 0 && assetTurnover && financialLeverage) {
      const netProfitMargin = netIncome / revenue;
      dupontRoe = netProfitMargin * assetTurnover * financialLeverage;
    }

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        asset_turnover: assetTurnover ? assetTurnover.toFixed(4) : null,
        financial_leverage: financialLeverage ? financialLeverage.toFixed(4) : null,
        roe: roe ? roe.toFixed(4) : null,
        dupont_roe: dupontRoe ? dupontRoe.toFixed(4) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating DuPont metrics for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated DuPont metrics for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating DuPont metrics for ${symbol}:`, error);
    return false;
  }
}

async function populateCalculatedMetrics(symbol: string) {
  console.log(`\n📊 Calculating price-to-sales and profit margin for ${symbol}...`);
  
  try {
    const { data: company, error: fetchError } = await supabase
      .from('sp500_companies')
      .select('price, market_cap, revenue, net_income')
      .eq('symbol', symbol)
      .single();

    if (fetchError || !company) {
      console.log(`⚠️ Could not fetch company data for ${symbol}`);
      return false;
    }

    const marketCap = company.market_cap ? parseFloat(company.market_cap) : null;
    const revenue = company.revenue ? parseFloat(company.revenue) : null;
    const netIncome = company.net_income ? parseFloat(company.net_income) : null;

    let priceToSalesRatio = null;
    let netProfitMargin = null;

    if (marketCap && revenue && revenue > 0) {
      priceToSalesRatio = marketCap / revenue;
    }

    if (netIncome && revenue && revenue > 0) {
      netProfitMargin = (netIncome / revenue) * 100;
    }

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        price_to_sales_ratio: priceToSalesRatio ? priceToSalesRatio.toFixed(2) : null,
        net_profit_margin: netProfitMargin ? netProfitMargin.toFixed(2) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating calculated metrics for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated calculated metrics for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating metrics for ${symbol}:`, error);
    return false;
  }
}

async function populateROIC(symbol: string) {
  console.log(`\n📊 Calculating ROIC for ${symbol}...`);
  
  try {
    // Try to get ROIC directly from FMP API (most reliable)
    let roic = null;
    
    try {
      // Try annual key-metrics first
      const kmResponse = await fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?period=annual&limit=1&apikey=${FMP_API_KEY}`);
      if (kmResponse.ok) {
        const kmData = await kmResponse.json();
        if (Array.isArray(kmData) && kmData.length > 0 && kmData[0].roic !== undefined && kmData[0].roic !== null) {
          roic = Number(kmData[0].roic);
          // Normalize: if > 1.5, it's likely a percentage (15% = 15), convert to decimal
          if (isFinite(roic) && roic > 1.5) {
            roic = roic / 100;
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch key-metrics for ${symbol}, trying TTM...`);
    }

    // Fallback to TTM if annual not available
    if (!roic || !isFinite(roic)) {
      try {
        const ttmResponse = await fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${FMP_API_KEY}`);
        if (ttmResponse.ok) {
          const ttmData = await ttmResponse.json();
          if (Array.isArray(ttmData) && ttmData.length > 0 && ttmData[0].roicTTM !== undefined && ttmData[0].roicTTM !== null) {
            roic = Number(ttmData[0].roicTTM);
            // Normalize: if > 1.5, it's likely a percentage, convert to decimal
            if (isFinite(roic) && roic > 1.5) {
              roic = roic / 100;
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch key-metrics-ttm for ${symbol}, calculating manually...`);
      }
    }

    // Fallback: Calculate manually using NOPAT (if FMP API doesn't have ROIC)
    if (!roic || !isFinite(roic)) {
      const { data: company, error: fetchError } = await supabase
        .from('sp500_companies')
        .select('operating_income, net_income, income_before_tax, total_assets, cash_and_equivalents, total_debt')
        .eq('symbol', symbol)
        .single();

      if (!fetchError && company) {
        const operatingIncome = company.operating_income ? parseFloat(company.operating_income) : null;
        const netIncome = company.net_income ? parseFloat(company.net_income) : null;
        const incomeBeforeTax = company.income_before_tax ? parseFloat(company.income_before_tax) : null;
        const totalAssets = company.total_assets ? parseFloat(company.total_assets) : null;
        const cash = company.cash_and_equivalents ? parseFloat(company.cash_and_equivalents) : null;
        const debt = company.total_debt ? parseFloat(company.total_debt) : null;

        if (operatingIncome && totalAssets && totalAssets > 0) {
          // Calculate NOPAT (Net Operating Profit After Tax)
          let nopat = operatingIncome;
          if (incomeBeforeTax && incomeBeforeTax > 0 && netIncome) {
            // Estimate tax rate from income statement
            const taxRate = Math.max(0, Math.min(0.5, (incomeBeforeTax - netIncome) / incomeBeforeTax));
            nopat = operatingIncome * (1 - taxRate);
          } else {
            // Use standard tax rate if can't calculate
            nopat = operatingIncome * 0.79; // Assume 21% tax rate
          }

          const investedCapital = totalAssets - (cash || 0) + (debt || 0);
          if (investedCapital > 0) {
            roic = nopat / investedCapital; // Store as decimal (0.15 for 15%), will be multiplied by 100 in UI
            // Clamp to reasonable range
            if (roic > 2) roic = 2;
            if (roic < -2) roic = -2;
          }
        }
      }
    }

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        roic: roic !== null && isFinite(roic) ? roic.toFixed(4) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating ROIC for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated ROIC for ${symbol}: ${roic !== null && isFinite(roic) ? (roic * 100).toFixed(2) + '%' : 'N/A'}`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating ROIC for ${symbol}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting data population for new S&P 500 companies: CVNA, CHR, FIX\n');

  for (const symbol of SYMBOLS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${symbol}`);
    console.log('='.repeat(60));

    // 1. Populate base metrics (price, market cap, etc.)
    await populateBaseMetrics(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Populate financial data
    await populateFinancialData(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Populate returns and drawdowns
    await populateReturnsAndDrawdowns(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Populate DuPont metrics
    await populateDuPontMetrics(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Populate calculated metrics
    await populateCalculatedMetrics(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 6. Populate ROIC
    await populateROIC(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 7. Populate FCF margin and revenue/FCF history
    await populateFcfMarginAndHistory(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 8. Populate ROIC 10Y history and metrics
    await populateROIC10YHistory(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 9. Populate debt and cash flow metrics
    await populateDebtAndCashFlowMetrics(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 10. Populate FCF margin (current)
    await populateCurrentFcfMargin(symbol);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 11. Update DCF metrics (must be last, after all financial data is populated)
    const { data: companyData } = await supabase
      .from('sp500_companies')
      .select('market_cap')
      .eq('symbol', symbol)
      .single();
    
    if (companyData && companyData.market_cap) {
      const marketCap = parseFloat(companyData.market_cap);
      if (marketCap && marketCap > 0) {
        await updateDcfMetricsForCompany(schema.sp500Companies, symbol, marketCap);
        console.log(`✅ Updated DCF metrics for ${symbol}`);
      }
    }

    console.log(`\n✅ Completed processing ${symbol}`);
  }

  console.log('\n🎉 All companies processed successfully!');
}

async function populateFcfMarginAndHistory(symbol: string) {
  console.log(`\n📊 Calculating FCF margin and revenue/FCF history for ${symbol}...`);
  const financialDataService = new FinancialDataService();

  try {
    // Fetch 10 years of income statements and cash flow statements
    const incomeStatementData = await financialDataService.fetchIncomeStatement(symbol, 10);
    const cashFlowData = await financialDataService.fetchCashFlowStatement(symbol, 10);

    if (!incomeStatementData || incomeStatementData.length === 0 || !cashFlowData || cashFlowData.length === 0) {
      console.log(`⚠️ Insufficient data for FCF margin calculation for ${symbol}`);
      return false;
    }

    const revenueSeries: (number | null)[] = [];
    const fcfSeries: (number | null)[] = [];
    const margins: number[] = [];

    const toNum = (val: any): number | null => {
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    // Process up to 10 years of data
    for (let i = 0; i < 10; i++) {
      const inc = incomeStatementData[i] || {};
      const cf = cashFlowData[i] || {};
      
      const rev = toNum(inc.revenue ?? inc.totalRevenue ?? inc.revenueTTM ?? inc.sales ?? inc.salesRevenueNet);
      const fcf = toNum(cf.freeCashFlow ?? cf.freeCashFlowTTM ?? cf.freeCashFlowPerShare);
      
      revenueSeries.push(rev);
      fcfSeries.push(fcf);
      
      if (rev !== null && rev !== 0 && fcf !== null) {
        const margin = fcf / rev;
        // Clamp margin to reasonable range (-2 to 2)
        const clampedMargin = Math.max(-2, Math.min(2, margin));
        if (Number.isFinite(clampedMargin)) {
          margins.push(clampedMargin);
        }
      }
    }

    // Pad series to 10 years
    const padSeries = (arr: (number | null)[]): (number | null)[] => {
      const out = [...arr];
      while (out.length < 10) out.push(null);
      return out.slice(0, 10);
    };

    const revCols = padSeries(revenueSeries);
    const fcfCols = padSeries(fcfSeries);

    // Calculate median FCF margin
    const computeMedian = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    };

    const median = computeMedian(margins);

    // Build update object with revenue and FCF history
    const assignYears = (prefix: string, series: (number | null)[]) => {
      const obj: any = {};
      for (let i = 0; i < 10; i++) {
        obj[`${prefix}_y${i + 1}`] = series[i] ?? null;
      }
      return obj;
    };

    const updates = {
      ...assignYears('revenue', revCols),
      ...assignYears('fcf', fcfCols),
      fcf_margin_median_10y: median,
    };

    const { error } = await supabase
      .from('sp500_companies')
      .update(updates)
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating FCF margin and history for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated FCF margin and history for ${symbol} (median: ${median?.toFixed(4) || 'N/A'})`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating FCF margin and history for ${symbol}:`, error);
    return false;
  }
}

async function populateROIC10YHistory(symbol: string) {
  console.log(`\n📊 Calculating ROIC 10Y history for ${symbol}...`);
  const financialDataService = new FinancialDataService();

  try {
    // Fetch 10 years of income statements and balance sheets
    let incomeStatementData = null;
    try {
      incomeStatementData = await financialDataService.fetchIncomeStatement(symbol, 10);
    } catch (error) {
      console.log(`⚠️ Could not fetch income statement history for ${symbol}`);
    }
    
    // Fetch balance sheets
    let balanceSheetData = null;
    try {
      const balanceSheetResponse = await fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}?limit=10&apikey=${FMP_API_KEY}`);
      if (balanceSheetResponse.ok) {
        const data = await balanceSheetResponse.json();
        balanceSheetData = Array.isArray(data) ? data : null;
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch balance sheet history for ${symbol}`);
    }

    // If we have no data at all, try to use current year data
    if ((!incomeStatementData || incomeStatementData.length === 0) && (!balanceSheetData || balanceSheetData.length === 0)) {
      console.log(`⚠️ No historical data for ROIC calculation for ${symbol} - will use current year data if available`);
      // Try to get at least current year data
      try {
        incomeStatementData = await financialDataService.fetchIncomeStatement(symbol, 1);
        const balanceSheetResponse = await fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
        if (balanceSheetResponse.ok) {
          const data = await balanceSheetResponse.json();
          balanceSheetData = Array.isArray(data) ? data : null;
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch even current year data for ${symbol}`);
      }
    }

    const roicSeries: (number | null)[] = [];

    for (let i = 0; i < 10; i++) {
      const inc = incomeStatementData[i] || {};
      const bal = balanceSheetData[i] || {};
      
      const ebit = Number(inc.ebit ?? inc.operatingIncome ?? 0);
      const preTax = Number(inc.incomeBeforeTax ?? 0);
      const taxExp = Number(inc.incomeTaxExpense ?? 0);
      const taxRate = (preTax > 0 && taxExp > 0) ? Math.max(0, Math.min(0.5, taxExp / preTax)) : 0.21;
      const nopat = ebit * (1 - taxRate);
      
      const totalDebt = Number(bal.totalDebt ?? 0);
      const equity = Number(bal.totalStockholdersEquity ?? bal.totalEquity ?? 0);
      const cash = Number(bal.cashAndShortTermInvestments ?? bal.cashAndCashEquivalents ?? 0);
      
      const investedCapital = totalDebt + equity - cash;
      
      if (investedCapital > 0 && !isNaN(nopat) && isFinite(nopat)) {
        let roic = nopat / investedCapital;
        // Clamp to reasonable range
        if (roic > 2) roic = 2;
        if (roic < -2) roic = -2;
        roicSeries.push(roic);
      } else {
        roicSeries.push(null);
      }
    }

    // Pad to 10 years
    while (roicSeries.length < 10) {
      roicSeries.push(null);
    }

    // Calculate average and std (even with just 1 year of data)
    const roicValues = roicSeries.filter(v => v !== null).map(v => Number(v));
    let roic10YAvg = null;
    let roic10YStd = null;
    let roicStability = null;
    let roicStabilityScore = null;

    if (roicValues.length >= 1) {
      roic10YAvg = roicValues.reduce((a, b) => a + b, 0) / roicValues.length;
      
      if (roicValues.length >= 2) {
        const variance = roicValues.reduce((acc, v) => acc + Math.pow(v - roic10YAvg, 2), 0) / roicValues.length;
        roic10YStd = Math.sqrt(variance);
        
        // ROIC Stability = Average / Std (higher is better)
        if (roic10YStd > 0) {
          roicStability = roic10YAvg / roic10YStd;
        }
        
        // ROIC Stability Score (0-100): based on consistency
        if (roic10YStd > 0 && roic10YAvg > 0) {
          const cv = roic10YStd / roic10YAvg; // Coefficient of variation
          roicStabilityScore = Math.max(0, Math.min(100, 100 * (1 - Math.min(cv, 1))));
        }
      }
    }

    // Build update object
    const assignYears = (prefix: string, series: (number | null)[]) => {
      const obj: any = {};
      for (let i = 0; i < 10; i++) {
        obj[`${prefix}_y${i + 1}`] = series[i] ?? null;
      }
      return obj;
    };

    const updates = {
      ...assignYears('roic', roicSeries),
      roic_10y_avg: roic10YAvg ? roic10YAvg.toFixed(4) : null,
      roic_10y_std: roic10YStd ? roic10YStd.toFixed(4) : null,
      roic_stability: roicStability ? roicStability.toFixed(4) : null,
      roic_stability_score: roicStabilityScore ? roicStabilityScore.toFixed(2) : null,
    };

    const { error } = await supabase
      .from('sp500_companies')
      .update(updates)
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating ROIC history for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated ROIC history for ${symbol} (avg: ${roic10YAvg?.toFixed(4) || 'N/A'}, std: ${roic10YStd?.toFixed(4) || 'N/A'})`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating ROIC history for ${symbol}:`, error);
    return false;
  }
}

async function populateDebtAndCashFlowMetrics(symbol: string) {
  console.log(`\n📊 Calculating debt and cash flow metrics for ${symbol}...`);
  
  try {
    // Fetch ratios from FMP API
    const ratiosResponse = await fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
    let debtToEquity = null;
    let interestCoverage = null;

    if (ratiosResponse.ok) {
      const ratiosData = await ratiosResponse.json();
      if (Array.isArray(ratiosData) && ratiosData.length > 0) {
        const ratio = ratiosData[0];
        debtToEquity = ratio.debtEquityRatio !== undefined && ratio.debtEquityRatio !== null ? Number(ratio.debtEquityRatio) : null;
        interestCoverage = ratio.interestCoverage !== undefined && ratio.interestCoverage !== null ? Number(ratio.interestCoverage) : null;
        
        // Cap extremely high values
        if (debtToEquity !== null && isFinite(debtToEquity) && debtToEquity > 10000) {
          debtToEquity = 10000;
        }
        if (interestCoverage !== null && isFinite(interestCoverage) && interestCoverage > 100000) {
          interestCoverage = 100000;
        }
      }
    }

    // Calculate Cash Flow to Debt
    const { data: company, error: fetchError } = await supabase
      .from('sp500_companies')
      .select('latest_fcf, total_debt')
      .eq('symbol', symbol)
      .single();

    let cashFlowToDebt = null;
    if (!fetchError && company) {
      const fcf = company.latest_fcf ? parseFloat(company.latest_fcf) : null;
      const debt = company.total_debt ? parseFloat(company.total_debt) : null;
      
      if (fcf !== null && debt !== null && debt > 0) {
        cashFlowToDebt = fcf / debt;
      }
    }

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        debt_to_equity: debtToEquity !== null && isFinite(debtToEquity) ? debtToEquity.toFixed(4) : null,
        interest_coverage: interestCoverage !== null && isFinite(interestCoverage) ? interestCoverage.toFixed(4) : null,
        cash_flow_to_debt: cashFlowToDebt !== null && isFinite(cashFlowToDebt) ? cashFlowToDebt.toFixed(4) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating debt/cash flow metrics for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated debt/cash flow metrics for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating debt/cash flow metrics for ${symbol}:`, error);
    return false;
  }
}

async function populateCurrentFcfMargin(symbol: string) {
  console.log(`\n📊 Calculating current FCF margin for ${symbol}...`);
  
  try {
    const { data: company, error: fetchError } = await supabase
      .from('sp500_companies')
      .select('latest_fcf, revenue')
      .eq('symbol', symbol)
      .single();

    if (fetchError || !company) {
      console.log(`⚠️ Could not fetch company data for ${symbol}`);
      return false;
    }

    const fcf = company.latest_fcf ? parseFloat(company.latest_fcf) : null;
    const revenue = company.revenue ? parseFloat(company.revenue) : null;

    let fcfMargin = null;
    if (fcf !== null && revenue !== null && revenue > 0) {
      fcfMargin = fcf / revenue;
      // Clamp to reasonable range
      if (fcfMargin > 2) fcfMargin = 2;
      if (fcfMargin < -2) fcfMargin = -2;
    }

    const { error } = await supabase
      .from('sp500_companies')
      .update({
        fcf_margin: fcfMargin !== null && isFinite(fcfMargin) ? fcfMargin.toFixed(4) : null,
      })
      .eq('symbol', symbol);

    if (error) {
      console.error(`❌ Error updating FCF margin for ${symbol}:`, error);
      return false;
    }

    console.log(`✅ Updated FCF margin for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`❌ Error calculating FCF margin for ${symbol}:`, error);
    return false;
  }
}

// Export main function for use in API endpoints
export { main as populateNewSP500Companies };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('populate-new-sp500-companies.ts')) {
  main().catch(console.error);
}

