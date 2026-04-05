'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Mail, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessTeamPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [newMember, setNewMember] = useState({
    email: '',
    full_name: '',
    role: 'viewer',
    can_send_money: false,
    can_receive_money: true,
    can_view_transactions: true,
    can_manage_team: false,
    can_edit_settings: false,
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/business/team', {
        credentials: 'include' // Ensure cookies are sent
      });
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members || []);
      } else if (response.status === 404) {
        // Business profile not found - this is expected for new accounts
        console.log('Business profile not found - showing empty state');
        setMembers([]);
      } else {
        // Log errors for debugging but don't show toast for empty/new accounts
        console.error('Error loading contacts:', {
          status: response.status,
          error: data.error
        });
        // Only show error if it's a real server error, not auth or empty data
        if (response.status >= 500) {
          toast.error('Failed to load contacts');
        }
      }
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.email) {
      toast.error('Email is required');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch('/api/business/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify(newMember),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Contact added successfully');
        setDialogOpen(false);
        setNewMember({
          email: '',
          full_name: '',
          role: 'viewer',
          can_send_money: false,
          can_receive_money: true,
          can_view_transactions: true,
          can_manage_team: false,
          can_edit_settings: false,
        });
        loadMembers();
      } else {
        toast.error(data.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/business/team?id=${memberId}`, {
        method: 'DELETE',
        credentials: 'include', // Ensure cookies are sent
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Contact removed successfully');
        loadMembers();
      } else {
        toast.error(data.error || 'Failed to remove contact');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove contact');
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: 'default',
      admin: 'secondary',
      manager: 'outline',
      accountant: 'outline',
      viewer: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      invited: 'secondary',
      inactive: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business contacts and permissions
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>
                Add a new contact to your business
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                    placeholder="member@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={newMember.full_name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, full_name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_send_money"
                    checked={newMember.can_send_money}
                    onCheckedChange={(checked) =>
                      setNewMember({ ...newMember, can_send_money: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_send_money" className="font-normal cursor-pointer">
                    Can send money
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_receive_money"
                    checked={newMember.can_receive_money}
                    onCheckedChange={(checked) =>
                      setNewMember({ ...newMember, can_receive_money: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_receive_money" className="font-normal cursor-pointer">
                    Can receive money
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_view_transactions"
                    checked={newMember.can_view_transactions}
                    onCheckedChange={(checked) =>
                      setNewMember({ ...newMember, can_view_transactions: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_view_transactions" className="font-normal cursor-pointer">
                    Can view transactions
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_manage_team"
                    checked={newMember.can_manage_team}
                    onCheckedChange={(checked) =>
                      setNewMember({ ...newMember, can_manage_team: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_manage_team" className="font-normal cursor-pointer">
                    Can manage team
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_edit_settings"
                    checked={newMember.can_edit_settings}
                    onCheckedChange={(checked) =>
                      setNewMember({ ...newMember, can_edit_settings: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_edit_settings" className="font-normal cursor-pointer">
                    Can edit settings
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={adding || !newMember.email}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Business Contacts</CardTitle>
          <CardDescription>
            {members.length} contact{members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No contacts yet</p>
              <p className="text-sm mt-2">Click "Add Contact" to add your business contacts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-orange-500 flex items-center justify-center text-white font-semibold">
                      {member.full_name
                        ? member.full_name.charAt(0).toUpperCase()
                        : member.email.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.full_name || member.email}
                        </p>
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {member.can_send_money && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Send
                          </Badge>
                        )}
                        {member.can_manage_team && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Manage Team
                          </Badge>
                        )}
                        {member.can_edit_settings && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Edit Settings
                          </Badge>
                        )}
                      </div>
                    </div>

                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveMember(member.id, member.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
