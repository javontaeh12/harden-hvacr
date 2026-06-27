'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import { Profile, Van } from '@/types';
import { formatDate } from '@/lib/utils';
import { Check, X, Users, Clock, UserCheck, UserX, Search, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const { profile, groupId, group } = useAuth();
  const isDeveloper = profile?.email === 'javontaedharden@gmail.com';
  const [users, setUsers] = useState<Profile[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!groupId) return;
    const supabase = createClient();

    const [usersResult, vansResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
      supabase.from('vans').select('*').eq('group_id', groupId).order('name'),
    ]);

    setUsers(usersResult.data || []);
    setVans(vansResult.data || []);
    setIsLoading(false);
  };

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    setProcessingIds((prev) => new Set([...prev, userId]));

    const response = await fetch('/api/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });

    if (response.ok) {
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, status: action === 'approve' ? 'approved' : 'rejected' } : u
        )
      );
    }

    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'manager' | 'tech') => {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);

    if (!error) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
    }
  };

  const handleVanAssignment = async (userId: string, vanId: string | null) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ van_id: vanId })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, van_id: vanId } : u)));
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if (!window.confirm(`Are you sure you want to delete ${userName || 'this user'}? This cannot be undone.`)) {
      return;
    }

    setProcessingIds((prev) => new Set([...prev, userId]));

    const response = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      setUsers(users.filter((u) => u.id !== userId));
    }

    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  });

  const pendingUsers = filteredUsers.filter((u) => u.status === 'pending');
  const approvedUsers = filteredUsers.filter((u) => u.status === 'approved');
  const rejectedUsers = filteredUsers.filter((u) => u.status === 'rejected');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">
          {group ? `${group.name} — ` : ''}Manage user access and roles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{pendingUsers.length}</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{approvedUsers.length}</p>
              </div>
              <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{rejectedUsers.length}</p>
              </div>
              <UserX className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pending Requests */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Requests ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Requested {formatDate(user.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      disabled={processingIds.has(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproval(user.id, 'reject')}
                      disabled={processingIds.has(user.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproval(user.id, 'approve')}
                      disabled={processingIds.has(user.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Team Members ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No approved users yet</p>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {approvedUsers.map((user) => (
                  <div key={user.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                        disabled={processingIds.has(user.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Role</p>
                        {isDeveloper ? (
                          <Select
                            options={[
                              { value: 'tech', label: 'Technician' },
                              { value: 'manager', label: 'Manager' },
                              { value: 'admin', label: 'Admin' },
                            ]}
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as 'admin' | 'manager' | 'tech')
                            }
                            className="w-full text-sm"
                          />
                        ) : (
                          <span className="capitalize text-sm text-gray-700">{user.role === 'tech' ? 'Technician' : user.role}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Van</p>
                        <Select
                          options={[
                            { value: '', label: 'None' },
                            ...vans.map((v) => ({ value: v.id, label: v.name })),
                          ]}
                          value={user.van_id || ''}
                          onChange={(e) =>
                            handleVanAssignment(user.id, e.target.value || null)
                          }
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Joined {formatDate(user.created_at)}</p>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Assigned Van</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {approvedUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="py-3 font-medium text-gray-900">{user.full_name}</td>
                        <td className="py-3 text-gray-600">{user.email}</td>
                        <td className="py-3">
                          {isDeveloper ? (
                            <Select
                              options={[
                                { value: 'tech', label: 'Technician' },
                                { value: 'manager', label: 'Manager' },
                                { value: 'admin', label: 'Admin' },
                              ]}
                              value={user.role}
                              onChange={(e) =>
                                handleRoleChange(user.id, e.target.value as 'admin' | 'manager' | 'tech')
                              }
                              className="w-36"
                            />
                          ) : (
                            <span className="capitalize text-gray-700">{user.role === 'tech' ? 'Technician' : user.role}</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Select
                            options={[
                              { value: '', label: 'None' },
                              ...vans.map((v) => ({ value: v.id, label: v.name })),
                            ]}
                            value={user.van_id || ''}
                            onChange={(e) =>
                              handleVanAssignment(user.id, e.target.value || null)
                            }
                            className="w-32"
                          />
                        </td>
                        <td className="py-3 text-gray-600">{formatDate(user.created_at)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            disabled={processingIds.has(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rejected Users */}
      {rejectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              Rejected Users ({rejectedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rejectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Rejected {formatDate(user.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      disabled={processingIds.has(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproval(user.id, 'approve')}
                      disabled={processingIds.has(user.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
