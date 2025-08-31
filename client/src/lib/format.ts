export function formatMarketCap(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '-';
  
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)} T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)} B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)} M`;
  } else {
    return `$${num.toLocaleString()}`;
  }
}

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return '-';
  const num = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(num)) return '-';
  
  return `$${num.toFixed(2)}`;
}

export function formatPercentage(percentage: number | string | null | undefined, showSign = true, decimalPlaces = 2): string {
  if (percentage === null || percentage === undefined) return '-';
  const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  if (isNaN(num)) {
    return '-';
  }
  
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimalPlaces)}%`;
}

export function formatPercentageFromDecimal(percentage: number | string | null | undefined, showSign = true): string {
  if (percentage === null || percentage === undefined) return '-';
  const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  if (isNaN(num)) {
    return '-';
  }
  
  const percentValue = num * 100;
  const sign = showSign && percentValue > 0 ? '+' : '';
  return `${sign}${percentValue.toFixed(2)}%`;
}

export function formatEarnings(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || num === 0) {
    return '-';
  }
  
  const billions = num / 1e9;
  
  if (Math.abs(billions) >= 10) {
    return `$${billions.toFixed(1)} B`;
  } else if (Math.abs(billions) >= 1) {
    return `$${billions.toFixed(2)} B`;
  } else {
    const millions = num / 1e6;
    return `$${millions.toFixed(1)} M`;
  }
}

export function formatNumber(value: number | string | null | undefined, decimalPlaces = 2): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '-';
  
  return num.toFixed(decimalPlaces);
}

export function formatCountry(country: string): string {
  const countryMap: Record<string, string> = {
    'us': 'USA',
    'cn': 'China',
    'sa': 'S. Arabia',
    'tw': 'Taiwan',
    'de': 'Germany',
    'dk': 'Denmark',
    'fr': 'France',
    'nl': 'Netherlands',
    'kr': 'S. Korea'
  };
  
  return countryMap[country] || country;
}
