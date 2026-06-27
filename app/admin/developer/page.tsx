'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import { Code, Key, Globe, ExternalLink, Users, Trash2, Search, Truck } from 'lucide-react';
import { Profile } from '@/types';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Code;
  status: 'connected' | 'disconnected';
  details?: string;
}

interface ProfileWithGroup extends Profile {
  groups: { name: string } | null;
}

interface VanInfo {
  id: string;
  name: string;
  van_number: string;
  group_id: string;
}

interface GroupInfo {
  id: string;
  name: string;
  group_code: string;
}

const integrations: Integration[] = [
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    description: 'Authentication provider for user sign-in',
    icon: Globe,
    status: 'connected',
    details: 'Configured via Supabase Auth',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database, auth, and storage backend',
    icon: Key,
    status: 'connected',
    details: 'Project: PrintWebsite',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered helper for technicians',
    icon: Code,
    status: 'connected',
    details: 'Used by AI Helper feature',
  },
  {
    id: 'gmail',
    name: 'Gmail SMTP',
    description: 'Email notifications for admin alerts',
    icon: Globe,
    status: 'connected',
    details: 'Via Nodemailer with App Password',
  },
];

export default function DeveloperPage() {
  const [allUsers, setAllUsers] = useState<ProfileWithGroup[]>([]);
  const [allVans, setAllVans] = useState<VanInfo[]>([]);
  const [allGroups, setAllGroups] = useState<GroupInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    const response = await fetch('/api/users/list-all');
    if (response.ok) {
      const data = await response.json();
      setAllUsers(data.users || []);
      setAllVans(data.vans || []);
      setAllGroups(data.groups || []);
    }
    setUsersLoading(false);
  };

  const handleUpdateUser = async (userId: string, updates: Record<string, unknown>) => {
    const response = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates }),
    });

    if (response.ok) {
      setAllUsers(allUsers.map((u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, ...updates };
        // If group changed, update the nested group name and clear van
        if ('group_id' in updates) {
          const newGroup = allGroups.find((g) => g.id === updates.group_id);
          updated.groups = newGroup ? { name: newGroup.name } : null;
          if (u.group_id !== updates.group_id) {
            updated.van_id = null;
          }
        }
        return updated as ProfileWithGroup;
      }));
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if (!window.confirm(`Are you sure you want to delete ${userName || 'this user'}? This cannot be undone.`)) {
      return;
    }

    setDeletingIds((prev) => new Set([...prev, userId]));

    const response = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, force: true }),
    });

    if (response.ok) {
      setAllUsers(allUsers.filter((u) => u.id !== userId));
    }

    setDeletingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  // Get vans for a specific user's group
  const getVansForUser = (user: ProfileWithGroup) => {
    if (!user.group_id) return [];
    return allVans.filter((v) => v.group_id === user.group_id);
  };

  const handleDeleteVan = async (vanId: string, vanName: string) => {
    if (!window.confirm(`Delete ${vanName}? This will remove all inventory for this van and unassign any techs. This cannot be undone.`)) {
      return;
    }

    setDeletingIds((prev) => new Set([...prev, vanId]));

    const response = await fetch('/api/vans/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vanId }),
    });

    if (response.ok) {
      setAllVans(allVans.filter((v) => v.id !== vanId));
      // Clear van_id from any users that had this van
      setAllUsers(allUsers.map((u) => u.van_id === vanId ? { ...u, van_id: null } : u));
    }

    setDeletingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(vanId);
      return newSet;
    });
  };

  const filteredAllUsers = allUsers.filter((u) => {
    if (!userSearch) return true;
    const query = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.groups?.name?.toLowerCase().includes(query)
    );
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const envVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', masked: true },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', masked: true },
    { key: 'OPENAI_API_KEY', masked: true },
    { key: 'GMAIL_APP_PASSWORD', masked: true },
    { key: 'ADMIN_EMAIL', masked: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Developer Integrations</h1>
        <p className="text-gray-600 mt-1">Manage API integrations and service connections</p>
      </div>

      {/* User Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            User Accounts ({allUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or group..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {usersLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : filteredAllUsers.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No users found</p>
          ) : (
            <div className="space-y-3">
              {filteredAllUsers.map((user) => {
                const userVans = getVansForUser(user);
                return (
                  <div key={user.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.full_name || '—'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                        disabled={deletingIds.has(user.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Group</p>
                        <Select
                          options={[
                            { value: '', label: 'No group' },
                            ...allGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.group_code})` })),
                          ]}
                          value={user.group_id || ''}
                          onChange={(e) => handleUpdateUser(user.id, { group_id: e.target.value || null })}
                          className="w-full text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Role</p>
                        <Select
                          options={[
                            { value: 'tech', label: 'Technician' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' },
                          ]}
                          value={user.role}
                          onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                          className="w-full text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <Select
                          options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                          ]}
                          value={user.status}
                          onChange={(e) => handleUpdateUser(user.id, { status: e.target.value })}
                          className="w-full text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Van</p>
                        {userVans.length > 0 ? (
                          <Select
                            options={[
                              { value: '', label: 'None' },
                              ...userVans.map((v) => ({ value: v.id, label: `Van ${v.van_number || v.name}` })),
                            ]}
                            value={user.van_id || ''}
                            onChange={(e) => handleUpdateUser(user.id, { van_id: e.target.value || null })}
                            className="w-full text-sm"
                          />
                        ) : (
                          <p className="text-xs text-gray-400 py-1.5">No vans</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-500" />
            Vans ({allVans.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allVans.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No vans found</p>
          ) : (
            <div className="space-y-2">
              {allVans.map((van) => {
                const group = allGroups.find((g) => g.id === van.group_id);
                const assignedUsers = allUsers.filter((u) => u.van_id === van.id);
                return (
                  <div key={van.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">Van {van.van_number || van.name}</p>
                      <p className="text-xs text-gray-400">{group?.name || 'No group'}</p>
                      {assignedUsers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Assigned: {assignedUsers.map((u) => u.full_name || u.email).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteVan(van.id, `Van ${van.van_number || van.name}`)}
                      disabled={deletingIds.has(van.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <integration.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    integration.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integration.status === 'connected' ? 'Connected' : 'Not configured'}
                </span>
              </div>
              {integration.details && (
                <p className="text-xs text-gray-400 mt-3">{integration.details}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {envVars.map((envVar) => (
              <div
                key={envVar.key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <code className="text-sm font-mono text-gray-700">{envVar.key}</code>
                <span className="text-sm text-gray-400 font-mono">{'••••••••'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Environment variables are configured in <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code> and cannot be viewed here for security.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              Supabase Dashboard
            </a>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              Google Cloud Console
            </a>
            <a
              href="https://platform.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              OpenAI Platform
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
