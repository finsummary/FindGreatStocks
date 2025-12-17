"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Edit2, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/authFetch"
import { useAuth } from "@/providers/AuthProvider"

interface CustomLayout {
  id: number
  user_id: string
  name: string
  columns: string[]
  created_at: string
  updated_at: string
}

interface CustomLayoutManagerProps {
  allColumns: Array<{ id: string; label: string }>
  currentColumns: string[]
  onLayoutSelect: (columns: string[]) => void
  onLayoutSave?: (layoutId: string) => void
  onLayoutCreated?: () => void
  onEditLayout?: () => void
  editingLayoutId?: number | null
}

export function CustomLayoutManager({ allColumns, currentColumns, onLayoutSelect, onLayoutSave, onLayoutCreated, onEditLayout, editingLayoutId }: CustomLayoutManagerProps) {
  const { user, session } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLayout, setEditingLayout] = useState<CustomLayout | null>(null)
  const [layoutName, setLayoutName] = useState("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>(currentColumns)

  const isLoggedIn = !!user || !!session
  
  React.useEffect(() => {
    console.log('CustomLayoutManager render', { isLoggedIn, user: !!user, session: !!session, isCreateDialogOpen })
  }, [isLoggedIn, user, session, isCreateDialogOpen])

  const { data: layouts = [], isLoading } = useQuery<CustomLayout[]>({
    queryKey: ['/api/user-layouts'],
    queryFn: async () => {
      if (!isLoggedIn) return []
      const response = await authFetch('/api/user-layouts')
      if (!response.ok) throw new Error('Failed to fetch layouts')
      return response.json()
    },
    enabled: isLoggedIn,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; columns: string[] }) => {
      const response = await authFetch('/api/user-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create layout')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-layouts'] })
      setIsCreateDialogOpen(false)
      setLayoutName("")
      setSelectedColumns([]) // Reset to empty, required columns will always be included
      toast({ title: "Success", description: "Layout created successfully" })
      if (onLayoutSave) {
        onLayoutSave(`custom:${data.id}`)
      }
      if (onLayoutCreated) {
        onLayoutCreated()
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create layout",
        variant: "destructive" 
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; columns: string[] }) => {
      const response = await authFetch(`/api/user-layouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update layout')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-layouts'] })
      setIsEditDialogOpen(false)
      setEditingLayout(null)
      setLayoutName("")
      setSelectedColumns(currentColumns)
      toast({ title: "Success", description: "Layout updated successfully" })
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update layout",
        variant: "destructive" 
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await authFetch(`/api/user-layouts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete layout')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-layouts'] })
      toast({ title: "Success", description: "Layout deleted successfully" })
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete layout",
        variant: "destructive" 
      })
    },
  })

  const handleCreate = () => {
    if (!layoutName.trim()) {
      toast({ 
        title: "Error", 
        description: "Layout name is required",
        variant: "destructive" 
      })
      return
    }
    // Ensure watchlist, rank, and name are always included
    const columnsWithRequired = [
      'watchlist',
      'rank',
      'name',
      ...selectedColumns.filter(col => !['watchlist', 'rank', 'name'].includes(col))
    ]
    // At minimum, we have the 3 required columns, so we don't need to check if selectedColumns is empty
    createMutation.mutate({ name: layoutName.trim(), columns: columnsWithRequired })
  }

  const handleUpdate = () => {
    if (!editingLayout) return
    if (!layoutName.trim()) {
      toast({ 
        title: "Error", 
        description: "Layout name is required",
        variant: "destructive" 
      })
      return
    }
    if (selectedColumns.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please select at least one column",
        variant: "destructive" 
      })
      return
    }
    // Ensure watchlist, rank, and name are always included
    const columnsWithRequired = [
      'watchlist',
      'rank',
      'name',
      ...selectedColumns.filter(col => !['watchlist', 'rank', 'name'].includes(col))
    ]
    updateMutation.mutate({ id: editingLayout.id, name: layoutName.trim(), columns: columnsWithRequired })
  }

  const handleEdit = (layout: CustomLayout) => {
    setEditingLayout(layout)
    setLayoutName(layout.name)
    // Filter out required columns for editing (they'll be added back on save)
    setSelectedColumns(layout.columns.filter(col => !['watchlist', 'rank', 'name'].includes(col)))
    setIsEditDialogOpen(true)
  }

  // Open edit dialog when editingLayoutId changes
  React.useEffect(() => {
    if (editingLayoutId && layouts.length > 0) {
      const layout = layouts.find(l => l.id === editingLayoutId)
      if (layout) {
        handleEdit(layout)
        if (onEditLayout) {
          onEditLayout() // Reset the editingLayoutId in parent
        }
      }
    }
  }, [editingLayoutId, layouts])

  const handleDelete = (layout: CustomLayout) => {
    if (confirm(`Are you sure you want to delete "${layout.name}"?`)) {
      deleteMutation.mutate(layout.id)
    }
  }

  const handleColumnToggle = (columnId: string) => {
    // Prevent unchecking required columns
    if (['watchlist', 'rank', 'name'].includes(columnId)) {
      return
    }
    setSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId)
      } else {
        return [...prev, columnId]
      }
    })
  }

  const handleSelectLayout = (layout: CustomLayout) => {
    onLayoutSelect(layout.columns)
    if (onLayoutSave) {
      onLayoutSave(`custom:${layout.id}`)
    }
  }

  // Don't return null - let parent handle visibility
  // if (!isLoggedIn) {
  //   return null
  // }

  return (
    <>
      {/* Create Custom Layout button and dialog temporarily removed */}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>Edit Custom Layout</DialogTitle>
            <DialogDescription>
              Update your custom layout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-layout-name">Layout Name</Label>
              <Input
                id="edit-layout-name"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="My Custom Layout"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Select Columns</Label>
              <ScrollArea className="h-[300px] border rounded-md p-4 mt-1">
                <div className="space-y-2">
                  {allColumns.map((col) => {
                    const isRequired = ['watchlist', 'rank', 'name'].includes(col.id)
                    const isChecked = isRequired || selectedColumns.includes(col.id)
                    return (
                      <div key={col.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-col-${col.id}`}
                          checked={isChecked}
                          disabled={isRequired}
                          onCheckedChange={() => handleColumnToggle(col.id)}
                        />
                        <label
                          htmlFor={`edit-col-${col.id}`}
                          className={`text-sm font-medium leading-none ${isRequired ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {col.label}
                          {isRequired && <span className="text-muted-foreground ml-1">(required)</span>}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Layout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

