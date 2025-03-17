"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addRecipient } from "@/lib/actions"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"
import { Loader2, X } from "lucide-react"

interface Recipient {
  id: string
  email: string
  created_at?: string
}

interface AddRecipientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipientForm({ open, onOpenChange }: AddRecipientFormProps) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [fetchingRecipients, setFetchingRecipients] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch recipients when the dialog opens
  useEffect(() => {
    if (open) {
      fetchRecipients()
    }
  }, [open])

  const fetchRecipients = async () => {
    setFetchingRecipients(true)
    try {
      const { data, error } = await supabase.from("recipients").select("*").order("email", { ascending: true })

      if (error) throw error
      setRecipients(data || [])
    } catch (error) {
      console.error("Error fetching recipients:", error)
      toast({
        title: "Error",
        description: "Failed to fetch recipients",
        variant: "destructive",
      })
    } finally {
      setFetchingRecipients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("email", email)

      const result = await addRecipient(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Email recipient added successfully",
        })
        resetForm()
        // Refresh the recipients list
        fetchRecipients()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add recipient",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding recipient:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteRecipient = async (id: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from("recipients").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Recipient deleted successfully",
      })

      // Update the local state to remove the deleted recipient
      setRecipients(recipients.filter((r) => r.id !== id))
    } catch (error) {
      console.error("Error deleting recipient:", error)
      toast({
        title: "Error",
        description: "Failed to delete recipient",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setEmail("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Email Recipients</DialogTitle>
          <DialogDescription>Add or remove email recipients for inventory notifications.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Recipient"
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Recipients List */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Current Recipients</h3>

          {fetchingRecipients ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipients found. Add your first recipient above.
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted"
                >
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRecipient(recipient.id)}
                      disabled={deletingId === recipient.id}
                    >
                      {deletingId === recipient.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                    <span className="ml-2">{recipient.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

