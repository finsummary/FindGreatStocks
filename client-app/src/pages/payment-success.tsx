import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { authFetch } from "@/lib/authFetch";

export function PaymentSuccessPage() {
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirm = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        let amount: number | null = null;
        let currency: string | null = null;
        if (sessionId) {
          const res = await authFetch('/api/stripe/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          amount = res?.amount_total ?? null;
          currency = res?.currency ?? null;
        }
        await refreshUser();
        try {
          (window as any).phCapture?.('checkout_success', { sessionId, amount, currency });
          if (amount && currency) (window as any).phCapture?.('revenue', { amount, currency, sessionId });
        } catch {}
        setConfirming(false);
      } catch (e: any) {
        console.error('Payment confirm error:', e);
        setError(e?.message || 'Failed to confirm payment');
        try { (window as any).phCapture?.('api_error', { area: 'checkout_confirm', message: e?.message }); } catch {}
        setConfirming(false);
      }
    };
    confirm();
  }, [searchParams, refreshUser]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full p-3 w-fit">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription className="text-muted-foreground">
            {confirming ? 'Activating your premium access...' : error ? error : 'Your account has been upgraded to Premium.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" disabled={confirming}>
            <Link to="/">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
