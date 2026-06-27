'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Modal } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { QUOTE_STATUS, getStatusConfig } from '@/lib/status';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Send,
  FileText,
} from 'lucide-react';

interface QuoteLineItem {
  description: string;
  type: 'part' | 'labor' | 'flat_fee';
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quote {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  status: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  default_items: QuoteLineItem[];
}

interface CustomerOption {
  id: string;
  full_name: string;
}

const TAX_RATE = 0.08; // 8% tax

export default function QuotesPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Builder state
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [builderCustomer, setBuilderCustomer] = useState('');
  const [builderItems, setBuilderItems] = useState<QuoteLineItem[]>([]);
  const [builderDiscount, setBuilderDiscount] = useState(0);
  const [builderValidUntil, setBuilderValidUntil] = useState('');
  const [builderNotes, setBuilderNotes] = useState('');
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [quotesRes, templatesRes, customersRes] = await Promise.all([
      supabase.from('quotes').select('*, customers(full_name)').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('quote_templates').select('*').eq('group_id', groupId!),
      supabase.from('customers').select('id, full_name').eq('group_id', groupId!).order('full_name'),
    ]);
    setQuotes(quotesRes.data || []);
    setTemplates(templatesRes.data || []);
    setCustomers(customersRes.data || []);
    setIsLoading(false);
  };

  const openBuilder = (quote?: Quote) => {
    if (quote) {
      setBuilderId(quote.id);
      setBuilderCustomer(quote.customer_id || '');
      setBuilderItems(quote.line_items || []);
      setBuilderDiscount(quote.discount || 0);
      setBuilderValidUntil(quote.valid_until || '');
      setBuilderNotes(quote.notes || '');
    } else {
      setBuilderId(null);
      setBuilderCustomer('');
      setBuilderItems([{ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
      setBuilderDiscount(0);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      setBuilderValidUntil(thirtyDays.toISOString().split('T')[0]);
      setBuilderNotes('');
    }
    setIsBuilderOpen(true);
  };

  const loadTemplate = (template: QuoteTemplate) => {
    setBuilderItems(template.default_items.length ? template.default_items : [{ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
    setIsTemplateOpen(false);
  };

  const addLineItem = () => {
    setBuilderItems([...builderItems, { description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const items = [...builderItems];
    (items[index] as unknown as Record<string, unknown>)[field] = value;
    items[index].total = items[index].quantity * items[index].unit_price;
    setBuilderItems(items);
  };

  const removeLineItem = (index: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  const subtotal = builderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax - builderDiscount;

  const saveQuote = async (sendAfterSave = false) => {
    if (!groupId) return;
    const supabase = createClient();
    const items = builderItems.map((item) => ({ ...item, total: item.quantity * item.unit_price }));
    const payload = {
      customer_id: builderCustomer || null,
      line_items: items,
      subtotal,
      tax,
      discount: builderDiscount,
      total,
      valid_until: builderValidUntil || null,
      notes: builderNotes || null,
      status: sendAfterSave ? 'sent' : 'draft',
      group_id: groupId,
      created_by: profile?.id,
    };

    try {
      if (builderId) {
        const { data, error } = await supabase.from('quotes').update(payload).eq('id', builderId).select('*, customers(full_name)').single();
        if (error) throw error;
        if (data) setQuotes((prev) => prev.map((q) => q.id === data.id ? data : q));
        toast.success(sendAfterSave ? 'Quote sent' : 'Quote updated', `Quote for ${formatCurrency(total)} has been ${sendAfterSave ? 'sent' : 'updated'}`);
      } else {
        const { data, error } = await supabase.from('quotes').insert(payload as Record<string, unknown>).select('*, customers(full_name)').single();
        if (error) throw error;
        if (data) setQuotes([data, ...quotes]);
        toast.success(sendAfterSave ? 'Quote created & sent' : 'Quote created', `Quote for ${formatCurrency(total)} has been ${sendAfterSave ? 'created and sent' : 'saved as draft'}`);
      }
      setIsBuilderOpen(false);
    } catch (err) {
      console.error('Failed to save quote:', err);
      toast.error('Failed to save quote', 'Please try again');
    }
  };

  const updateQuoteStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('quotes').update({ status }).eq('id', id).select('*, customers(full_name)').single();
      if (error) throw error;
      if (data) {
        setQuotes((prev) => prev.map((q) => q.id === data.id ? data : q));
        if (selectedQuote?.id === id) setSelectedQuote(data);
        const statusConf = getStatusConfig('quote', status);
        toast.success(`Quote ${statusConf.label.toLowerCase()}`, `Quote has been marked as ${statusConf.label.toLowerCase()}`);
      }
    } catch (err) {
      console.error('Failed to update quote status:', err);
      toast.error('Failed to update quote', 'Please try again');
    }
  };

  const saveAsTemplate = async () => {
    if (!groupId || !newTemplateName.trim()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('quote_templates').insert({
        name: newTemplateName,
        default_items: builderItems,
        group_id: groupId,
      } as Record<string, unknown>).select().single();
      if (error) throw error;
      if (data) {
        setTemplates([...templates, data]);
        setNewTemplateName('');
        toast.success('Template saved', `"${newTemplateName}" has been saved as a template`);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error('Failed to save template', 'Please try again');
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setSelectedQuote(null);
      toast.success('Quote deleted', 'Quote has been removed');
    } catch (err) {
      console.error('Failed to delete quote:', err);
      toast.error('Failed to delete quote', 'Please try again');
    }
  };

  const filtered = quotes.filter((q) => {
    if (statusFilter && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return q.customers?.full_name?.toLowerCase().includes(s) || q.notes?.toLowerCase().includes(s);
    }
    return true;
  });

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-[#dceaf8]/50 rounded w-48" /><div className="h-64 bg-[#dceaf8]/50 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Quotes</h1>
          <p className="text-[#4a6580] mt-1">Create and manage service quotes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>Templates</Button>
          <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" /> New Quote
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(QUOTE_STATUS).map(([key, conf]) => {
          const count = quotes.filter((q) => q.status === key).length;
          return (
            <div
              key={key}
              className={`bg-white rounded-xl border cursor-pointer p-4 ${statusFilter === key ? 'border-[#e55b2b] ring-2 ring-[#e55b2b]/20' : 'border-[#c8d8ea]'}`}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            >
              <p className="text-xs font-medium text-[#4a6580]">{conf.label}</p>
              <p className="text-xl font-bold text-[#0a1f3f]">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
        <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-xl border border-[#c8d8ea]">
        <div className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-7 h-7" />}
              title="No quotes found"
              description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first quote to get started'}
              action={
                !search && !statusFilter ? (
                  <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => openBuilder()}>
                    <Plus className="w-4 h-4 mr-2" /> New Quote
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-[#c8d8ea]">
              {filtered.map((q) => {
                const conf = getStatusConfig('quote', q.status);
                return (
                  <div key={q.id} className="p-4 hover:bg-[#0a1f3f]/5 cursor-pointer flex items-center justify-between" onClick={() => setSelectedQuote(q)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conf.variant}>{conf.label}</Badge>
                        <span className="text-sm font-medium text-[#0a1f3f]">{q.customers?.full_name || 'No customer'}</span>
                      </div>
                      <p className="text-sm text-[#4a6580] mt-0.5">{q.line_items?.length || 0} items &middot; {formatDate(q.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0a1f3f]">{formatCurrency(q.total)}</p>
                      {q.valid_until && <p className="text-xs text-[#4a6580]">Valid until {formatDate(q.valid_until)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quote Builder Modal */}
      <Modal isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} title={builderId ? 'Edit Quote' : 'New Quote'} className="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Customer</label>
              <select value={builderCustomer} onChange={(e) => setBuilderCustomer(e.target.value)} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <Input label="Valid Until" type="date" value={builderValidUntil} onChange={(e) => setBuilderValidUntil(e.target.value)} />
          </div>

          {/* Templates quick load */}
          {templates.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-[#4a6580] py-1">Templates:</span>
              {templates.map((t) => (
                <button key={t.id} onClick={() => loadTemplate(t)} className="px-3 py-1 rounded-full text-xs font-medium border border-[#c8d8ea] hover:bg-[#e55b2b]/5 hover:border-[#e55b2b]/30 text-[#0a1f3f]">{t.name}</button>
              ))}
            </div>
          )}

          {/* Line Items */}
          <div>
            <h4 className="text-sm font-semibold text-[#0a1f3f] mb-2">Line Items</h4>
            <div className="space-y-2">
              {builderItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && <label className="text-xs text-[#4a6580]">Description</label>}
                    <Input value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="text-xs text-[#4a6580]">Type</label>}
                    <select value={item.type} onChange={(e) => updateLineItem(i, 'type', e.target.value)} className="w-full border border-[#c8d8ea] rounded-lg px-2 py-2 text-sm">
                      <option value="part">Part</option>
                      <option value="labor">Labor</option>
                      <option value="flat_fee">Flat Fee</option>
                    </select>
                  </div>
                  <div className="w-16">
                    {i === 0 && <label className="text-xs text-[#4a6580]">Qty</label>}
                    <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="text-xs text-[#4a6580]">Unit $</label>}
                    <Input type="number" value={item.unit_price} onChange={(e) => updateLineItem(i, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="w-20 text-right">
                    {i === 0 && <label className="text-xs text-[#4a6580]">Total</label>}
                    <p className="py-2 text-sm font-medium text-[#0a1f3f]">{formatCurrency(item.quantity * item.unit_price)}</p>
                  </div>
                  <button onClick={() => removeLineItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addLineItem} className="mt-2 text-sm"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
          </div>

          {/* Totals */}
          <div className="border-t border-[#c8d8ea] pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[#4a6580]">Subtotal</span><span className="text-[#0a1f3f]">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#4a6580]">Tax (8%)</span><span className="text-[#0a1f3f]">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-[#4a6580]">Discount</span>
              <Input type="number" value={builderDiscount} onChange={(e) => setBuilderDiscount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} className="w-28 text-right" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-[#c8d8ea] pt-2"><span className="text-[#0a1f3f]">Total</span><span className="text-[#0a1f3f]">{formatCurrency(total)}</span></div>
          </div>

          {/* Notes */}
          <textarea
            value={builderNotes}
            onChange={(e) => setBuilderNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm"
          />

          {/* Save as Template */}
          <div className="flex gap-2 items-center">
            <Input placeholder="Save as template..." value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={saveAsTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#c8d8ea]">
            <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveQuote(false)}>Save Draft</Button>
            <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => saveQuote(true)}>
              <Send className="w-4 h-4 mr-2" /> Save & Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quote Detail Modal */}
      <Modal isOpen={!!selectedQuote} onClose={() => setSelectedQuote(null)} title="Quote Details" className="max-w-2xl">
        {selectedQuote && (() => {
          const detailConf = getStatusConfig('quote', selectedQuote.status);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={detailConf.variant} size="md">
                    {detailConf.label}
                  </Badge>
                  <span className="text-sm text-[#4a6580]">{formatDate(selectedQuote.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  {selectedQuote.status === 'draft' && <Button variant="outline" onClick={() => updateQuoteStatus(selectedQuote.id, 'sent')}>Mark Sent</Button>}
                  {selectedQuote.status === 'sent' && (
                    <>
                      <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => updateQuoteStatus(selectedQuote.id, 'accepted')}>Accept</Button>
                      <Button variant="outline" onClick={() => updateQuoteStatus(selectedQuote.id, 'declined')}>Decline</Button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-[#4a6580]">Customer</p>
                <p className="font-medium text-[#0a1f3f]">{selectedQuote.customers?.full_name || '-'}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#0a1f3f] mb-2">Line Items</h4>
                <div className="border border-[#c8d8ea] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-[#dceaf8]/50 text-[#4a6580]"><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {selectedQuote.line_items?.map((item, i) => (
                        <tr key={i} className="border-t border-[#c8d8ea]"><td className="px-3 py-2 text-[#0a1f3f]">{item.description}</td><td className="px-3 py-2 text-center text-[#4a6580]">{item.type}</td><td className="px-3 py-2 text-center text-[#4a6580]">{item.quantity}</td><td className="px-3 py-2 text-right text-[#4a6580]">{formatCurrency(item.unit_price)}</td><td className="px-3 py-2 text-right text-[#0a1f3f] font-medium">{formatCurrency(item.quantity * item.unit_price)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm text-[#4a6580]">Subtotal: {formatCurrency(selectedQuote.subtotal)}</p>
                <p className="text-sm text-[#4a6580]">Tax: {formatCurrency(selectedQuote.tax)}</p>
                {selectedQuote.discount > 0 && <p className="text-sm text-emerald-600">Discount: -{formatCurrency(selectedQuote.discount)}</p>}
                <p className="text-lg font-bold text-[#0a1f3f]">Total: {formatCurrency(selectedQuote.total)}</p>
              </div>

              {selectedQuote.notes && <div className="bg-[#dceaf8]/30 rounded-lg p-3 text-sm"><p className="text-[#4a6580] text-xs mb-1">Notes</p><span className="text-[#0a1f3f]">{selectedQuote.notes}</span></div>}

              <div className="flex justify-between pt-4 border-t border-[#c8d8ea]">
                <Button variant="outline" onClick={() => openBuilder(selectedQuote)}>Edit Quote</Button>
                <Button variant="outline" onClick={() => deleteQuote(selectedQuote.id)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Templates Modal */}
      <Modal isOpen={isTemplateOpen} onClose={() => setIsTemplateOpen(false)} title="Quote Templates">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No templates yet"
              description="Save one from the quote builder to reuse line items across quotes"
            />
          ) : (
            templates.map((t) => (
              <div key={t.id} className="p-3 border border-[#c8d8ea] rounded-lg flex items-center justify-between hover:bg-[#0a1f3f]/5">
                <div>
                  <p className="font-medium text-[#0a1f3f]">{t.name}</p>
                  <p className="text-sm text-[#4a6580]">{t.default_items?.length || 0} items</p>
                </div>
                <Button variant="outline" onClick={() => { loadTemplate(t); openBuilder(); }}>Use</Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
