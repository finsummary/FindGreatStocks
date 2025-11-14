import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

export function PaymentCancelledPage() {
  useEffect(() => {
    try { (window as any).posthog?.capture?.('checkout_cancelled'); } catch {}
  }, []);
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 dark:bg-red-900 rounded-full p-3 w-fit">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Payment Cancelled</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your payment process was cancelled. Your account has not been charged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">You can return to the dashboard and try the upgrade process again whenever you're ready.</p>
          <Button asChild className="w-full">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
