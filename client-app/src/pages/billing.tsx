import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function BillingPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (priceId: string) => {
    try {
      setLoading(true);
      const resp = await authFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const sessionId = resp?.sessionId;
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      if (stripe && sessionId) {
        await stripe.redirectToCheckout({ sessionId });
      } else {
        throw new Error('Stripe session error');
      }
    } catch (e: any) {
      toast({ title: 'Checkout error', description: e?.message || 'Failed to start checkout', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tier = (user?.subscriptionTier || 'free').toLowerCase();
  const planLabel = tier === 'lifetime' ? 'lifetime' : tier === 'annual' ? 'annual' : tier === 'quarterly' ? 'quarterly' : tier === 'paid' ? 'paid' : 'free';
  const isLifetime = planLabel === 'lifetime';
  const isFree = planLabel === 'free';
  const isQuarterly = planLabel === 'quarterly';
  const isAnnual = planLabel === 'annual';
  const isLegacyPaid = planLabel === 'paid';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">Current plan: <b>{isLifetime ? 'Lifetime Access' : planLabel}</b></div>
          {isLegacyPaid && !isLifetime && (
            <div className="text-xs text-muted-foreground">Legacy "paid" plan detected. You can switch to Quarterly or Annual below.</div>
          )}
          {!isLifetime && (
            <div className="flex flex-wrap gap-3">
              {(isFree || isLegacyPaid) && (
                <Button disabled={loading || isQuarterly} onClick={() => startCheckout(import.meta.env.VITE_STRIPE_QUARTERLY_PRICE_ID)}>
                  {isQuarterly ? 'On Quarterly' : 'Upgrade to Quarterly'}
                </Button>
              )}
              {(isFree || isQuarterly || isLegacyPaid) && (
                <Button variant="outline" disabled={loading || isAnnual} onClick={() => startCheckout(import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID)}>
                  {isAnnual ? 'On Annual' : 'Upgrade to Annual'}
                </Button>
              )}
              {isAnnual && !isLegacyPaid && (
                <div className="text-sm text-muted-foreground self-center">You are on the highest plan.</div>
              )}
              {!isFree && (
                <Button variant="destructive" disabled={loading} onClick={async () => {
                  try {
                    setLoading(true);
                    await authFetch('/api/billing/downgrade', { method: 'POST' });
                    await refreshUser();
                    toast({ title: 'Plan updated', description: 'You have been downgraded to free (at period end if applicable).' });
                  } catch (e: any) {
                    toast({ title: 'Downgrade error', description: e?.message || 'Failed to downgrade', variant: 'destructive' });
                  } finally {
                    setLoading(false);
                  }
                }}>Downgrade to Free</Button>
              )}
            </div>
          )}
          {isLifetime && (
            <div className="text-sm text-green-700 dark:text-green-400">You have Lifetime Access. No further upgrades are required.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


