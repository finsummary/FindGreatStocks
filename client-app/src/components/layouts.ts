export interface ColumnConfig {
  id: string;
  label: string;
  width: string;
  defaultVisible: boolean;
}

export const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'watchlist', label: 'Watchlist', width: 'w-[50px]', defaultVisible: true },
  { id: 'rank', label: 'Rank', width: 'w-[30px]', defaultVisible: true },
  { id: 'name', label: 'Company Name', width: 'w-[200px]', defaultVisible: true },
  { id: 'marketCap', label: 'Market Cap', width: 'w-[110px]', defaultVisible: true },
  { id: 'price', label: 'Price', width: 'w-[80px]', defaultVisible: true },
  { id: 'revenue', label: 'Revenue', width: 'w-[110px]', defaultVisible: true },
  { id: 'netIncome', label: 'Earnings', width: 'w-[90px]', defaultVisible: true },
  { id: 'peRatio', label: 'P/E Ratio', width: 'w-[75px]', defaultVisible: false },
  { id: 'priceToSalesRatio', label: 'P/S Ratio', width: 'w-[75px]', defaultVisible: false },
  { id: 'dividendYield', label: 'Dividend Yield', width: 'w-[100px]', defaultVisible: false },
  { id: 'netProfitMargin', label: 'Net Profit Margin', width: 'w-[120px]', defaultVisible: false },
  { id: 'freeCashFlow', label: 'Free Cash Flow', width: 'w-[120px]', defaultVisible: false },
  { id: 'revenueGrowth3Y', label: 'Rev G 3Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth5Y', label: 'Rev G 5Y', width: 'w-[90px]', defaultVisible: false },
  { id: 'revenueGrowth10Y', label: 'Rev G 10Y', width: 'w-[90px]', defaultVisible: true },
  { id: 'return3Year', label: '3Y Return', width: 'w-[85px]', defaultVisible: false },
  { id: 'return5Year', label: '5Y Return', width: 'w-[85px]', defaultVisible: false },
  { id: 'return10Year', label: '10Y Return', width: 'w-[85px]', defaultVisible: true },
  { id: 'maxDrawdown3Year', label: '3Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown5Year', label: '5Y Max Drawdown', width: 'w-[120px]', defaultVisible: false },
  { id: 'maxDrawdown10Year', label: '10Y Max Drawdown', width: 'w-[120px]', defaultVisible: true },
  { id: 'arMddRatio3Year', label: '3Y Return/Risk', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio5Year', label: '5Y Return/Risk', width: 'w-[120px]', defaultVisible: false },
  { id: 'arMddRatio10Year', label: '10Y Return/Risk', width: 'w-[120px]', defaultVisible: true },
  { id: 'dcfEnterpriseValue', label: 'DCF Enterprise Value', width: 'w-[130px]', defaultVisible: true },
  { id: 'marginOfSafety', label: 'Margin of Safety', width: 'w-[110px]', defaultVisible: true },
  { id: 'dcfImpliedGrowth', label: 'DCF Implied Growth', width: 'w-[130px]', defaultVisible: true },
  { id: 'assetTurnover', label: 'Asset Turnover', width: 'w-[110px]', defaultVisible: false },
  { id: 'financialLeverage', label: 'Financial Leverage', width: 'w-[110px]', defaultVisible: false },
  { id: 'roe', label: 'ROE %', width: 'w-[110px]', defaultVisible: false },
];

const PRESET_LAYOUTS = {
  "returnOnRisk": {
    name: "Return on Risk",
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'return10Year', 'maxDrawdown10Year', 'arMddRatio10Year']
  },
  "growth": {
    name: "Growth",
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'revenueGrowth3Y', 'revenueGrowth5Y', 'revenueGrowth10Y']
  },
  "value": {
    name: "Value",
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'peRatio', 'priceToSalesRatio', 'dividendYield']
  },
  "dcf": {
    name: "DCF",
    columns: ['watchlist', 'rank', 'name', 'marketCap', 'dcfEnterpriseValue', 'marginOfSafety', 'dcfImpliedGrowth']
  }
};

export function getLayoutConfig(layoutId: string) {
  return PRESET_LAYOUTS[layoutId as keyof typeof PRESET_LAYOUTS] || null;
}
