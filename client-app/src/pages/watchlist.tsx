import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CompanyTable } from "@/components/company-table";

export function WatchlistPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your watchlist. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [user, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
          <h1 className="text-2xl font-bold">My Watchlist</h1>
        </div>
      </div>

      {/* Watchlist Table (full-featured) */}
      <CompanyTable searchQuery={searchQuery} dataset="watchlist" activeTab="watchlist" />
    </div>
  );
}