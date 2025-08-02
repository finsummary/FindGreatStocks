import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function UpdateStatus() {
  const { data: updateStatus } = useQuery({
    queryKey: ['/api/companies/update-status'],
    queryFn: async () => {
      const response = await fetch('/api/companies/update-status');
      if (!response.ok) throw new Error('Failed to fetch update status');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatTimeUntilNext = (nextUpdate: string) => {
    const now = new Date();
    const next = new Date(nextUpdate);
    const diff = next.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!updateStatus) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Market Data Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {updateStatus.marketStatus === 'open' ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Market Open
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Market Closed
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">Next Update</div>
              <div className="text-muted-foreground">
                {formatTimeUntilNext(updateStatus.nextScheduledUpdate)}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div className="font-medium">Update Schedule</div>
            <div>Daily after 4:00 PM ET</div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          Stock prices and market caps are automatically updated daily after market close using real-time Financial Modeling Prep API data.
        </div>
      </CardContent>
    </Card>
  );
}