import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { CompanyTable } from "@/components/company-table";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";

// Simple YouTube-like play icon (red rounded rectangle with white triangle)
const YouTubeIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="3" fill="#FF0000" />
    <polygon points="10,9 16,12 10,15" fill="#FFFFFF" />
  </svg>
);

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'sp500' | 'nasdaq100' | 'dowjones'>('dowjones');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(() => {
    try {
      // v2 key: сбиваем старое состояние и показываем раскрытым по умолчанию
      const collapsed = localStorage.getItem('fgs:tutorials:collapsed:v2');
      return collapsed === '1' ? false : true;
    } catch {
      return true;
    }
  });

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="font-semibold text-muted-foreground">
                  Coming Soon
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Global Markets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>S&amp;P MidCap 400 (US)</DropdownMenuItem>
                <DropdownMenuItem disabled>FTSE 100 (UK)</DropdownMenuItem>
                <DropdownMenuItem disabled>TSX 60 (Canada)</DropdownMenuItem>
                <DropdownMenuItem disabled>ASX 200 (Australia)</DropdownMenuItem>
                <DropdownMenuItem disabled>DAX 40 (Germany)</DropdownMenuItem>
                <DropdownMenuItem disabled>CAC 40 (France)</DropdownMenuItem>
                <DropdownMenuItem disabled>IBEX 35 (Spain)</DropdownMenuItem>
                <DropdownMenuItem disabled>Nikkei 225 (Japan)</DropdownMenuItem>
                <DropdownMenuItem disabled>Hang Seng (China)</DropdownMenuItem>
                <DropdownMenuItem disabled>Nifty 50 (India)</DropdownMenuItem>
                <DropdownMenuItem disabled>Ibovespa (Brazil)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <Card className="mb-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-900 dark:text-amber-100"
            onClick={() => {
              setShowTutorials(v => {
                const nv = !v;
                try { localStorage.setItem('fgs:tutorials:collapsed:v2', nv ? '0' : '1'); } catch {}
                return nv;
              });
            }}
          >
            <span className="font-bold">How‑To Tutorials</span>
            <ChevronDown className={`h-4 w-4 transition-transform text-amber-800 dark:text-amber-200 ${showTutorials ? 'rotate-180' : ''}`} />
          </button>
          {showTutorials && (
            <div className="px-3 sm:px-4 pb-4 pt-1">
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center justify-start gap-2 w-full whitespace-normal h-auto py-2 min-h-0 text-[13px] sm:text-sm leading-snug"
                    onClick={() => setVideoId('T5SW1BHqZr0')}
                  >
                    <YouTubeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 break-words text-left">Which companies have the highest Return on Risk?</span>
                  </Button>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center justify-start gap-2 w-full whitespace-normal h-auto py-2 min-h-0 text-[13px] sm:text-sm leading-snug"
                    onClick={() => setVideoId('0S_SZV_Qzq4')}
                  >
                    <YouTubeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 break-words text-left">Which companies are undervalued by DCF?</span>
                  </Button>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center justify-start gap-2 w-full whitespace-normal h-auto py-2 min-h-0 text-[13px] sm:text-sm leading-snug"
                    onClick={() => setVideoId('WLb_h--jKVw')}
                  >
                    <YouTubeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 break-words text-left">What growth is priced in? (Reverse DCF)</span>
                  </Button>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center justify-start gap-2 w-full whitespace-normal h-auto py-2 min-h-0 text-[13px] sm:text-sm leading-snug"
                    onClick={() => setVideoId('hjpXE6ZYzLo')}
                  >
                    <YouTubeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 break-words text-left">What drives ROE? (DuPont decomposition)</span>
                  </Button>
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
