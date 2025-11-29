import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, X, Check, Copy, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/providers/AuthProvider";

interface Watchlist {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface WatchlistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWatchlist?: (watchlistId: number) => void;
  companySymbol?: string;
  currentWatchlistId?: number;
  mode?: 'select' | 'manage';
}

export function WatchlistManager({ 
  open, 
  onOpenChange, 
  onSelectWatchlist,
  companySymbol,
  currentWatchlistId,
  mode = 'manage'
}: WatchlistManagerProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: watchlists = [], isLoading } = useQuery<Watchlist[]>({
    queryKey: ['/api/watchlists'],
    queryFn: () => authFetch('/api/watchlists'),
    enabled: open && !!session,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => authFetch('/api/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
      setNewName("");
      setShowCreate(false);
      toast({ title: "Success", description: "Watchlist created" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create watchlist",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => authFetch(`/api/watchlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
      setEditingId(null);
      setEditName("");
      toast({ title: "Success", description: "Watchlist renamed" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to rename watchlist",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => authFetch(`/api/watchlists/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: "Watchlist deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to delete watchlist",
        variant: "destructive" 
      });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ fromId, toId }: { fromId: number; toId: number }) => authFetch('/api/watchlist/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        companySymbol, 
        fromWatchlistId: fromId, 
        toWatchlistId: toId 
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: "Company moved" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to move company",
        variant: "destructive" 
      });
    },
  });

  const copyMutation = useMutation({
    mutationFn: ({ fromId, toId }: { fromId: number; toId: number }) => authFetch('/api/watchlist/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        companySymbol, 
        fromWatchlistId: fromId, 
        toWatchlistId: toId 
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/companies'] });
      toast({ title: "Success", description: "Company copied" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to copy company",
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (watchlist: Watchlist) => {
    setEditingId(watchlist.id);
    setEditName(watchlist.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate(newName.trim());
    }
  };

  const handleSelect = (watchlistId: number) => {
    if (onSelectWatchlist) {
      onSelectWatchlist(watchlistId);
    }
    onOpenChange(false);
  };

  const handleMove = (toId: number) => {
    if (currentWatchlistId && companySymbol) {
      // If onSelectWatchlist is provided, use it (for company-table integration)
      // Otherwise use built-in mutation
      if (onSelectWatchlist) {
        onSelectWatchlist(toId);
      } else {
        moveMutation.mutate({ fromId: currentWatchlistId, toId });
      }
    } else if (companySymbol && onSelectWatchlist) {
      // If currentWatchlistId is missing but we have companySymbol and onSelectWatchlist,
      // still try to call it (company-table will handle the logic)
      onSelectWatchlist(toId);
    }
  };

  const handleCopy = (toId: number) => {
    if (currentWatchlistId && companySymbol) {
      // If onSelectWatchlist is provided, use it (for company-table integration)
      // Otherwise use built-in mutation
      if (onSelectWatchlist) {
        onSelectWatchlist(toId);
      } else {
        copyMutation.mutate({ fromId: currentWatchlistId, toId });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100 text-lg font-semibold">
            {mode === 'select' ? 'Select Watchlist' : 'Manage Watchlists'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
            {mode === 'select' && companySymbol 
              ? `Choose a watchlist for ${companySymbol}`
              : 'Create, rename, or delete your watchlists'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-gray-900 dark:text-gray-100">
          {/* Create new watchlist */}
          {showCreate ? (
            <div className="flex gap-2">
              <Input
                placeholder="Watchlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setShowCreate(false);
                    setNewName("");
                  }
                }}
                autoFocus
              />
              <Button 
                size="sm" 
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Watchlist
            </Button>
          )}

          {/* Watchlist list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-4">Loading...</div>
            ) : watchlists.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-4">No watchlists yet</div>
            ) : (
              watchlists.map((watchlist) => (
                <div
                  key={watchlist.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {editingId === watchlist.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {watchlist.name}
                          {watchlist.is_default && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Default)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {mode === 'select' && (
                          <>
                            {companySymbol && (
                              <>
                                {currentWatchlistId && currentWatchlistId !== watchlist.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleMove(watchlist.id)}
                                      disabled={moveMutation.isPending || copyMutation.isPending}
                                      title="Move here"
                                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                      <Move className="h-4 w-4 mr-1" />
                                      Move
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCopy(watchlist.id)}
                                      disabled={moveMutation.isPending || copyMutation.isPending}
                                      title="Copy here"
                                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copy
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSelect(watchlist.id)}
                                  >
                                    Select
                                  </Button>
                                )}
                              </>
                            )}
                            {!companySymbol && (
                              <Button
                                size="sm"
                                onClick={() => handleSelect(watchlist.id)}
                              >
                                Select
                              </Button>
                            )}
                          </>
                        )}
                        {mode === 'manage' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(watchlist)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!watchlist.is_default && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete "${watchlist.name}"?`)) {
                                    deleteMutation.mutate(watchlist.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

