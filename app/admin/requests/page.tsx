import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  quoted: 'bg-purple-100 text-purple-800',
  scheduled: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const URGENCY_STYLES: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  soon: 'bg-orange-100 text-orange-800',
  routine: 'bg-green-100 text-green-800',
  question: 'bg-gray-100 text-gray-600',
};

const URGENCY_LABELS: Record<string, string> = {
  emergency: '⚠️ Emergency',
  soon: 'Soon',
  routine: 'Routine',
  question: 'Question',
};

export default async function RequestsPage() {
  const { data: requests, error } = await supabase()
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <p className="text-red-600">Error loading requests: {error.message}</p>
      </div>
    );
  }

  const all = requests || [];
  const pending = all.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {all.length} total · {pending} pending
          </p>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No service requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Urgency</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {all.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{req.name}</div>
                    <div className="text-xs text-gray-500">{req.phone || req.email || req.contact || '—'}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    {req.service_type || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {req.urgency ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_STYLES[req.urgency] || 'bg-gray-100 text-gray-600'}`}>
                        {URGENCY_LABELS[req.urgency] || req.urgency}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {req.status}
                    </span>
                    {req.quote_status && req.quote_status !== 'draft' && (
                      <span className="ml-1.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Invoice {req.quote_status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {new Date(req.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/requests/${req.id}`}
                      className="text-[#e65100] font-medium hover:underline text-xs whitespace-nowrap"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
