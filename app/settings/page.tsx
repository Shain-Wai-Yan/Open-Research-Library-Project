"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 lg:ml-64">
        <Header />

        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Settings</h1>
              <p className="text-sm md:text-base text-muted-foreground">Configure your research environment</p>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Backend Configuration</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Base URL</Label>
                    <Input placeholder="http://localhost:5000" defaultValue={process.env.NEXT_PUBLIC_API_URL} />
                    <p className="text-xs text-muted-foreground">Point this to your Python backend engines</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>API Key (if required)</Label>
                    <Input type="password" placeholder="Your backend API key" />
                  </div>

                  <Button>Save Configuration</Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Research Interests</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Field</Label>
                    <Input placeholder="e.g., Marketing, Computer Science" />
                  </div>

                  <div className="space-y-2">
                    <Label>Keywords</Label>
                    <Input placeholder="e.g., AI, Customer Experience, CRM" />
                  </div>

                  <Button>Update Profile</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
