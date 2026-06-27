'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui';
import { PARTS_DATABASE } from '@/lib/parts-data';
import { Users, Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateGroupPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loadDefaults, setLoadDefaults] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ name: string; group_code: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    const supabase = createClient();
    const code = groupCode.trim().toUpperCase();

    if (code.length < 3) {
      setError('Group code must be at least 3 characters.');
      setIsCreating(false);
      return;
    }

    // Check if code is already taken
    const { data: existingCode } = await supabase
      .from('organization_groups')
      .select('id')
      .eq('group_code', code)
      .single();

    if (existingCode) {
      setError('That group code is already taken. Choose a different one.');
      setIsCreating(false);
      return;
    }

    // Check if name is already taken
    const { data: existingName } = await supabase
      .from('organization_groups')
      .select('id')
      .ilike('name', groupName.trim())
      .single();

    if (existingName) {
      setError('A group with that name already exists. Choose a different name.');
      setIsCreating(false);
      return;
    }

    // Create the organization group
    const { data: group, error: groupError } = await supabase
      .from('organization_groups')
      .insert({
        name: groupName.trim(),
        group_code: code,
        owner_id: profile?.id ?? null,
      } as Record<string, unknown>)
      .select()
      .single();

    if (groupError || !group) {
      setError('Failed to create group. Please try again.');
      setIsCreating(false);
      return;
    }

    // Optionally load default parts
    if (loadDefaults) {
      const batchSize = 100;
      const partsToInsert = PARTS_DATABASE.map((p) => ({
        group_id: group.id,
        item: p.item,
        description: p.description,
        category: p.category || 'Misc',
      }));

      for (let i = 0; i < partsToInsert.length; i += batchSize) {
        const batch = partsToInsert.slice(i, i + batchSize);
        await supabase
          .from('group_stock_parts')
          .insert(batch as Record<string, unknown>[]);
      }
    }

    setCreatedGroup({ name: group.name, group_code: group.group_code, id: group.id });
    setIsCreating(false);
  };

  const copyCode = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.group_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success view
  if (createdGroup) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Group Created!</h1>
          <p className="text-gray-600 mb-6">
            <strong>{createdGroup.name}</strong> has been set up successfully.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Share this code with your team:</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-mono font-bold text-blue-700 tracking-widest">
                {createdGroup.group_code}
              </code>
              <button
                onClick={copyCode}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            New users will enter this code when they sign up to join your group.
          </p>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/admin/stock-parts')}>
              Manage Stock Parts
            </Button>
            <Button onClick={() => router.push('/admin')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Organization Group</h1>
          <p className="text-gray-600 mt-1">Set up a new team with isolated inventory</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g., ABC HVAC, Downtown Service Team"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />

          <Input
            label="Group Code"
            placeholder="e.g., ABCHVAC, TEAM1"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
            required
          />
          <p className="text-xs text-gray-500 -mt-2">
            This is what team members will type to join your group. Keep it simple and memorable.
          </p>

          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="loadDefaults"
              checked={loadDefaults}
              onChange={(e) => setLoadDefaults(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="loadDefaults" className="text-sm text-gray-700">
              Load default HVAC parts ({PARTS_DATABASE.length} parts)
            </label>
          </div>

          <p className="text-sm text-gray-500">
            Team members will use the group code to join during sign-up.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              <Users className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
