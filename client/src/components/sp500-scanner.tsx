import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Download, RefreshCw, TrendingUp, TrendingDown, Building2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  success: number;
  failed: number;
  total: number;
  details: {
    successRate: string;
    source: string;
    dataIncluded: string[];
  };
}

interface SP500Preview {
  message: string;
  total: number;
  preview: Array<{
    symbol: string;
    name: string;
    sector: string;
  }>;
  sectors: string[];
}

export function SP500Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Preview S&P 500 data
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['/api/scan/sp500/preview'],
    queryFn: async () => {
      const response = await fetch('/api/scan/sp500/preview');
      if (!response.ok) throw new Error('Failed to fetch S&P 500 preview');
      return response.json() as SP500Preview;
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (limit: number) => {
      const response = await fetch(`/api/scan/sp500?limit=${limit}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Scan failed');
      return response.json() as ScanResult;
    },
    onSuccess: (data) => {
      setScanResults(data);
      setIsScanning(false);
      setScanProgress(100);
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/stats'] });
      toast({
        title: "S&P 500 Scan Complete",
        description: `Successfully imported ${data.success} companies (${data.details.successRate} success rate)`,
      });
    },
    onError: (error) => {
      setIsScanning(false);
      setScanProgress(0);
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = (limit: number) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResults(null);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 1000);

    scanMutation.mutate(limit);
  };

  if (previewLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            S&P 500 Scanner
          </CardTitle>
          <CardDescription>Loading S&P 500 data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            S&P 500 Scanner
          </CardTitle>
          <CardDescription>
            Import real-time financial data for S&P 500 companies from Financial Modeling Prep
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview Info */}
          {preview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{preview.total}</div>
                  <div className="text-sm text-muted-foreground">S&P 500 Companies</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{preview.sectors.length}</div>
                  <div className="text-sm text-muted-foreground">Sectors</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Building2 className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">US Companies</div>
                </div>
              </div>
            </div>
          )}

          {/* Sample Companies */}
          {preview && (
            <div>
              <h4 className="font-semibold mb-3">Sample Companies</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {preview.preview.map((company) => (
                  <div key={company.symbol} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">{company.symbol}</div>
                    </div>
                    <Badge variant="outline">{company.sector}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan Progress */}
          {isScanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Scanning S&P 500 companies...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>
          )}

          {/* Scan Results */}
          {scanResults && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Scan Complete</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-600">{scanResults.success}</div>
                    <div className="text-muted-foreground">Success</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{scanResults.failed}</div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="font-medium">{scanResults.details.successRate}</div>
                    <div className="text-muted-foreground">Success Rate</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">
                    Data: {scanResults.details.dataIncluded.join(', ')}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleScan(25)}
              disabled={isScanning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Quick Scan (25 companies)
            </Button>
            <Button
              onClick={() => handleScan(100)}
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Standard Scan (100 companies)
            </Button>
            <Button
              onClick={() => handleScan(500)}
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Full Scan (All 500)
            </Button>
            <Button
              onClick={() => {
                fetch('/api/import/sp500-full', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Full Import Started",
                      description: "All S&P 500 companies are being imported in background",
                    });
                  });
              }}
              disabled={isScanning}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Full Background Import
            </Button>
            <Button
              onClick={() => {
                fetch('/api/companies/update-prices', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Price Update Complete",
                      description: `Updated ${data.updated} companies (${data.errors} errors)`,
                    });
                    queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
                  });
              }}
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Update All Prices
            </Button>
            <Button
              onClick={() => {
                fetch('/api/import/sp500-complete', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Complete Import Started",
                      description: "Importing ALL 503 S&P 500 companies with latest data",
                    });
                  });
              }}
              disabled={isScanning}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Import ALL 503 Companies
            </Button>
            <Button
              onClick={() => {
                fetch('/api/companies/enhance-financial-data', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Financial Enhancement Started",
                      description: "Adding Revenue, Earnings, P/E ratios for all companies",
                    });
                  });
              }}
              disabled={isScanning}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Enhance Financial Data
            </Button>
            <Button
              onClick={() => {
                fetch('/api/companies/enhance-returns', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Returns Enhancement Started",
                      description: "Adding 3Y, 5Y, 10Y annualized returns for all companies",
                    });
                  });
              }}
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Add Stock Returns
            </Button>
            <Button
              onClick={() => {
                fetch('/api/companies/enhance-drawdown', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => {
                    toast({
                      title: "Drawdown Enhancement Started",
                      description: "Adding maximum drawdown analysis for all companies",
                    });
                  });
              }}
              disabled={isScanning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingDown className="h-4 w-4" />
              Add Max Drawdown
            </Button>
          </div>

          {/* Sectors */}
          {preview && (
            <div>
              <h4 className="font-semibold mb-3">Available Sectors</h4>
              <div className="flex flex-wrap gap-2">
                {preview.sectors.map((sector) => (
                  <Badge key={sector} variant="secondary" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}