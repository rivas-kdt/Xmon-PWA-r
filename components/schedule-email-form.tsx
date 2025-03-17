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
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

interface ScheduleEmailFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ScheduleConfig {
  id?: string
  days: string[]
  time: string
  enabled: boolean
}

const DAYS = [
  { value: "monday", label: "M" },
  { value: "tuesday", label: "T" },
  { value: "wednesday", label: "W" },
  { value: "thursday", label: "T" },
  { value: "friday", label: "F" },
  { value: "saturday", label: "S" },
  { value: "sunday", label: "S" },
]

export function ScheduleEmailForm({ open, onOpenChange }: ScheduleEmailFormProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingConfig, setFetchingConfig] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    days: [],
    time: "08:00",
    enabled: true,
  })

  useEffect(() => {
    if (open) {
      fetchCurrentSchedule()
    }
  }, [open])

  const fetchCurrentSchedule = async () => {
    setFetchingConfig(true)
    try {
      const { data, error } = await supabase
        .from("email_schedule")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error, which is fine
        console.error("Error fetching schedule:", error)
        toast({
          title: "Error",
          description: "Failed to fetch current schedule",
          variant: "destructive",
        })
      }

      if (data) {
        setSchedule({
          id: data.id,
          days: data.days || [],
          time: data.time || "08:00",
          enabled: data.enabled,
        })
      }
    } catch (error) {
      console.error("Error in fetchCurrentSchedule:", error)
    } finally {
      setFetchingConfig(false)
    }
  }

  const handleDayToggle = (day: string) => {
    setSchedule((prev) => {
      const isSelected = prev.days.includes(day)
      if (isSelected) {
        return { ...prev, days: prev.days.filter((d) => d !== day) }
      } else {
        return { ...prev, days: [...prev.days, day] }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (schedule.days.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one day",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      let result
      if (schedule.id) {
        // Update existing schedule
        const { error } = await supabase
          .from("email_schedule")
          .update({
            days: schedule.days,
            time: schedule.time,
            enabled: schedule.enabled,
          })
          .eq("id", schedule.id)

        result = { success: !error, error: error?.message }
      } else {
        // Create new schedule
        const { error } = await supabase.from("email_schedule").insert({
          days: schedule.days,
          time: schedule.time,
          enabled: schedule.enabled,
        })

        result = { success: !error, error: error?.message }
      }

      if (result.success) {
        toast({
          title: "Success",
          description: "Email schedule saved successfully",
        })
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save schedule",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error saving schedule:", error)
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Inventory Emails</DialogTitle>
          <DialogDescription>
            Configure when to automatically send inventory reports to all recipients.
          </DialogDescription>
        </DialogHeader>
        {fetchingConfig ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label>Days of the Week</Label>
                <div className="flex gap-2 justify-between">
                  {DAYS.map((day) => (
                    <div key={day.value} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-md flex items-center justify-center cursor-pointer border ${
                          schedule.days.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted border-input"
                        }`}
                        onClick={() => handleDayToggle(day.value)}
                      >
                        {day.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={schedule.enabled}
                  onCheckedChange={(checked) => setSchedule((prev) => ({ ...prev, enabled: checked === true }))}
                />
                <Label htmlFor="enabled">Enable scheduled emails</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

