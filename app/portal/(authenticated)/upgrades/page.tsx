'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Zap,
  Sun,
  Thermometer,
  ShieldCheck,
  Wind,
  Sparkles,
  Battery,
  Droplets,
  Gauge,
  Wrench,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  Crown,
  X,
} from 'lucide-react';

interface Upgrade {
  name: string;
  price: number;
  deposit: number;
  icon: typeof Zap;
  benefits: string[];
  description: string;
  priority: 'low' | 'medium' | 'high';
}

const UPGRADES: Upgrade[] = [
  {
    name: 'UV Light Air Purifier',
    price: 650,
    deposit: 325,
    icon: Sun,
    benefits: ['Kills mold & bacteria', 'Improves indoor air quality', 'Reduces allergens'],
    description: 'Hospital-grade UV-C light installed in your ductwork that eliminates 99.9% of airborne pathogens.',
    priority: 'medium',
  },
  {
    name: 'Smart Thermostat',
    price: 350,
    deposit: 175,
    icon: Thermometer,
    benefits: ['Energy savings up to 23%', 'Remote temperature control', 'Learning schedule'],
    description: 'WiFi-enabled thermostat that learns your schedule and optimizes your energy usage automatically.',
    priority: 'medium',
  },
  {
    name: 'Surge Protector',
    price: 250,
    deposit: 125,
    icon: ShieldCheck,
    benefits: ['Protects equipment from power surges', 'Extends system lifespan', 'Prevents costly repairs'],
    description: 'Whole-home surge protection that safeguards your HVAC investment from electrical damage.',
    priority: 'high',
  },
  {
    name: 'Duct Sealing',
    price: 800,
    deposit: 400,
    icon: Wind,
    benefits: ['Reduces energy loss up to 30%', 'Improves airflow', 'Better temperature consistency'],
    description: 'Professional Aeroseal duct sealing that eliminates leaks and dramatically improves efficiency.',
    priority: 'medium',
  },
  {
    name: 'Air Scrubber',
    price: 1200,
    deposit: 600,
    icon: Sparkles,
    benefits: ['Removes 99% of contaminants', 'Reduces odors', 'ActivePure technology'],
    description: 'Advanced air purification system using NASA-developed ActivePure technology for the cleanest air possible.',
    priority: 'medium',
  },
  {
    name: 'Hard Start Kit',
    price: 175,
    deposit: 88,
    icon: Battery,
    benefits: ['Reduces compressor wear', 'Lower startup amps', 'Extends compressor life'],
    description: 'Reduces strain on your compressor during startup, extending its lifespan by years.',
    priority: 'high',
  },
  {
    name: 'Float Switch',
    price: 85,
    deposit: 43,
    icon: Droplets,
    benefits: ['Prevents water damage', 'Auto shutoff on overflow', 'Required by code in many areas'],
    description: 'Safety switch that automatically shuts down your system if condensation drainage backs up.',
    priority: 'high',
  },
  {
    name: 'Capacitor Upgrade',
    price: 125,
    deposit: 63,
    icon: Gauge,
    benefits: ['Prevents motor failure', 'Improves efficiency', 'Turbo rated for longer life'],
    description: 'Premium turbo-rated capacitor that outperforms stock parts and prevents unexpected failures.',
    priority: 'high',
  },
  {
    name: 'Condensate Pump',
    price: 225,
    deposit: 113,
    icon: Droplets,
    benefits: ['Reliable drainage', 'Quiet operation', 'Prevents water damage'],
    description: 'High-efficiency condensate removal pump for systems that need to pump water uphill or to a remote drain.',
    priority: 'medium',
  },
  {
    name: 'Maintenance Plan',
    price: 199,
    deposit: 100,
    icon: Wrench,
    benefits: ['2 tune-ups per year', 'Priority scheduling', '15% parts discount'],
    description: 'Annual maintenance plan that keeps your system running at peak efficiency year-round.',
    priority: 'low',
  },
];

// Date picker for install
function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 2; i <= 28 && dates.length < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) dates.push(d);
  }
  return dates;
}

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

export default function UpgradesPage() {
  const { customer } = usePortal();
  const router = useRouter();
  const [selected, setSelected] = useState<Upgrade | null>(null);
  const [step, setStep] = useState<'browse' | 'details' | 'schedule' | 'confirm' | 'success'>('browse');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableDates = getAvailableDates();

  const handleSchedule = async () => {
    if (!customer || !selected || !selectedDate || !selectedTime) return;
    setSubmitting(true);

    const [timeStr, period] = selectedTime.split(' ');
    const [hours, minutes] = timeStr.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    const startTime = new Date(selectedDate);
    startTime.setHours(hour24, minutes, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);

    const supabase = createClient();
    const { error } = await supabase.from('bookings').insert({
      name: customer.full_name,
      contact: customer.phone || customer.email || '',
      service_type: `Upgrade Install: ${selected.name}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: `Upgrade: ${selected.name} | Deposit: ${formatCurrency(selected.deposit)} | Total: ${formatCurrency(selected.price)}`,
      status: 'scheduled',
      group_id: customer.group_id,
    } as Record<string, unknown>);

    setSubmitting(false);
    if (!error) setStep('success');
  };

  const resetFlow = () => {
    setSelected(null);
    setSelectedDate(null);
    setSelectedTime('');
    setStep('browse');
  };

  // Success
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-[var(--navy)] mb-2">Installation Scheduled!</h1>
        <p className="text-sm text-[var(--navy)]/50 mb-2">
          Your <strong>{selected?.name}</strong> installation is booked for{' '}
          {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' at '}{selectedTime}.
        </p>
        <p className="text-xs text-[var(--navy)]/40 mb-6">
          50% deposit of {formatCurrency(selected?.deposit || 0)} will be collected at the time of install.
          Remaining balance due upon completion.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/portal/appointments')}
            className="rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-2.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg transition-all"
          >
            View Appointments
          </button>
          <button
            onClick={resetFlow}
            className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-[var(--navy)]/60 hover:bg-gray-50 transition-all"
          >
            Browse More
          </button>
        </div>
      </div>
    );
  }

  // Detail view
  if (step === 'details' && selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => { setStep('browse'); setSelected(null); }} className="flex items-center gap-1 text-sm text-[var(--navy)]/50 hover:text-[var(--navy)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Upgrades
        </button>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[var(--navy)] to-[#0d2e5e] p-6 sm:p-8 text-white">
            <selected.icon className="w-10 h-10 text-[var(--gold)] mb-3" />
            <h1 className="text-2xl font-bold mb-1">{selected.name}</h1>
            <p className="text-white/60 text-sm">{selected.description}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Benefits */}
            <div>
              <h2 className="font-bold text-[var(--navy)] mb-3">Key Benefits</h2>
              <div className="space-y-2">
                {selected.benefits.map(b => (
                  <div key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-[var(--navy)]/70">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-[#f8f7f4] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--navy)]/50">Total Price</span>
                <span className="text-lg font-bold text-[var(--navy)]">{formatCurrency(selected.price)}</span>
              </div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <span className="text-sm text-[var(--navy)]/50">50% Deposit to Schedule</span>
                <span className="text-lg font-bold text-[var(--gold)]">{formatCurrency(selected.deposit)}</span>
              </div>
              <p className="text-xs text-[var(--navy)]/40">
                Remaining balance of {formatCurrency(selected.price - selected.deposit)} due upon completion of installation.
              </p>
            </div>

            {/* Member discount callout */}
            <div className="flex items-center gap-3 bg-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-xl p-4">
              <Crown className="w-5 h-5 text-[var(--gold)] flex-shrink-0" />
              <p className="text-xs text-[var(--navy)]/60">
                As a <strong className="text-[var(--navy)]">Priority Member</strong>, you receive priority scheduling for all installations.
              </p>
            </div>

            <button
              onClick={() => setStep('schedule')}
              className="w-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-3.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all"
            >
              Schedule Installation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Schedule view
  if (step === 'schedule' && selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => setStep('details')} className="flex items-center gap-1 text-sm text-[var(--navy)]/50 hover:text-[var(--navy)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Details
        </button>

        <div>
          <h1 className="text-xl font-bold text-[var(--navy)]">Schedule {selected.name} Install</h1>
          <p className="text-sm text-[var(--navy)]/50">Pick a date and time for your installation.</p>
        </div>

        {/* Date */}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Time */}
        {selectedDate && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[var(--gold)]" />
              <h2 className="font-bold text-sm text-[var(--navy)]">Select a Time</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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

        {/* Summary & confirm */}
        {selectedDate && selectedTime && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-[var(--navy)]">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[var(--navy)]/50">Upgrade</span>
                <span className="font-semibold text-[var(--navy)]">{selected.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[var(--navy)]/50">Date</span>
                <span className="font-semibold text-[var(--navy)]">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[var(--navy)]/50">Time</span>
                <span className="font-semibold text-[var(--navy)]">{selectedTime}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[var(--navy)]/50">Total</span>
                <span className="font-semibold text-[var(--navy)]">{formatCurrency(selected.price)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--navy)]/50 font-bold">Deposit Due</span>
                <span className="font-bold text-[var(--gold)] text-lg">{formatCurrency(selected.deposit)}</span>
              </div>
            </div>

            <button
              onClick={handleSchedule}
              disabled={submitting}
              className="w-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-3.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </span>
              ) : (
                `Schedule Install — ${formatCurrency(selected.deposit)} Deposit`
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Browse grid (default)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)]">System Upgrades</h1>
        <p className="text-sm text-[var(--navy)]/50">
          Boost your system performance. Pay 50% deposit and choose your install date.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {UPGRADES.map(upgrade => {
          const priorityLabel = upgrade.priority === 'high' ? 'Recommended' : upgrade.priority === 'medium' ? 'Popular' : '';
          const priorityColor = upgrade.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600';

          return (
            <div
              key={upgrade.name}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-[var(--gold)]/30 hover:shadow-lg transition-all group cursor-pointer"
              onClick={() => { setSelected(upgrade); setStep('details'); }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-[var(--gold)]/10 rounded-xl flex items-center justify-center">
                    <upgrade.icon className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  {priorityLabel && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${priorityColor}`}>
                      {priorityLabel}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[var(--navy)] mb-1">{upgrade.name}</h3>
                <p className="text-xs text-[var(--navy)]/40 mb-3 line-clamp-2">{upgrade.description}</p>

                <div className="space-y-1.5 mb-4">
                  {upgrade.benefits.slice(0, 2).map(b => (
                    <div key={b} className="flex items-center gap-1.5 text-xs text-[var(--navy)]/60">
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      {b}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-lg font-bold text-[var(--navy)]">{formatCurrency(upgrade.price)}</p>
                    <p className="text-[10px] text-[var(--navy)]/40">{formatCurrency(upgrade.deposit)} deposit</p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--gold)] group-hover:underline">
                    Learn More &rarr;
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
