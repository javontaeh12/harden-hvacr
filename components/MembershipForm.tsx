'use client';

import { useState } from 'react';
import { CheckIcon } from './icons';

export default function MembershipForm() {
  const [form, setForm] = useState({ name: '', contact: '', address: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      setStatus('success');
      setForm({ name: '', contact: '', address: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gold)]/20 mb-4">
          <CheckIcon className="w-7 h-7 text-[var(--gold)]" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          You&apos;re In!
        </h3>
        <p className="text-white/70 text-sm mb-5">
          We&apos;ll reach out soon to get your membership started.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-[var(--gold)] font-semibold text-sm hover:underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-white/90 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="form-input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-[var(--gold)] focus:ring-[var(--gold)]"
          placeholder="John Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white/90 mb-1.5">
          Phone or Email
        </label>
        <input
          type="text"
          required
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
          className="form-input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-[var(--gold)] focus:ring-[var(--gold)]"
          placeholder="(910) 555-0123 or email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white/90 mb-1.5">
          Service Address
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="form-input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-[var(--gold)] focus:ring-[var(--gold)]"
          placeholder="123 Main St, Fayetteville, NC"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-300 bg-red-900/30 rounded-lg px-4 py-2.5">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-[var(--gold)] px-6 py-3.5 text-base font-bold text-[var(--navy)] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </span>
        ) : (
          'Join Priority Membership'
        )}
      </button>
    </form>
  );
}
