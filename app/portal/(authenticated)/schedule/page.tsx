'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import {
  Snowflake,
  Flame,
  Settings,
  Wrench,
  Wind,
  Search,
  Refrigerator,
  Thermometer,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Package,
  Check,
} from 'lucide-react';

interface ServicePackage {
  id: string;
  service_type: string;
  name: string;
  description: string | null;
  includes: string[];
  price: number;
  sort_order: number;
}

const SERVICE_TYPES = [
  { id: 'AC / Cooling', label: 'AC / Cooling', icon: Snowflake, description: 'Air conditioning repair, installation, and maintenance' },
  { id: 'Heating / Furnace', label: 'Heating / Furnace', icon: Flame, description: 'Furnace, heat pump repair and installation' },
  { id: 'System Tune-Up', label: 'System Tune-Up', icon: Settings, description: 'Preventive maintenance and seasonal tune-ups' },
  { id: 'Full Diagnostics', label: 'Full Diagnostics', icon: Search, description: 'Complete system evaluation and troubleshooting' },
  { id: 'Ductless / Mini-Split', label: 'Ductless / Mini-Split', icon: Wind, description: 'Ductless system install, repair, and service' },
  { id: 'Refrigerator Repair', label: 'Refrigerator Repair', icon: Refrigerator, description: 'Residential and commercial refrigerator repair' },
  { id: 'Freezer Repair', label: 'Freezer Repair', icon: Thermometer, description: 'Freezer repair for home and business' },
  { id: 'Commercial Refrigeration', label: 'Commercial Refrigeration', icon: Wrench, description: 'Walk-in coolers, freezers, and commercial units' },
];

function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 21 && dates.length < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) dates.push(d);
  }
  return dates;
}

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function SchedulePage() {
  const { customer } = usePortal();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableDates = getAvailableDates();

  // Fetch packages when service type is selected
  useEffect(() => {
    if (!serviceType) return;
    setLoadingPackages(true);
    setPackages([]);
    setSelectedPackage(null);

    const supabase = createClient();
    supabase
      .from('service_packages')
      .select('*')
      .eq('service_type', serviceType)
      .eq('is_active', true)
      .order('sort_order')
      .order('price')
      .then(({ data }) => {
        setPackages(data || []);
        setLoadingPackages(false);
      });
  }, [serviceType]);

  const handleSubmit = async () => {
    if (!customer || !serviceType || !selectedDate || !selectedTime) return;
    setSubmitting(true);

    const [timeStr, period] = selectedTime.split(' ');
    const [hours, minutes] = timeStr.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    const startTime = new Date(selectedDate);
    startTime.setHours(hour24, minutes, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const supabase = createClient();
    const { error } = await supabase.from('bookings').insert({
      name: customer.full_name,
      contact: customer.phone || customer.email || '',
      service_type: serviceType,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: notes || null,
      status: 'scheduled',
      group_id: customer.group_id,
      package_id: selectedPackage?.id || null,
      package_name: selectedPackage?.name || null,
      package_price: selectedPackage?.price || null,
    } as Record<string, unknown>);

    setSubmitting(false);
    if (!error) setSuccess(true);
  };

  const totalSteps = packages.length > 0 ? 4 : 3;
  const stepLabels = packages.length > 0
    ? ['Service', 'Package', 'Date & Time', 'Confirm']
    : ['Service', 'Date & Time', 'Confirm'];

  // Map logical step to actual step when no packages exist
  const dateStep = packages.length > 0 ? 3 : 2;
  const confirmStep = packages.length > 0 ? 4 : 3;

  if (success) {
    const buildGoogleCalUrl = () => {
      if (!selectedDate || !selectedTime) return '#';
      const [timeStr, period] = selectedTime.split(' ');
      const [hrs, mins] = timeStr.split(':').map(Number);
      let h24 = hrs;
      if (period === 'PM' && hrs !== 12) h24 += 12;
      if (period === 'AM' && hrs === 12) h24 = 0;
      const start = new Date(selectedDate);
      start.setHours(h24, mins, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '');
      const title = encodeURIComponent(`Harden HVAC — ${serviceType}${selectedPackage ? ` (${selectedPackage.name})` : ''}`);
      const details = encodeURIComponent('Service appointment with Harden HVAC & Refrigeration. Call (910) 546-6485 with any questions.');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
    };

    const buildIcsContent = () => {
      if (!selectedDate || !selectedTime) return '';
      const [timeStr, period] = selectedTime.split(' ');
      const [hrs, mins] = timeStr.split(':').map(Number);
      let h24 = hrs;
      if (period === 'PM' && hrs !== 12) h24 += 12;
      if (period === 'AM' && hrs === 12) h24 = 0;
      const start = new Date(selectedDate);
      start.setHours(h24, mins, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '') + 'Z';
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:Harden HVAC — ${serviceType}${selectedPackage ? ` (${selectedPackage.name})` : ''}`,
        'DESCRIPTION:Service appointment with Harden HVAC & Refrigeration.',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
    };

    const downloadIcs = () => {
      const blob = new Blob([buildIcsContent()], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'harden-hvac-appointment.ics';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-[var(--navy)] mb-2">Service Scheduled!</h1>
        <p className="text-sm text-[var(--navy)]/50 mb-6">
          Your {serviceType}{selectedPackage ? ` — ${selectedPackage.name}` : ''} appointment has been booked for{' '}
          {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' at '}{selectedTime}. We&apos;ll see you then!
        </p>

        {/* Calendar buttons */}
        <div className="flex gap-2 justify-center mb-4">
          <a
            href={buildGoogleCalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-gray-200 text-[var(--navy)] px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-50 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            Google Calendar
          </a>
          <button
            onClick={downloadIcs}
            className="inline-flex items-center gap-1.5 border border-gray-200 text-[var(--navy)] px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-50 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            Apple / Outlook
          </button>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/portal/appointments')}
            className="rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-2.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg transition-all"
          >
            View Appointments
          </button>
          <button
            onClick={() => router.push('/portal')}
            className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-[var(--navy)]/60 hover:bg-gray-50 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => {
            if (step === 1) router.push('/portal');
            else if (step === 2 && packages.length === 0) setStep(1);
            else setStep(step - 1);
          }}
          className="flex items-center gap-1 text-sm text-[var(--navy)]/50 hover:text-[var(--navy)] mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? 'Dashboard' : 'Back'}
        </button>
        <h1 className="text-xl font-bold text-[var(--navy)]">Schedule a Service</h1>
        <p className="text-sm text-[var(--navy)]/50">As a Priority Member, you get same-day scheduling priority.</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s <= step ? 'bg-[var(--gold)] text-[var(--navy)]' : 'bg-gray-100 text-gray-400'
              }`}>
                {s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${s <= step ? 'text-[var(--navy)]' : 'text-gray-400'}`}>
                {label}
              </span>
              {s < totalSteps && <div className={`flex-1 h-0.5 ${s < step ? 'bg-[var(--gold)]' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Service type */}
      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {SERVICE_TYPES.map(svc => (
            <button
              key={svc.id}
              onClick={() => {
                setServiceType(svc.id);
                setStep(2);
              }}
              className={`p-4 rounded-xl border text-left transition-all hover:border-[var(--gold)]/50 hover:shadow-md ${
                serviceType === svc.id
                  ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <svc.icon className="w-6 h-6 text-[var(--gold)] mb-2" />
              <p className="font-bold text-sm text-[var(--navy)]">{svc.label}</p>
              <p className="text-xs text-[var(--navy)]/40 mt-0.5">{svc.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Package selection (if packages exist) OR Date & Time (if no packages) */}
      {step === 2 && (
        <>
          {loadingPackages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
              <span className="ml-2 text-sm text-[var(--navy)]/50">Loading packages...</span>
            </div>
          ) : packages.length > 0 ? (
            /* Package cards */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-[var(--gold)]" />
                <h2 className="font-bold text-[var(--navy)]">Choose a Package</h2>
              </div>
              <p className="text-xs text-[var(--navy)]/40 -mt-3">Select the service package that fits your needs.</p>

              <div className="grid gap-4">
                {packages.map(pkg => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setStep(3);
                      }}
                      className={`relative p-5 rounded-xl border text-left transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md ring-2 ring-[var(--gold)]/30'
                          : 'border-gray-100 bg-white hover:border-[var(--gold)]/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-[var(--navy)]" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-[var(--navy)] text-base">{pkg.name}</h3>
                          {pkg.description && (
                            <p className="text-xs text-[var(--navy)]/50 mt-0.5">{pkg.description}</p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-[var(--gold)] ml-4 shrink-0">
                          {formatCurrency(pkg.price)}
                        </span>
                      </div>

                      {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                        <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                          {pkg.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--navy)]/70">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No packages — skip straight to date/time */
            <DateTimePicker
              availableDates={availableDates}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={(time) => { setSelectedTime(time); setStep(3); }}
            />
          )}
        </>
      )}

      {/* Step 3: Date & Time (when packages exist) */}
      {step === 3 && packages.length > 0 && (
        <DateTimePicker
          availableDates={availableDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={(time) => { setSelectedTime(time); setStep(4); }}
        />
      )}

      {/* Confirm step */}
      {step === confirmStep && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-[var(--navy)]">Confirm Your Appointment</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Service</span>
                <span className="text-sm font-semibold text-[var(--navy)]">{serviceType}</span>
              </div>
              {selectedPackage && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-[var(--navy)]/50">Package</span>
                    <span className="text-sm font-semibold text-[var(--navy)]">{selectedPackage.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-[var(--navy)]/50">Price</span>
                    <span className="text-sm font-bold text-[var(--gold)]">{formatCurrency(selectedPackage.price)}</span>
                  </div>
                  {Array.isArray(selectedPackage.includes) && selectedPackage.includes.length > 0 && (
                    <div className="py-2 border-b border-gray-100">
                      <span className="text-sm text-[var(--navy)]/50 block mb-2">Includes</span>
                      <ul className="space-y-1">
                        {selectedPackage.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--navy)]/70">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Date</span>
                <span className="text-sm font-semibold text-[var(--navy)]">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Time</span>
                <span className="text-sm font-semibold text-[var(--navy)]">{selectedTime}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--navy)]/50">Member</span>
                <span className="text-sm font-semibold text-[var(--navy)]">{customer?.full_name}</span>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)] mb-1.5">
                <MessageSquare className="w-4 h-4 text-[var(--navy)]/30" />
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe the issue or any special instructions..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 focus:border-[var(--gold)] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-[var(--navy)]/60 hover:bg-gray-50 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-3 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Booking...
                </span>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Date & Time picker sub-component ── */
function DateTimePicker({
  availableDates,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
}: {
  availableDates: Date[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
  selectedTime: string;
  setSelectedTime: (t: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-[var(--gold)]" />
          <h2 className="font-bold text-sm text-[var(--navy)]">Select a Date</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {availableDates.map(d => {
            const isSelected = selectedDate?.toDateString() === d.toDateString();
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={`p-2 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-[var(--gold)] text-[var(--navy)] font-bold shadow-md'
                    : 'bg-[#f8f7f4] hover:bg-[var(--gold)]/10 text-[var(--navy)]'
                }`}
              >
                <p className="text-[10px] uppercase font-medium opacity-60">
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-lg font-bold">{d.getDate()}</p>
                <p className="text-[10px] opacity-60">
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[var(--gold)]" />
            <h2 className="font-bold text-sm text-[var(--navy)]">Select a Time</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map(time => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedTime === time
                    ? 'bg-[var(--gold)] text-[var(--navy)] shadow-md'
                    : 'bg-[#f8f7f4] hover:bg-[var(--gold)]/10 text-[var(--navy)]'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
