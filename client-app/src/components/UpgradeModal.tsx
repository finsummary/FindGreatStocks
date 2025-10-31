import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Unlock, 
  Globe, 
  TrendingUp, 
  Calculator, 
  BarChart3, 
  Search, 
  Zap, 
  Brain 
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (args: { priceId?: string; plan: 'annual' | 'quarterly' }) => void;
}

const features = [
  { icon: Unlock, text: 'Access all markets: DJIA, S&P 500, Nasdaq 100 & more coming soon' },
  { icon: Globe, text: 'Expanding to Global Markets, full US universe, and ETFs' },
  { icon: TrendingUp, text: 'Return on Risk Scanner – Evaluate risk-adjusted performance (3/5/10Y)' },
  { icon: Calculator, text: 'DCF Valuation Scanner – Find stocks trading below intrinsic value' },
  { icon: BarChart3, text: 'Reverse DCF Scanner – Uncover growth expectations priced in' },
  { icon: Search, text: 'DuPont ROE Decomposition – Break down what drives return on equity' },
  { icon: Zap, text: 'Full access with all future tools and updates included' },
  { icon: Brain, text: 'Discover high-quality, undervalued companies faster' },
];

const boldTerms = [
  'Return on Risk Scanner',
  'DCF Valuation Scanner',
  'Reverse DCF Scanner',
  'DuPont ROE Decomposition',
  'Full access',
];


export function UpgradeModal({ isOpen, onClose, onUpgrade }: UpgradeModalProps) {
  const quarterlyPriceId = import.meta.env.VITE_STRIPE_QUARTERLY_PRICE_ID;
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID;

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'quarterly'>('annual');
  const selectedPriceId = selectedPlan === 'annual' ? annualPriceId : quarterlyPriceId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 grid grid-rows-[auto_1fr_auto] max-h-[90vh] bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Upgrade to Premium</DialogTitle>
          <DialogDescription>
            Unlock the full power of FindGreatStocks and get access to exclusive features.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-5 pb-24 sm:pb-4 border-t overflow-y-auto bg-white/95 dark:bg-zinc-900/95">
          <h3 className="text-lg font-semibold mb-4">Premium Features</h3>
          <ul className="space-y-1.5">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const text = feature.text;
              const termToBold = boldTerms.find(term => text.startsWith(term));

              if (termToBold) {
                const parts = text.split(termToBold);
                return (
                  <li key={index} className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-200 flex-1">
                      <strong className="font-semibold text-foreground">{termToBold}</strong>
                      {parts[1]}
                    </span>
                  </li>
                )
              }
              return (
                <li key={index} className="flex items-start gap-3">
                  <IconComponent className="h-5 w-5 mt-0.5 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-200 flex-1">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <DialogFooter className="flex-col gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-6">
          <div className="flex w-full flex-col sm:flex-row gap-2">
            <div
              onClick={() => setSelectedPlan('quarterly')}
              className={`cursor-pointer rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm p-4 flex-1 flex flex-col h-auto text-center transition-all ${selectedPlan === 'quarterly' ? 'border-primary ring-2 ring-primary' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
            >
              <span className="font-semibold text-lg">Quarterly Plan</span>
              <span className="text-2xl font-bold">$9</span>
              <span className="text-xs text-muted-foreground">billed every 3 months</span>
            </div>
            <div
              onClick={() => setSelectedPlan('annual')}
              className={`cursor-pointer rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm p-4 flex-1 flex flex-col h-auto text-center transition-all ${selectedPlan === 'annual' ? 'border-primary ring-2 ring-primary' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
            >
              <span className="font-semibold text-lg">Annual Plan</span>
              <span className="text-2xl font-bold">$29</span>
              <span className="text-xs text-muted-foreground">billed once a year</span>
              <span className="mt-2 inline-block bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
                Save 19%
              </span>
            </div>
          </div>
          <div className="w-full">
            <Button size="lg" className="w-full" onClick={() => onUpgrade({ priceId: selectedPriceId, plan: selectedPlan })}>
              Upgrade
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              These introductory prices are for the first 1,000 users. The price will increase after.
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
