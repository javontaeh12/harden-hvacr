'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with canvas/complex components
const ServiceReportBuilder = dynamic(
  () =>
    import('@/components/ServiceReportBuilder').then((mod) => ({
      default: mod.ServiceReportBuilder,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function MobileReportPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = use(params);
  const router = useRouter();
  const { groupId } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const fetchWorkOrder = async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('work_orders')
        .select('customer_id')
        .eq('id', workOrderId)
        .eq('group_id', groupId)
        .single();

      if (fetchError || !data) {
        setError('Work order not found');
        setLoading(false);
        return;
      }

      setCustomerId(data.customer_id || null);
      setLoading(false);
    };

    fetchWorkOrder();
  }, [workOrderId, groupId]);

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-12 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-600 mb-4 px-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </button>

      <ServiceReportBuilder
        initialCustomerId={customerId}
        onClose={() => router.back()}
        onSaved={() => {
          // Could show a toast or navigate back; for now just go back to job detail
          router.back();
        }}
      />
    </div>
  );
}
