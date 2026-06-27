'use client';

import { useState, useRef } from 'react';
import { CheckIcon, UploadIcon } from './icons';

export default function ServiceRequestForm() {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    issue: '',
    membershipInterest: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      let fileUrl: string | null = null;

      // Upload file if provided
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/request/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.url;
        }
      }

      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          contact: form.contact,
          issue: form.issue,
          fileUrl,
          membershipInterest: form.membershipInterest,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      setStatus('success');
      setForm({ name: '', contact: '', issue: '', membershipInterest: false });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckIcon className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-[var(--navy)] mb-2">
          Request Submitted
        </h3>
        <p className="text-[var(--steel)] mb-6">
          We&apos;ll review your request and reach out shortly to discuss next steps.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-[var(--accent)] font-semibold hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="form-input"
          placeholder="John Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">
          Phone or Email
        </label>
        <input
          type="text"
          required
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
          className="form-input"
          placeholder="(910) 555-0123 or email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">
          Describe the Issue
        </label>
        <textarea
          required
          rows={4}
          value={form.issue}
          onChange={(e) => setForm({ ...form, issue: e.target.value })}
          className="form-input resize-none"
          placeholder="Tell us what's happening — unit not cooling, strange noises, water leak, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">
          Photo or File (optional)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 cursor-pointer border border-dashed border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
        >
          <UploadIcon className="w-5 h-5 text-[var(--steel)]" />
          <span className="text-sm text-[var(--steel)]">
            {file ? file.name : 'Click to upload a photo or document'}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.membershipInterest}
          onChange={(e) =>
            setForm({ ...form, membershipInterest: e.target.checked })
          }
          className="mt-0.5 w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
        />
        <span className="text-sm text-[var(--steel)]">
          I&apos;m interested in learning about priority membership plans
        </span>
      </label>

      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-[var(--accent)] px-6 py-3.5 text-base font-semibold text-white hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
          'Submit Service Request'
        )}
      </button>
    </form>
  );
}
