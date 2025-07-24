import type { InsertCompany } from "@shared/schema";

// Extended sample data representing what the full API would provide
export const extendedSampleCompanies: InsertCompany[] = [
  // Top 100 companies by market cap with realistic data
  { name: "Microsoft Corporation", symbol: "MSFT", marketCap: "3028000000000", price: "405.63", dailyChange: "2.45", dailyChangePercent: "0.61", country: "United States", countryCode: "us", rank: 1, logoUrl: "https://logo.clearbit.com/microsoft.com" },
  { name: "Apple Inc.", symbol: "AAPL", marketCap: "2987000000000", price: "190.69", dailyChange: "-1.32", dailyChangePercent: "-0.69", country: "United States", countryCode: "us", rank: 2, logoUrl: "https://logo.clearbit.com/apple.com" },
  { name: "Saudi Arabian Oil Company", symbol: "2222.SR", marketCap: "2108000000000", price: "8.24", dailyChange: "0.12", dailyChangePercent: "1.48", country: "Saudi Arabia", countryCode: "sa", rank: 3, logoUrl: "https://logo.clearbit.com/saudiaramco.com" },
  { name: "Alphabet Inc.", symbol: "GOOGL", marketCap: "2086000000000", price: "166.84", dailyChange: "1.23", dailyChangePercent: "0.74", country: "United States", countryCode: "us", rank: 4, logoUrl: "https://logo.clearbit.com/google.com" },
  { name: "Amazon.com Inc.", symbol: "AMZN", marketCap: "1653000000000", price: "157.17", dailyChange: "3.45", dailyChangePercent: "2.24", country: "United States", countryCode: "us", rank: 5, logoUrl: "https://logo.clearbit.com/amazon.com" },
  { name: "NVIDIA Corporation", symbol: "NVDA", marketCap: "1625000000000", price: "659.59", dailyChange: "15.23", dailyChangePercent: "2.36", country: "United States", countryCode: "us", rank: 6, logoUrl: "https://logo.clearbit.com/nvidia.com" },
  { name: "Meta Platforms Inc.", symbol: "META", marketCap: "1279000000000", price: "501.45", dailyChange: "8.76", dailyChangePercent: "1.78", country: "United States", countryCode: "us", rank: 7, logoUrl: "https://logo.clearbit.com/meta.com" },
  { name: "Berkshire Hathaway Inc.", symbol: "BRK-B", marketCap: "883600000000", price: "444.65", dailyChange: "2.34", dailyChangePercent: "0.53", country: "United States", countryCode: "us", rank: 8, logoUrl: "https://logo.clearbit.com/berkshirehathaway.com" },
  { name: "Tesla Inc.", symbol: "TSLA", marketCap: "800450000000", price: "248.50", dailyChange: "-5.67", dailyChangePercent: "-2.23", country: "United States", countryCode: "us", rank: 9, logoUrl: "https://logo.clearbit.com/tesla.com" },
  { name: "Taiwan Semiconductor Manufacturing Company Limited", symbol: "TSM", marketCap: "785320000000", price: "152.78", dailyChange: "1.89", dailyChangePercent: "1.25", country: "Taiwan", countryCode: "tw", rank: 10, logoUrl: "https://logo.clearbit.com/tsmc.com" },
  
  // More tech giants
  { name: "Broadcom Inc.", symbol: "AVGO", marketCap: "648900000000", price: "1398.45", dailyChange: "12.34", dailyChangePercent: "0.89", country: "United States", countryCode: "us", rank: 11, logoUrl: "https://logo.clearbit.com/broadcom.com" },
  { name: "JPMorgan Chase & Co.", symbol: "JPM", marketCap: "589450000000", price: "199.78", dailyChange: "1.45", dailyChangePercent: "0.73", country: "United States", countryCode: "us", rank: 12, logoUrl: "https://logo.clearbit.com/jpmorganchase.com" },
  { name: "Visa Inc.", symbol: "V", marketCap: "548760000000", price: "263.45", dailyChange: "2.67", dailyChangePercent: "1.02", country: "United States", countryCode: "us", rank: 13, logoUrl: "https://logo.clearbit.com/visa.com" },
  { name: "Tencent Holdings Limited", symbol: "TCEHY", marketCap: "492300000000", price: "51.23", dailyChange: "0.87", dailyChangePercent: "1.73", country: "China", countryCode: "cn", rank: 14, logoUrl: "https://logo.clearbit.com/tencent.com" },
  { name: "Johnson & Johnson", symbol: "JNJ", marketCap: "456780000000", price: "174.56", dailyChange: "-0.45", dailyChangePercent: "-0.26", country: "United States", countryCode: "us", rank: 15, logoUrl: "https://logo.clearbit.com/jnj.com" },
  
  // Financial and healthcare
  { name: "Procter & Gamble Company", symbol: "PG", marketCap: "387650000000", price: "163.45", dailyChange: "0.78", dailyChangePercent: "0.48", country: "United States", countryCode: "us", rank: 16, logoUrl: "https://logo.clearbit.com/pg.com" },
  { name: "Mastercard Incorporated", symbol: "MA", marketCap: "372890000000", price: "389.67", dailyChange: "3.45", dailyChangePercent: "0.89", country: "United States", countryCode: "us", rank: 17, logoUrl: "https://logo.clearbit.com/mastercard.com" },
  { name: "UnitedHealth Group Incorporated", symbol: "UNH", marketCap: "498760000000", price: "527.89", dailyChange: "4.56", dailyChangePercent: "0.87", country: "United States", countryCode: "us", rank: 18, logoUrl: "https://logo.clearbit.com/unitedhealthgroup.com" },
  { name: "The Home Depot Inc.", symbol: "HD", marketCap: "356780000000", price: "345.67", dailyChange: "2.34", dailyChangePercent: "0.68", country: "United States", countryCode: "us", rank: 19, logoUrl: "https://logo.clearbit.com/homedepot.com" },
  { name: "Oracle Corporation", symbol: "ORCL", marketCap: "334560000000", price: "118.45", dailyChange: "1.23", dailyChangePercent: "1.05", country: "United States", countryCode: "us", rank: 20, logoUrl: "https://logo.clearbit.com/oracle.com" },
  
  // International companies
  { name: "ASML Holding N.V.", symbol: "ASML", marketCap: "298760000000", price: "732.45", dailyChange: "8.90", dailyChangePercent: "1.23", country: "Netherlands", countryCode: "nl", rank: 21, logoUrl: "https://logo.clearbit.com/asml.com" },
  { name: "Samsung Electronics Co., Ltd.", symbol: "005930.KS", marketCap: "287650000000", price: "58.90", dailyChange: "0.45", dailyChangePercent: "0.77", country: "South Korea", countryCode: "kr", rank: 22, logoUrl: "https://logo.clearbit.com/samsung.com" },
  { name: "L'Oréal S.A.", symbol: "OR.PA", marketCap: "243210000000", price: "456.78", dailyChange: "3.45", dailyChangePercent: "0.76", country: "France", countryCode: "fr", rank: 23, logoUrl: "https://logo.clearbit.com/loreal.com" },
  { name: "Coca-Cola Company", symbol: "KO", marketCap: "267890000000", price: "62.34", dailyChange: "0.23", dailyChangePercent: "0.37", country: "United States", countryCode: "us", rank: 24, logoUrl: "https://logo.clearbit.com/coca-cola.com" },
  { name: "Pfizer Inc.", symbol: "PFE", marketCap: "234560000000", price: "41.23", dailyChange: "-0.67", dailyChangePercent: "-1.60", country: "United States", countryCode: "us", rank: 25, logoUrl: "https://logo.clearbit.com/pfizer.com" },
  
  // More major corporations 
  { name: "Bank of America Corporation", symbol: "BAC", marketCap: "287650000000", price: "37.89", dailyChange: "0.45", dailyChangePercent: "1.20", country: "United States", countryCode: "us", rank: 26, logoUrl: "https://logo.clearbit.com/bankofamerica.com" },
  { name: "Chevron Corporation", symbol: "CVX", marketCap: "298760000000", price: "158.90", dailyChange: "2.34", dailyChangePercent: "1.49", country: "United States", countryCode: "us", rank: 27, logoUrl: "https://logo.clearbit.com/chevron.com" },
  { name: "AbbVie Inc.", symbol: "ABBV", marketCap: "276540000000", price: "156.78", dailyChange: "1.23", dailyChangePercent: "0.79", country: "United States", countryCode: "us", rank: 28, logoUrl: "https://logo.clearbit.com/abbvie.com" },
  { name: "Salesforce Inc.", symbol: "CRM", marketCap: "234560000000", price: "245.67", dailyChange: "4.56", dailyChangePercent: "1.89", country: "United States", countryCode: "us", rank: 29, logoUrl: "https://logo.clearbit.com/salesforce.com" },
  { name: "Netflix Inc.", symbol: "NFLX", marketCap: "198760000000", price: "456.78", dailyChange: "8.90", dailyChangePercent: "1.98", country: "United States", countryCode: "us", rank: 30, logoUrl: "https://logo.clearbit.com/netflix.com" },

  // European giants
  { name: "Nestlé S.A.", symbol: "NESN.SW", marketCap: "345670000000", price: "112.45", dailyChange: "0.67", dailyChangePercent: "0.60", country: "Switzerland", countryCode: "ch", rank: 31, logoUrl: "https://logo.clearbit.com/nestle.com" },
  { name: "Novo Nordisk A/S", symbol: "NVO", marketCap: "487650000000", price: "98.90", dailyChange: "1.23", dailyChangePercent: "1.26", country: "Denmark", countryCode: "dk", rank: 32, logoUrl: "https://logo.clearbit.com/novonordisk.com" },
  { name: "LVMH Moët Hennessy Louis Vuitton SE", symbol: "MC.PA", marketCap: "367890000000", price: "734.56", dailyChange: "5.67", dailyChangePercent: "0.78", country: "France", countryCode: "fr", rank: 33, logoUrl: "https://logo.clearbit.com/lvmh.com" },
  { name: "Toyota Motor Corporation", symbol: "TM", marketCap: "234560000000", price: "178.90", dailyChange: "2.34", dailyChangePercent: "1.33", country: "Japan", countryCode: "jp", rank: 34, logoUrl: "https://logo.clearbit.com/toyota.com" },
  { name: "SAP SE", symbol: "SAP", marketCap: "198760000000", price: "167.45", dailyChange: "1.89", dailyChangePercent: "1.14", country: "Germany", countryCode: "de", rank: 35, logoUrl: "https://logo.clearbit.com/sap.com" },

  // More tech companies
  { name: "Adobe Inc.", symbol: "ADBE", marketCap: "234560000000", price: "512.34", dailyChange: "6.78", dailyChangePercent: "1.34", country: "United States", countryCode: "us", rank: 36, logoUrl: "https://logo.clearbit.com/adobe.com" },
  { name: "Cisco Systems Inc.", symbol: "CSCO", marketCap: "198760000000", price: "47.89", dailyChange: "0.45", dailyChangePercent: "0.95", country: "United States", countryCode: "us", rank: 37, logoUrl: "https://logo.clearbit.com/cisco.com" },
  { name: "Accenture plc", symbol: "ACN", marketCap: "187650000000", price: "289.67", dailyChange: "3.45", dailyChangePercent: "1.21", country: "Ireland", countryCode: "ie", rank: 38, logoUrl: "https://logo.clearbit.com/accenture.com" },
  { name: "Thermo Fisher Scientific Inc.", symbol: "TMO", marketCap: "234560000000", price: "589.90", dailyChange: "4.56", dailyChangePercent: "0.78", country: "United States", countryCode: "us", rank: 39, logoUrl: "https://logo.clearbit.com/thermofisher.com" },
  { name: "Danaher Corporation", symbol: "DHR", marketCap: "176540000000", price: "243.45", dailyChange: "2.34", dailyChangePercent: "0.97", country: "United States", countryCode: "us", rank: 40, logoUrl: "https://logo.clearbit.com/danaher.com" },

  // Additional major companies to reach meaningful scale
  { name: "The Walt Disney Company", symbol: "DIS", marketCap: "198760000000", price: "109.45", dailyChange: "1.23", dailyChangePercent: "1.14", country: "United States", countryCode: "us", rank: 41, logoUrl: "https://logo.clearbit.com/disney.com" },
  { name: "McDonald's Corporation", symbol: "MCD", marketCap: "187650000000", price: "256.78", dailyChange: "2.34", dailyChangePercent: "0.92", country: "United States", countryCode: "us", rank: 42, logoUrl: "https://logo.clearbit.com/mcdonalds.com" },
  { name: "Verizon Communications Inc.", symbol: "VZ", marketCap: "165430000000", price: "39.67", dailyChange: "0.12", dailyChangePercent: "0.30", country: "United States", countryCode: "us", rank: 43, logoUrl: "https://logo.clearbit.com/verizon.com" },
  { name: "Comcast Corporation", symbol: "CMCSA", marketCap: "154320000000", price: "34.56", dailyChange: "0.45", dailyChangePercent: "1.32", country: "United States", countryCode: "us", rank: 44, logoUrl: "https://logo.clearbit.com/comcast.com" },
  { name: "NVIDIA Corporation", symbol: "NVDA", marketCap: "1625000000000", price: "659.59", dailyChange: "15.23", dailyChangePercent: "2.36", country: "United States", countryCode: "us", rank: 45, logoUrl: "https://logo.clearbit.com/nvidia.com" },

  // Chinese companies
  { name: "Alibaba Group Holding Limited", symbol: "BABA", marketCap: "198760000000", price: "76.45", dailyChange: "1.23", dailyChangePercent: "1.63", country: "China", countryCode: "cn", rank: 46, logoUrl: "https://logo.clearbit.com/alibaba.com" },
  { name: "Meituan", symbol: "3690.HK", marketCap: "143210000000", price: "23.45", dailyChange: "0.67", dailyChangePercent: "2.94", country: "China", countryCode: "cn", rank: 47, logoUrl: "https://logo.clearbit.com/meituan.com" },
  { name: "BYD Company Limited", symbol: "1211.HK", marketCap: "132100000000", price: "28.90", dailyChange: "1.45", dailyChangePercent: "5.28", country: "China", countryCode: "cn", rank: 48, logoUrl: "https://logo.clearbit.com/byd.com" },
  { name: "JD.com Inc.", symbol: "JD", marketCap: "121000000000", price: "38.90", dailyChange: "0.89", dailyChangePercent: "2.34", country: "China", countryCode: "cn", rank: 49, logoUrl: "https://logo.clearbit.com/jd.com" },
  { name: "Baidu Inc.", symbol: "BIDU", marketCap: "109870000000", price: "98.45", dailyChange: "2.34", dailyChangePercent: "2.43", country: "China", countryCode: "cn", rank: 50, logoUrl: "https://logo.clearbit.com/baidu.com" },

  // Fill out to demonstrate scale - next 50 companies
  ...Array.from({ length: 950 }, (_, i) => {
    const rank = i + 51;
    const companyNames = [
      "Advanced Semiconductor Corp", "Global Energy Solutions", "International Banking Group", "Digital Media Networks",
      "Healthcare Innovation Inc", "Automotive Manufacturing Co", "Renewable Power Systems", "Financial Technology Ltd",
      "Biotechnology Research Corp", "Consumer Electronics Group", "Industrial Materials Inc", "Software Solutions LLC",
      "Telecommunications Services", "Real Estate Investment Trust", "Food & Beverage Corporation", "Retail Chain Holdings",
      "Transportation Logistics Co", "Entertainment Media Group", "Insurance Services Inc", "Construction Materials Ltd"
    ];
    
    const sectors = ["Tech", "Energy", "Finance", "Healthcare", "Auto", "Consumer", "Industrial", "Telecom"];
    const countries = [
      { name: "United States", code: "us" }, { name: "China", code: "cn" }, { name: "Japan", code: "jp" },
      { name: "Germany", code: "de" }, { name: "United Kingdom", code: "gb" }, { name: "France", code: "fr" },
      { name: "Canada", code: "ca" }, { name: "South Korea", code: "kr" }, { name: "India", code: "in" },
      { name: "Australia", code: "au" }, { name: "Netherlands", code: "nl" }, { name: "Switzerland", code: "ch" }
    ];
    
    const companyName = `${companyNames[i % companyNames.length]} ${sectors[i % sectors.length]}`;
    const country = countries[i % countries.length];
    const symbol = `${companyName.split(' ').map(w => w[0]).join('').toUpperCase()}${rank}`;
    const baseMarketCap = Math.max(500000000, 500000000000 - (rank * 1000000000));
    const basePrice = Math.max(10, 500 - (rank * 2));
    const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
    const change = (basePrice * changePercent / 100);
    
    return {
      name: companyName,
      symbol: symbol,
      marketCap: baseMarketCap.toString(),
      price: basePrice.toFixed(2),
      dailyChange: change.toFixed(2),
      dailyChangePercent: changePercent.toFixed(2),
      country: country.name,
      countryCode: country.code,
      rank: rank,
      logoUrl: `https://logo.clearbit.com/${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`
    } as InsertCompany;
  })
];