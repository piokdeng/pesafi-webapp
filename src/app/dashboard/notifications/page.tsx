'use client';

import { useState, useEffect } from 'react';
import { useSupabaseAuth, supabaseAuthClient } from '@/lib/supabase-auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
    transactionReceived: true,
    transactionSent: true,
    securityAlerts: true,
    marketingEmails: false,
    minAmountForNotification: 0,
  });

  useEffect(() => {
    fetchSettings();
    fetchNotifications();
  }, []);

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabaseAuthClient.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchSettings = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/notification-settings', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setFetchingSettings(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/notifications', { headers });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      toast.success('Notification settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        ));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/notifications/mark-all-read', {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true, readAt: new Date() })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <MessageSquare className="h-5 w-5 text-emerald-500" />;
      case 'security':
        return <Bell className="h-5 w-5 text-red-600" />;
      case 'system':
        return <Bell className="h-5 w-5 text-zinc-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  if (fetchingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Your latest activity and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No notifications yet</p>
              <p className="text-sm mt-1">You'll see updates here when they arrive</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    notification.isRead ? 'bg-background' : 'bg-green-50'
                  }`}
                >
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="bg-green-600 text-white text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Channels */}
          <div className="space-y-4">
            <h4 className="font-medium">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via text message</p>
              </div>
              <Switch
                checked={settings.smsEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, smsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, emailEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, pushEnabled: checked })}
              />
            </div>
          </div>

          {/* Event Types */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Event Notifications</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Money Received</Label>
                <p className="text-sm text-muted-foreground">When you receive a payment</p>
              </div>
              <Switch
                checked={settings.transactionReceived}
                onCheckedChange={(checked) => setSettings({ ...settings, transactionReceived: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Money Sent</Label>
                <p className="text-sm text-muted-foreground">When you send a payment</p>
              </div>
              <Switch
                checked={settings.transactionSent}
                onCheckedChange={(checked) => setSettings({ ...settings, transactionSent: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Security Alerts</Label>
                <p className="text-sm text-muted-foreground">Important security updates</p>
              </div>
              <Switch
                checked={settings.securityAlerts}
                onCheckedChange={(checked) => setSettings({ ...settings, securityAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Updates and promotions</p>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSaveSettings} 
        className="w-full bg-green-600 hover:bg-green-500"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Notification Settings'
        )}
      </Button>
    </div>
  );
}
