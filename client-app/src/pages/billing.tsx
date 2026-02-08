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

  const startCheckout = async (priceId: string, plan?: 'monthly' | 'annual' | 'quarterly') => {
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
    tier === 'monthly' ? 'Monthly' :
    tier === 'annual' ? 'Annual' :
    tier === 'quarterly' ? 'Quarterly' :
    tier === 'paid' ? 'Paid' : 'Free';
  const isPremium = ['monthly', 'annual', 'quarterly', 'paid'].includes(tier);
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm">
              Current plan: <b>{planLabel}</b>
            </div>

            {isPremium ? (
              <div className="text-sm text-green-700 dark:text-green-400">
                You have an active premium subscription. Thank you for your support!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monthly Plan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly</CardTitle>
                    <CardDescription>Flexible monthly billing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">$9<span className="text-lg text-muted-foreground">/mo</span></div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">7-day free trial</div>
                    <Button
                      size="lg"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                      disabled={loading}
                      onClick={() => startCheckout(monthlyPriceId as string, 'monthly')}
                    >
                      Start Free Trial
                    </Button>
                  </CardContent>
                </Card>

                {/* Annual Plan */}
                <Card className="border-2 border-green-500 dark:border-green-600 relative">
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">BEST VALUE</div>
                  <CardHeader>
                    <CardTitle className="text-lg">Annual</CardTitle>
                    <CardDescription>Save 55% with annual billing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-muted-foreground line-through">$108</span>
                      <span className="text-3xl font-bold">$49<span className="text-lg text-muted-foreground">/yr</span></span>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">7-day free trial</div>
                    <Button
                      size="lg"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                      disabled={loading}
                      onClick={() => startCheckout(annualPriceId as string, 'annual')}
                    >
                      Start Free Trial
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. No charges during the 7-day free trial.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

 