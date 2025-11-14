import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { CompanyTable } from "@/components/company-table";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import { useFlag } from "@/providers/FeatureFlagsProvider";
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
  const [activeTab, setActiveTab] = useState<
    'sp500' | 'nasdaq100' | 'dowjones' |
    'spmid400' | 'ftse100' | 'tsx60' | 'asx200' | 'dax40' | 'cac40' |
    'ibex35' | 'nikkei225' | 'hangseng' | 'nifty50' | 'ibovespa'
  >('dowjones');
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

  // Capture video_opened when modal opens (extra safety)
  useEffect(() => {
    if (!videoId) return;
    const map: Record<string, string> = {
      'T5SW1BHqZr0': 'return_on_risk',
      '0S_SZV_Qzq4': 'dcf',
      'WLb_h--jKVw': 'reverse_dcf',
      'hjpXE6ZYzLo': 'dupont_roe',
    };
    const topic = map[videoId] || 'unknown';
    try { (window as any).phCapture?.('video_opened', { topic, source: 'home' }); } catch {}
  }, [videoId]);

  // Feature flags for global markets
  const spmid400On = useFlag('market:spmid400');
  const ftse100On = useFlag('market:ftse100');
  const tsx60On = useFlag('market:tsx60');
  const asx200On = useFlag('market:asx200');
  const dax40On = useFlag('market:dax40');
  const cac40On = useFlag('market:cac40');
  const ibex35On = useFlag('market:ibex35');
  const nikkeiOn = useFlag('market:nikkei225');
  const hsiOn = useFlag('market:hangseng');
  const nifty50On = useFlag('market:nifty50');
  const ibovespaOn = useFlag('market:ibovespa');

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
              onClick={() => { setActiveTab('dowjones'); try { (window as any).phCapture?.('dataset_selected', { dataset: 'dowjones' }); } catch {} }}
              className={`font-semibold ${activeTab === 'dowjones' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Dow Jones
            </Button>
            <Button
              variant={activeTab === 'sp500' ? 'secondary' : 'outline'}
              onClick={() => { setActiveTab('sp500'); try { (window as any).phCapture?.('dataset_selected', { dataset: 'sp500' }); } catch {} }}
              className={`font-semibold ${activeTab === 'sp500' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              S&P 500
            </Button>
            <Button
              variant={activeTab === 'nasdaq100' ? 'secondary' : 'outline'}
              onClick={() => { setActiveTab('nasdaq100'); try { (window as any).phCapture?.('dataset_selected', { dataset: 'nasdaq100' }); } catch {} }}
              className={`font-semibold ${activeTab === 'nasdaq100' ? 'ring-2 ring-blue-500/50' : ''}`}
            >
              Nasdaq 100
            </Button>
            {ftse100On && (
              <Button
                variant={activeTab === 'ftse100' ? 'secondary' : 'outline'}
                onClick={() => { setActiveTab('ftse100'); try { (window as any).phCapture?.('dataset_selected', { dataset: 'ftse100' }); } catch {} }}
                className={`font-semibold ${activeTab === 'ftse100' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                FTSE 100
              </Button>
            )}
            {tsx60On && (
              <Button
                variant={activeTab === 'tsx60' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('tsx60')}
                className={`font-semibold ${activeTab === 'tsx60' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                TSX 60
              </Button>
            )}
            {asx200On && (
              <Button
                variant={activeTab === 'asx200' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('asx200')}
                className={`font-semibold ${activeTab === 'asx200' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                ASX 200
              </Button>
            )}
            {dax40On && (
              <Button
                variant={activeTab === 'dax40' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('dax40')}
                className={`font-semibold ${activeTab === 'dax40' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                DAX 40
              </Button>
            )}
            {cac40On && (
              <Button
                variant={activeTab === 'cac40' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('cac40')}
                className={`font-semibold ${activeTab === 'cac40' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                CAC 40
              </Button>
            )}
            {ibex35On && (
              <Button
                variant={activeTab === 'ibex35' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('ibex35')}
                className={`font-semibold ${activeTab === 'ibex35' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                IBEX 35
              </Button>
            )}
            {nikkeiOn && (
              <Button
                variant={activeTab === 'nikkei225' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('nikkei225')}
                className={`font-semibold ${activeTab === 'nikkei225' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                Nikkei 225
              </Button>
            )}
            {hsiOn && (
              <Button
                variant={activeTab === 'hangseng' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('hangseng')}
                className={`font-semibold ${activeTab === 'hangseng' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                Hang Seng
              </Button>
            )}
            {nifty50On && (
              <Button
                variant={activeTab === 'nifty50' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('nifty50')}
                className={`font-semibold ${activeTab === 'nifty50' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                Nifty 50
              </Button>
            )}
            {ibovespaOn && (
              <Button
                variant={activeTab === 'ibovespa' ? 'secondary' : 'outline'}
                onClick={() => setActiveTab('ibovespa')}
                className={`font-semibold ${activeTab === 'ibovespa' ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                Ibovespa
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  type="button"
                  onClick={() => { try { (window as any).phCapture?.('market_menu_opened'); } catch {} }}
                >
                  <span className="flex items-center gap-1.5">
                    <span>Coming Soon</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Global Markets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!spmid400On && <DropdownMenuItem disabled onClick={() => { try { (window as any).phCapture?.('market_button_click', { dataset: 'spmid400', available: false }); } catch {} }}>S&amp;P MidCap 400 (US)</DropdownMenuItem>}
                {!ftse100On && <DropdownMenuItem disabled>FTSE 100 (UK)</DropdownMenuItem>}
                {!tsx60On && <DropdownMenuItem disabled>TSX 60 (Canada)</DropdownMenuItem>}
                {!asx200On && <DropdownMenuItem disabled>ASX 200 (Australia)</DropdownMenuItem>}
                {!dax40On && <DropdownMenuItem disabled>DAX 40 (Germany)</DropdownMenuItem>}
                {!cac40On && <DropdownMenuItem disabled>CAC 40 (France)</DropdownMenuItem>}
                {!ibex35On && <DropdownMenuItem disabled>IBEX 35 (Spain)</DropdownMenuItem>}
                {!nikkeiOn && <DropdownMenuItem disabled>Nikkei 225 (Japan)</DropdownMenuItem>}
                {!hsiOn && <DropdownMenuItem disabled>Hang Seng (China)</DropdownMenuItem>}
                {!nifty50On && <DropdownMenuItem disabled>Nifty 50 (India)</DropdownMenuItem>}
                {!ibovespaOn && <DropdownMenuItem disabled>Ibovespa (Brazil)</DropdownMenuItem>}
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
                try { (window as any).phCapture?.('tutorials_toggle', { state: nv ? 'open' : 'closed' }); } catch {}
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
                    onClick={() => { setVideoId('T5SW1BHqZr0'); try { (window as any).phCapture?.('video_opened', { topic: 'return_on_risk', source: 'home' }); } catch {} }}
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
                    onClick={() => { setVideoId('0S_SZV_Qzq4'); try { (window as any).phCapture?.('video_opened', { topic: 'dcf', source: 'home' }); } catch {} }}
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
                    onClick={() => { setVideoId('WLb_h--jKVw'); try { (window as any).phCapture?.('video_opened', { topic: 'reverse_dcf', source: 'home' }); } catch {} }}
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
                    onClick={() => { setVideoId('hjpXE6ZYzLo'); try { (window as any).phCapture?.('video_opened', { topic: 'dupont_roe', source: 'home' }); } catch {} }}
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
          {activeTab === 'spmid400' && <CompanyTable searchQuery={searchQuery} dataset="spmid400" activeTab={activeTab as any} />}
          {activeTab === 'ftse100' && <CompanyTable searchQuery={searchQuery} dataset="ftse100" activeTab={activeTab as any} />}
          {activeTab === 'tsx60' && <CompanyTable searchQuery={searchQuery} dataset="tsx60" activeTab={activeTab as any} />}
          {activeTab === 'asx200' && <CompanyTable searchQuery={searchQuery} dataset="asx200" activeTab={activeTab as any} />}
          {activeTab === 'dax40' && <CompanyTable searchQuery={searchQuery} dataset="dax40" activeTab={activeTab as any} />}
          {activeTab === 'cac40' && <CompanyTable searchQuery={searchQuery} dataset="cac40" activeTab={activeTab as any} />}
          {activeTab === 'ibex35' && <CompanyTable searchQuery={searchQuery} dataset="ibex35" activeTab={activeTab as any} />}
          {activeTab === 'nikkei225' && <CompanyTable searchQuery={searchQuery} dataset="nikkei225" activeTab={activeTab as any} />}
          {activeTab === 'hangseng' && <CompanyTable searchQuery={searchQuery} dataset="hangseng" activeTab={activeTab as any} />}
          {activeTab === 'nifty50' && <CompanyTable searchQuery={searchQuery} dataset="nifty50" activeTab={activeTab as any} />}
          {activeTab === 'ibovespa' && <CompanyTable searchQuery={searchQuery} dataset="ibovespa" activeTab={activeTab as any} />}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
