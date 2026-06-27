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
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-[#f0f5fb] to-white">
        <div className="w-9 h-9 border-[3px] border-[#0a1f3f]/20 border-t-[#e55b2b] rounded-full animate-spin" />
        <p className="mt-3 text-sm text-[#4a6580]">Loading report builder...</p>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-[#f0f5fb] to-white pt-12">
        <div className="w-9 h-9 border-[3px] border-[#0a1f3f]/20 border-t-[#e55b2b] rounded-full animate-spin" />
        <p className="mt-3 text-sm text-[#4a6580]">Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-12 px-4 max-w-lg mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#0a1f3f]/10 text-[#0a1f3f] hover:bg-[#0a1f3f]/20 rounded-full px-4 py-2 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white border border-[#e55b2b]/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#e55b2b]/10 flex items-center justify-center">
              <span className="text-[#e55b2b] text-lg font-bold">!</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0a1f3f] mb-1">Something went wrong</h3>
              <p className="text-sm text-[#4a6580]">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 bg-[#f0f5fb] min-h-screen">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#0a1f3f]/10 text-[#0a1f3f] hover:bg-[#0a1f3f]/20 rounded-full px-4 py-2 transition-colors mb-4 mx-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </button>

      <ServiceReportBuilder
        initialCustomerId={customerId}
        workOrderId={workOrderId}
        onClose={() => router.back()}
        onSaved={() => {
          router.back();
        }}
      />
    </div>
  );
}
