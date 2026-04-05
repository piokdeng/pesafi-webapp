'use client';

import { useState, useEffect } from 'react';
import { useSupabaseAuth, supabaseAuthClient } from '@/lib/supabase-auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Eye, Globe, Loader2, Key, Copy, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [settings, setSettings] = useState({
    theme: 'system',
    language: 'en',
    currency: 'KES',
    showBalance: true,
    showActivity: true,
    anonymizeAddress: false,
    anonymizeBalance: false,
    hideUsdBalance: false,
    hideLocalAmount: false,
    twoFactorEnabled: false,
    biometricsEnabled: false,
    requirePinForTransactions: true,
  });
  
  // Private key export states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportData, setExportData] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string | null;
  } | null>(null);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/user/preferences', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setFetchingSettings(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      console.log('Saving settings:', settings);
      
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        throw new Error(errorData.error || 'Failed to update settings');
      }

      // Refetch settings to ensure display matches database
      await fetchSettings();

      // Dispatch custom event to notify other components (like dashboard)
      window.dispatchEvent(new CustomEvent('preferencesUpdated'));

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPrivateKey = async () => {
    setExportLoading(true);
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/wallet/export', { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to export wallet');
      }

      const data = await response.json();
      setExportData(data);
      toast.success('Private key exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export private key');
    } finally {
      setExportLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'privateKey' | 'mnemonic') => {
    navigator.clipboard.writeText(text);
    if (type === 'privateKey') {
      setCopiedPrivateKey(true);
      setTimeout(() => setCopiedPrivateKey(false), 2000);
    } else {
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    }
    toast.success('Copied to clipboard!');
  };

  if (fetchingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-4">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences and security</p>
      </div>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Display</CardTitle>
          </div>
          <CardDescription>Customize how KermaPay looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Display Currency</Label>
            <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                <SelectItem value="SSP">SSP - South Sudanese Pound</SelectItem>
                <SelectItem value="SDG">SDG - Sudanese Pound</SelectItem>
                <SelectItem value="SOS">SOS - Somali Shilling</SelectItem>
                <SelectItem value="BIF">BIF - Burundian Franc</SelectItem>
                <SelectItem value="ERN">ERN - Eritrean Nakfa</SelectItem>
                <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                <SelectItem value="ZWL">ZWL - Zimbabwean Dollar</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Privacy</CardTitle>
          </div>
          <CardDescription>Control what information is visible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Balance</Label>
              <p className="text-sm text-muted-foreground">Display your balance on the dashboard</p>
            </div>
            <Switch
              checked={settings.showBalance}
              onCheckedChange={(checked) => setSettings({ ...settings, showBalance: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Activity</Label>
              <p className="text-sm text-muted-foreground">Display recent transactions</p>
            </div>
            <Switch
              checked={settings.showActivity}
              onCheckedChange={(checked) => setSettings({ ...settings, showActivity: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Hide Wallet Address</Label>
              <p className="text-sm text-muted-foreground">Replace wallet address with asterisks (0x****...****)</p>
            </div>
            <Switch
              checked={settings.anonymizeAddress}
              onCheckedChange={(checked) => setSettings({ ...settings, anonymizeAddress: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Hide USD Balance</Label>
              <p className="text-sm text-muted-foreground">Replace USD amount with asterisks ($****)</p>
            </div>
            <Switch
              checked={settings.hideUsdBalance}
              onCheckedChange={(checked) => setSettings({ ...settings, hideUsdBalance: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Hide Local Currency Amount</Label>
              <p className="text-sm text-muted-foreground">Replace local currency amount with asterisks (KES ****)</p>
            </div>
            <Switch
              checked={settings.hideLocalAmount}
              onCheckedChange={(checked) => setSettings({ ...settings, hideLocalAmount: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Keep your account safe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch
              checked={settings.twoFactorEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, twoFactorEnabled: checked })}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Biometric Authentication</Label>
              <p className="text-sm text-muted-foreground">Use fingerprint or face ID</p>
            </div>
            <Switch
              checked={settings.biometricsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, biometricsEnabled: checked })}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require PIN for Transactions</Label>
              <p className="text-sm text-muted-foreground">Confirm transactions with PIN</p>
            </div>
            <Switch
              checked={settings.requirePinForTransactions}
              onCheckedChange={(checked) => setSettings({ ...settings, requirePinForTransactions: checked })}
            />
          </div>
        </CardContent>
      </Card>


      <Button 
        onClick={handleSave} 
        className="w-full bg-green-600 hover:bg-green-500"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save All Settings'
        )}
      </Button>
    </div>
  );
}
