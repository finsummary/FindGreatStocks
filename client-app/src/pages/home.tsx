import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { CompanyTable } from "@/components/company-table";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlayCircle, ChevronDown } from "lucide-react";

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'sp500' | 'nasdaq100' | 'dowjones'>('dowjones');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(false);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'dowjones' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('dowjones')}
              className={`font-semibold ${activeTab === 'dowjones' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Dow Jones
            </Button>
            <Button
              variant={activeTab === 'sp500' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('sp500')}
              className={`font-semibold ${activeTab === 'sp500' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              S&P 500
            </Button>
            <Button
              variant={activeTab === 'nasdaq100' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('nasdaq100')}
              className={`font-semibold ${activeTab === 'nasdaq100' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Nasdaq 100
            </Button>
          </div>
          <form onSubmit={handleSearch} className="flex w-full sm:max-w-sm items-center space-x-2">
            <Input 
              type="text" 
              placeholder="Search by company or ticker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </div>

        {/* Tutorial video buttons with popup player (collapsible) */}
        <Card className="mb-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-900 dark:text-amber-100"
            onClick={() => setShowTutorials(v => !v)}
          >
            <span className="font-bold">How‑To Tutorials</span>
            <ChevronDown className={`h-4 w-4 transition-transform text-amber-800 dark:text-amber-200 ${showTutorials ? 'rotate-180' : ''}`} />
          </button>
          {showTutorials && (
            <div className="px-4 pb-4 pt-1">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-2 w-full" onClick={() => setVideoId('T5SW1BHqZr0')}>
                    <PlayCircle className="h-4 w-4" />
                    <span>Which companies have the highest Return on Risk?</span>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Find risk‑adjusted winners using AR/MDD over 3/5/10Y.
                  </div>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-2 w-full" onClick={() => setVideoId('0S_SZV_Qzq4')}>
                    <PlayCircle className="h-4 w-4" />
                    <span>Which companies are undervalued by DCF?</span>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    See intrinsic value and Margin of Safety highlights.
                  </div>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-2 w-full" onClick={() => setVideoId('WLb_h--jKVw')}>
                    <PlayCircle className="h-4 w-4" />
                    <span>What growth is priced in? (Reverse DCF)</span>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Compare implied FCF growth to historical growth rates.
                  </div>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button variant="outline" size="sm" className="inline-flex items-center justify-center gap-2 w-full" onClick={() => setVideoId('hjpXE6ZYzLo')}>
                    <PlayCircle className="h-4 w-4" />
                    <span>What drives ROE? (DuPont decomposition)</span>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Break ROE into profitability, efficiency, and leverage.
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Video Modal */}
        <Dialog open={!!videoId} onOpenChange={(open) => { if (!open) setVideoId(null); }}>
          <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
            {videoId && (
              <div className="relative w-full pt-[56.25%]">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div>
          {activeTab === 'sp500' && <CompanyTable searchQuery={searchQuery} dataset="sp500" activeTab={activeTab} />}
          {activeTab === 'nasdaq100' && <CompanyTable searchQuery={searchQuery} dataset="nasdaq100" activeTab={activeTab} />}
          {activeTab === 'dowjones' && <CompanyTable searchQuery={searchQuery} dataset="dowjones" activeTab={activeTab} />}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
