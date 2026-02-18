import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, saveSettings } from "../api";
import type { Settings } from "../api";
import { Loader2 } from "lucide-react";

export function SettingsForm() {
    const [settings, setSettings] = useState<Settings>({
        smtp_server: "",
        smtp_port: 587,
        smtp_user: "",
        smtp_password: "",
        default_email: ""
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveSettings(settings);
            setStatus("Settings saved successfully.");
        } catch (e) {
            setStatus("Failed to save settings.");
            console.error(e);
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(""), 3000);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure SMTP settings for email alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtp_server">SMTP Server</Label>
                        <Input
                            id="smtp_server"
                            value={settings.smtp_server}
                            onChange={(e) => setSettings({ ...settings, smtp_server: e.target.value })}
                            placeholder="smtp.gmail.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtp_port">Port</Label>
                        <Input
                            id="smtp_port"
                            type="number"
                            value={settings.smtp_port}
                            onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                            placeholder="587"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtp_user">SMTP User</Label>
                        <Input
                            id="smtp_user"
                            value={settings.smtp_user}
                            onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                            placeholder="user@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtp_password">SMTP Password</Label>
                        <Input
                            id="smtp_password"
                            type="password"
                            value={settings.smtp_password}
                            onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                            placeholder="********"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="default_email">Default Alert Recipient</Label>
                    <Input
                        id="default_email"
                        value={settings.default_email}
                        onChange={(e) => setSettings({ ...settings, default_email: e.target.value })}
                        placeholder="myemail@example.com"
                    />
                </div>

                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-green-600 font-medium">{status}</span>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
