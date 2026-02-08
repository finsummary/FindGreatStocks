import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Settings2, Plus, HelpCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CompanyTable } from "@/components/company-table";
import { WatchlistManager } from "@/components/WatchlistManager";
import { WatchlistTour, useWatchlistTour } from "@/components/WatchlistTour";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/authFetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Watchlist {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function WatchlistPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [watchlistManagerOpen, setWatchlistManagerOpen] = useState(false);
  const { shouldRun, startTour, stopTour } = useWatchlistTour(user);

  const { data: watchlists = [], isLoading: watchlistsLoading } = useQuery<Watchlist[]>({
    queryKey: ['/api/watchlists'],
    queryFn: () => authFetch('/api/watchlists'),
    enabled: !!session,
  });

  useEffect(() => {
    if (!user) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your watchlist. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [user, toast]);

  // Set default watchlist when watchlists load
  useEffect(() => {
    if (watchlists.length > 0 && selectedWatchlistId === null) {
      const defaultWl = watchlists.find(w => w.is_default) || watchlists[0];
      if (defaultWl) {
        setSelectedWatchlistId(defaultWl.id);
      }
    }
  }, [watchlists, selectedWatchlistId]);

  const selectedWatchlist = watchlists.find(w => w.id === selectedWatchlistId);
  // For now, allow all authenticated users to use multiple watchlists
  // TODO: Restrict to premium users later if needed
  const isPaidUser = true; // user?.subscriptionTier === 'paid' || 
                     // user?.subscriptionTier === 'monthly' ||
                     // user?.subscriptionTier === 'quarterly' || 
                     // user?.subscriptionTier === 'annual';

  return (
    <div className="space-y-6">
      <WatchlistTour run={shouldRun} onComplete={stopTour} onStop={stopTour} />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4" data-tour="watchlist-header">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            data-tour="back-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <h1 className="text-2xl font-bold">
            {selectedWatchlist ? selectedWatchlist.name : 'My Watchlist'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isPaidUser && watchlists.length > 0 && (
            <>
              <Select
                value={selectedWatchlistId?.toString() || ''}
                onValueChange={(value) => setSelectedWatchlistId(parseInt(value, 10))}
              >
                <SelectTrigger className="w-[200px]" data-tour="watchlist-selector">
                  <SelectValue placeholder="Select watchlist" />
                </SelectTrigger>
                <SelectContent>
                  {watchlists.map((wl) => (
                    <SelectItem key={wl.id} value={wl.id.toString()}>
                      {wl.name} {wl.is_default && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setWatchlistManagerOpen(true)}
                className="flex items-center gap-2"
                data-tour="manage-watchlists-button"
              >
                <Settings2 className="h-4 w-4" />
                Manage
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            className="text-muted-foreground hover:text-foreground"
            title="Показать тур по watchlist"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Watchlist Table (full-featured) */}
      {selectedWatchlistId !== null ? (
        <CompanyTable 
          searchQuery={searchQuery} 
          dataset="watchlist" 
          activeTab="watchlist"
          watchlistId={selectedWatchlistId}
        />
      ) : watchlistsLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading watchlists...</div>
      ) : (
        <div className="text-center text-muted-foreground py-8">No watchlists found</div>
      )}

      {/* Watchlist Manager Dialog */}
      <WatchlistManager
        open={watchlistManagerOpen}
        onOpenChange={setWatchlistManagerOpen}
        mode="manage"
      />
    </div>
  );
}