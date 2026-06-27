import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

interface ExportItem {
  name: string;
  part_number: string | null;
  quantity: number;
  quantity_needed: number;
  vendor: string | null;
  cost: number | null;
  van_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json() as { items: ExportItem[] };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Low Stock Order');

    // Title row
    worksheet.addRow(['Low Stock Order - ' + new Date().toLocaleDateString()]);
    worksheet.addRow([]);

    // Header row
    const headerRow = worksheet.addRow(['Item', 'Part Number', 'Current Qty', 'Qty Needed', 'Vendor', 'Unit Cost', 'Est. Total', 'Van']);
    headerRow.font = { bold: true };

    // Data rows
    items.forEach((item) => {
      worksheet.addRow([
        item.name,
        item.part_number || '',
        item.quantity,
        item.quantity_needed,
        item.vendor || '',
        item.cost ? `$${item.cost.toFixed(2)}` : '',
        item.cost ? `$${(item.cost * item.quantity_needed).toFixed(2)}` : '',
        item.van_name,
      ]);
    });

    // Totals row
    worksheet.addRow([]);
    worksheet.addRow([
      '',
      '',
      '',
      items.reduce((sum, i) => sum + i.quantity_needed, 0),
      '',
      '',
      `$${items.reduce((sum, i) => sum + (i.cost || 0) * i.quantity_needed, 0).toFixed(2)}`,
      '',
    ]);

    // Set column widths
    worksheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="low-stock-order-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
