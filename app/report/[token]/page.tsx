import { createClient } from '@supabase/supabase-js';
import { ServiceReportPreview } from '@/components/ServiceReportPreview';
import { FileX } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getReport(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: report } = await supabase
    .from('service_reports')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!report) return null;

  const { data: media } = await supabase
    .from('service_report_media')
    .select('*')
    .eq('service_report_id', report.id)
    .order('sort_order');

  // Get group name for branding
  let groupName = 'HVAC Service';
  if (report.group_id) {
    const { data: group } = await supabase
      .from('organization_groups')
      .select('name')
      .eq('id', report.group_id)
      .single();
    if (group) groupName = group.name;
  }

  return { report, media: media || [], groupName };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getReport(token);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f5fb] px-4">
        <div className="bg-white rounded-xl shadow-lg border border-[#c8d8ea] p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e55b2b]/10 mb-5">
            <FileX className="w-8 h-8 text-[#e55b2b]" />
          </div>
          <h1 className="text-xl font-bold text-[#0a1f3f] mb-2">Report Not Found</h1>
          <p className="text-sm text-[#4a6580]">This report link may be invalid or has expired. Please contact your service provider for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f5fb] py-6 sm:py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <ServiceReportPreview
          report={result.report}
          media={result.media}
          groupName={result.groupName}
          showActions={true}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-blue-600, .print\\:bg-navy { background-color: #0a1f3f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
