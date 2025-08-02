export function formatMarketCap(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(3)} T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)} B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)} M`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return `$${num.toFixed(2)}`;
}

export function formatPercentage(percentage: number | string, showSign = true): string {
  const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  // Handle null, undefined, or invalid values
  if (isNaN(num)) {
    return '-';
  }
  
  // Database already stores percentage values (e.g., 23.86 for 23.86%), so no conversion needed
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatPercentageFromDecimal(percentage: number | string, showSign = true): string {
  const num = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  // Handle null, undefined, or invalid values
  if (isNaN(num)) {
    return '-';
  }
  
  // Convert decimal to percentage (0.0772 becomes 7.72%)
  const percentValue = num * 100;
  const sign = showSign && percentValue > 0 ? '+' : '';
  return `${sign}${percentValue.toFixed(2)}%`;
}

export function formatEarnings(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Return empty string for invalid numbers
  if (isNaN(num) || num === 0) {
    return '-';
  }
  
  // Convert to billions
  const billions = num / 1e9;
  
  // Format with appropriate decimal places
  if (Math.abs(billions) >= 10) {
    return `$${billions.toFixed(1)} B`;
  } else if (Math.abs(billions) >= 1) {
    return `$${billions.toFixed(2)} B`;
  } else {
    return `$${billions.toFixed(3)} B`;
  }
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
