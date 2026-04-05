'use client';

import { useState, useEffect } from 'react';
import { useSupabaseAuth, supabaseAuthClient } from '@/lib/supabase-auth-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Phone, Camera, Loader2, Wallet, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    image: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchWalletAddress();
    }
  }, [user]);

  const fetchProfile = async () => {
    setFetchingProfile(true);
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/user/profile', { headers });
      if (response.ok) {
        const data = await response.json();
        setForm({
          name: data.name || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          image: data.image || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const fetchWalletAddress = async () => {
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/${user?.id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWalletAddress(data.address || '');
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 800x800, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with quality reduction (0.7 = 70% quality)
          const base64String = canvas.toDataURL('image/jpeg', 0.7);
          
          // Check final size (base64 string length roughly equals byte size)
          const sizeInBytes = base64String.length * 0.75; // Approximate
          const sizeInMB = sizeInBytes / (1024 * 1024);
          
          if (sizeInMB > 3) {
            // Try with lower quality if still too large
            const lowerQuality = canvas.toDataURL('image/jpeg', 0.5);
            resolve(lowerQuality);
          } else {
            resolve(base64String);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingPhoto(true);
    
    try {
      // Compress image before upload
      const base64String = await compressImage(file);
      
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/user/profile/photo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64String }),
      });

      if (response.status === 413) {
        throw new Error('Image is too large. Please try a smaller image.');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to upload photo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON (like 413), use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setForm({ ...form, image: data.image });
      toast.success('Profile photo updated! Avatar is now stored securely.');
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Refetch profile to show updated data
      await fetchProfile();
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (form.name) {
      return form.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  if (fetchingProfile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-4">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-32 w-32 ring-2 ring-green-500/20">
              {form.image && <AvatarImage src={form.image} alt="Profile" className="object-cover brightness-110" />}
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-orange-500 text-white font-semibold text-4xl">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Images auto-compressed (JPG, PNG, GIF)</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-10"
                  required
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254712345678"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {walletAddress && (
              <div className="space-y-2">
                <Label htmlFor="wallet">Wallet Address</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="wallet"
                      value={walletAddress}
                      readOnly
                      className="pl-10 font-mono text-sm"
                      disabled
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyAddress}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your unique wallet address on Base network
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-500"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
