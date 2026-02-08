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
  onUpgrade: (args: { priceId?: string; plan: 'monthly' | 'annual' | 'quarterly' }) => void;
}

const features = [
  { icon: Unlock, text: 'Access all markets: DJIA, S&P 500, Nasdaq 100 & more coming soon' },
  { icon: Globe, text: 'Expanding to Global Markets, full US universe, and ETFs' },
  { icon: TrendingUp, text: 'Return on Risk Scanner – Evaluate risk-adjusted performance (3/5/10Y)' },
  { icon: Calculator, text: 'DCF Valuation Scanner – Find stocks trading below intrinsic value' },
  { icon: BarChart3, text: 'Reverse DCF Scanner – Uncover growth expectations priced in' },
  { icon: Search, text: 'DuPont ROE Decomposition – Break down what drives return on equity' },
  { icon: TrendingUp, text: 'Compounders (ROIC) Scanner – Identify great compounders' },
  { icon: Calculator, text: 'Cashflow & Leverage Scanner – Assess cash generation and debt' },
  { icon: Brain, text: 'Education Section – Access all educational content and future educational materials' },
  { icon: Zap, text: 'Full access with all future tools and updates included' },
  { icon: Brain, text: 'Discover high-quality, undervalued companies faster' },
];

const boldTerms = [
  'Return on Risk Scanner',
  'DCF Valuation Scanner',
  'Reverse DCF Scanner',
  'DuPont ROE Decomposition',
  'Compounders (ROIC) Scanner',
  'Cashflow & Leverage Scanner',
  'Education Section',
  'Full access',
];


export function UpgradeModal({ isOpen, onClose, onUpgrade }: UpgradeModalProps) {
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 flex flex-col max-h-[90vh] overflow-y-auto bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Upgrade to Premium</DialogTitle>
          <DialogDescription>
            Get full access to all premium features with a 7-day free trial.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-5 pb-6 border-t bg-white/95 dark:bg-zinc-900/95">
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
        <DialogFooter className="flex-col gap-4 bg-zinc-50 dark:bg-zinc-800/60 p-6">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm p-4 text-center">
              <span className="font-semibold text-lg">Monthly</span>
              <div className="mt-2 text-3xl font-bold">$9</div>
              <div className="text-xs text-muted-foreground">per month</div>
              <div className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">7-day free trial</div>
              <Button
                size="lg"
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold"
                onClick={() => { onUpgrade({ priceId: monthlyPriceId, plan: 'monthly' }); }}
              >
                Start Free Trial
              </Button>
            </div>
            
            {/* Annual Plan */}
            <div className="rounded-lg border-2 border-green-500 dark:border-green-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm p-4 text-center relative">
              <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">BEST VALUE</span>
              <span className="font-semibold text-lg">Annual</span>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xl text-muted-foreground line-through">$108</span>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">55% OFF</span>
              </div>
              <div className="mt-1 text-3xl font-bold">$49</div>
              <div className="text-xs text-muted-foreground">per year</div>
              <div className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">7-day free trial</div>
              <Button
                size="lg"
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold"
                onClick={() => { onUpgrade({ priceId: annualPriceId, plan: 'annual' }); }}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No charges during the 7-day free trial.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
