import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { authFetch } from '@/lib/authFetch';
// no direct Stripe import needed here
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (priceId: string, plan?: 'lifetime' | 'annual' | 'quarterly') => {
    try {
      setLoading(true);
      const resp: any = await authFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan }),
      });
      if (resp?.url) {
        window.location.href = resp.url as string;
        return;
      }
      throw new Error('Checkout URL not provided');
    } catch (e: any) {
      toast({ title: 'Checkout error', description: e?.message || 'Failed to start checkout', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tier = (user?.subscriptionTier || 'free').toLowerCase();
  const planLabel =
    tier === 'lifetime' ? 'lifetime' :
    tier === 'annual' ? 'annual' :
    tier === 'quarterly' ? 'quarterly' :
    tier === 'paid' ? 'paid' : 'free';
  const isLifetime = planLabel === 'lifetime';

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              Current plan: <b>{isLifetime ? 'Lifetime Access' : planLabel}</b>
            </div>

            {isLifetime ? (
              <div className="text-sm text-green-700 dark:text-green-400">
                You have Lifetime Access. No further upgrades are required.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full max-w-sm bg-green-500 hover:bg-green-600 text-white border border-green-600 font-semibold text-base sm:text-lg"
                  disabled={loading}
                  onClick={() => startCheckout(import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID as string, 'lifetime')}
                >
                  Get Lifetime Access
                </Button>
                <p className="text-xs text-muted-foreground">
                  Limited-time offer — available to the first 1,000 users only
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

 