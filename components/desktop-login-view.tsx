"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, User } from "lucide-react"
import { jwtDecode } from "jwt-decode"

// Import the ThemeToggle component at the top of the file
import { ThemeToggle } from "@/components/theme-toggle"

export default function DesktopLoginView() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Login failed.")
      }

      const { token } = await res.json()

      // Decode the token to check the user's role
      const decoded = jwtDecode<{ role: string }>(token)

      if (decoded.role !== "admin") {
        throw new Error("You don't have permission to access the desktop dashboard. Please use the mobile app.")
      }

      // If role is admin, store token and redirect
      localStorage.setItem("token", token)
      router.push("/dashboard-desktop")
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-5xl flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-2xl">
        {/* Left side - Brand/Logo */}
        <div className="w-full md:w-1/2 bg-primary p-12 flex flex-col items-center justify-center text-white">
          <div className="mb-8 text-center">
            <div className="relative">
              <div className="text-8xl font-bold tracking-tighter">
                <span className="text-white">X</span>
                <span className="text-white/80">Mon</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-white text-primary text-xs px-2 py-1 rounded-full font-bold">
                KDT
              </div>
            </div>
            <p className="mt-4 text-white/80 text-lg">External Warehouse Monitoring</p>
          </div>
          <div className="space-y-4 text-center">
            <p className="text-white/70">Manage your inventory with ease</p>
            <p className="text-white/70">Track items across warehouses</p>
            <p className="text-white/70">Real-time updates and notifications</p>
          </div>
        </div>

        {/* Right side - Login Form */}
        <Card className="w-full md:w-1/2 border-0 rounded-none shadow-none">
          <CardHeader className="space-y-1 pt-12 relative">
            <div className="absolute top-4 right-4">
              <ThemeToggle />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-xs text-center text-muted-foreground mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

