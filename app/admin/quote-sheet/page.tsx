'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function QuotePage() {
  useEffect(() => {
    // Initialize the form after the page loads
    const initForm = () => {
      if (typeof window !== 'undefined' && (window as unknown as Record<string, () => void>).initQuoteForm) {
        (window as unknown as Record<string, () => void>).initQuoteForm();
      }
    };

    // Small delay to ensure scripts are loaded
    setTimeout(initForm, 100);
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --primary: #1a3a5c;
          --primary-light: #2a5a8c;
          --accent: #c0392b;
          --border: #d0d5dd;
          --border-focus: #2a5a8c;
          --text: #1a1a2e;
          --text-muted: #667085;
        }
        /* Parts Autocomplete Styles */
        .part-autocomplete-wrapper { position: relative; }
        .part-autocomplete {
          position: absolute; top: 100%; left: 0; right: 0; background: #fff;
          border: 1.5px solid var(--border); border-top: none; border-radius: 0 0 8px 8px;
          max-height: 220px; overflow-y: auto; z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none;
        }
        .part-autocomplete.show { display: block; }
        .part-autocomplete-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
        .part-autocomplete-item:last-child { border-bottom: none; }
        .part-autocomplete-item:hover, .part-autocomplete-item.selected { background: #f0f4f8; }
        .part-autocomplete-item .part-item-code { font-weight: 700; color: var(--primary); font-size: 13px; }
        .part-autocomplete-item .part-item-desc { color: var(--text); font-size: 12px; margin-top: 2px; }
        .part-autocomplete-item .part-item-cat { color: var(--text-muted); font-size: 10px; margin-top: 2px; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f0f2f5; padding: 0; color: #1a1a2e;
          -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
        }
        .form-container { max-width: 800px; margin: 0 auto; padding: 16px; min-height: 100vh; }

        /* Title & Top Bar */
        .form-title { text-align: center; font-size: 22px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
        .form-top-bar { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
        .form-top-bar a, .form-top-bar button {
          padding: 10px 20px; font-size: 13px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; border: none;
          font-family: inherit; text-decoration: none;
        }
        .admin-link { background: var(--primary); color: #fff; }
        .admin-link:hover { background: var(--primary-light); }
        .generate-btn { background: #27ae60; color: #fff; }
        .generate-btn:hover { background: #219a52; }

        /* Card sections */
        .form-card {
          background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.1);
        }
        .form-card-title {
          font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--primary); margin-bottom: 16px; padding-bottom: 8px;
          border-bottom: 2px solid #e8ecf0;
        }

        /* Field layout */
        .field-row { display: flex; gap: 12px; margin-bottom: 14px; }
        .field-row:last-child { margin-bottom: 0; }
        .field-group { flex: 1; min-width: 0; }
        .field-group.sm { flex: 0 0 120px; }
        .field-group.md { flex: 0 0 160px; }
        .field-group.tn { flex: 0 0 55px; }
        .field-group label {
          display: block; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.3px; color: var(--text-muted); margin-bottom: 5px;
        }
        .field-group input, .field-group select {
          width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
          font-size: 14px; font-family: inherit; color: #1a1a2e; background: #fff; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-group input:focus, .field-group select:focus {
          border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,58,92,0.08);
        }
        .field-group input::placeholder { color: #b0b7c3; font-size: 13px; }
        .field-group select { cursor: pointer; -webkit-appearance: none; appearance: none; }
        .field-group textarea {
          width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
          font-size: 14px; font-family: inherit; color: #1a1a2e; background: #fff; outline: none;
          resize: vertical; min-height: 60px; line-height: 1.5;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-group textarea:focus {
          border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,58,92,0.08);
        }
        .field-group textarea::placeholder { color: #b0b7c3; font-size: 13px; }

        /* Toggle groups */
        .toggle-row { display: flex; gap: 20px; margin-bottom: 14px; flex-wrap: wrap; }
        .toggle-row:last-child { margin-bottom: 0; }
        .toggle-group .toggle-label {
          display: block; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.3px; color: var(--text-muted); margin-bottom: 5px;
        }
        .pill-group { display: inline-flex; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--border); }
        .pill-group input[type="radio"] { display: none; }
        .pill-group label.pill {
          text-align: center; padding: 8px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; background: #fff; color: var(--text-muted); margin: 0;
          border-right: 1px solid var(--border); font-family: inherit;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .pill-group label.pill:last-of-type { border-right: none; }
        .pill-group input[type="radio"]:checked + label.pill { background: var(--primary); color: #fff; border-color: var(--primary); }

        /* Mobile Parts Carousel */
        .parts-carousel { margin-top: 8px; }
        .part-card {
          background: #fafafa; border: 1.5px solid #ccc; border-radius: 8px;
          padding: 14px; display: none;
        }
        .part-card.active { display: block; }
        .part-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .part-card-header-left { display: flex; align-items: center; gap: 8px; }
        .part-card-num {
          background: var(--primary); color: #fff; width: 24px; height: 24px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
        }
        .part-card-label { font-size: 12px; font-weight: 600; color: #000; }
        .part-card .remove-btn {
          background: #fef2f2; color: var(--accent); border: 1px solid #fecaca;
          font-size: 12px; padding: 4px 10px; cursor: pointer; border-radius: 4px;
          font-weight: 600; font-family: inherit;
        }
        .part-card-fields { display: flex; flex-direction: column; gap: 8px; }
        .part-card-fields .pf { display: flex; flex-direction: column; }
        .part-card-fields .pf label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 3px; }
        .part-card-fields .pf input {
          padding: 8px 10px; border: 1.5px solid #ccc; border-radius: 4px;
          font-size: 14px; font-family: inherit; background: #fff; color: #000;
        }
        .part-card-fields .pf input:focus { outline: none; border-color: var(--border-focus); }
        .part-card-fields .pf input::placeholder { color: #bbb; }
        .part-nav { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
        .part-nav-btn {
          flex: 1; padding: 10px; border: 1.5px solid #ccc; border-radius: 6px;
          background: #fff; color: var(--primary); font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer; text-align: center;
        }
        .part-nav-btn:disabled { opacity: 0.35; }
        .part-nav-dots { display: flex; gap: 5px; justify-content: center; padding: 0 8px; flex-wrap: wrap; max-width: 50%; }
        .part-nav-dot { width: 7px; height: 7px; border-radius: 50%; background: #ccc; flex-shrink: 0; cursor: pointer; }
        .part-nav-dot.active { background: var(--primary); }

        /* Desktop Parts Table */
        .parts-wrapper { display: none; }
        .parts-table { width: 100%; border-collapse: collapse; }
        .parts-table thead th {
          background: #f0f0f0; color: #000; padding: 6px 8px; font-size: 11px;
          font-weight: 400; text-align: left; border-bottom: 1.5px solid #000;
        }
        .parts-table td { padding: 2px 3px; }
        .parts-table tbody tr { border-bottom: 1px solid #ddd; }
        .parts-table input {
          width: 100%; padding: 5px 6px; border: none; border-bottom: 1px solid transparent;
          border-radius: 0; font-size: 13px; font-family: inherit; background: transparent; color: #000;
        }
        .parts-table input:focus { outline: none; border-bottom-color: var(--primary); background: rgba(26,58,92,0.04); }
        .parts-table .row-num { width: 28px; text-align: center; color: var(--text-muted); font-size: 11px; font-weight: 600; }
        .parts-table .remove-btn { background: none; color: #ccc; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; }

        .table-actions { margin-top: 10px; }
        .add-row-btn {
          padding: 8px 20px; background: #fff; color: var(--primary);
          border: 1.5px dashed #ccc; border-radius: 4px; cursor: pointer;
          font-size: 13px; font-weight: 600; font-family: inherit; width: 100%; text-align: center;
        }
        .preset-btn-row { display: flex; gap: 8px; margin-top: 8px; }
        .preset-btn {
          flex: 1; padding: 8px 12px; background: #fff; color: var(--primary);
          border: 1.5px solid var(--border); border-radius: 6px; cursor: pointer;
          font-size: 12px; font-weight: 600; font-family: inherit; text-align: center;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: background 0.15s, border-color 0.15s;
        }
        .preset-btn:hover { background: #f0f4f8; border-color: var(--primary); }
        .preset-btn svg { flex-shrink: 0; }
        .preset-list { max-height: 320px; overflow-y: auto; }
        .preset-item {
          display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;
          gap: 12px;
        }
        .preset-item:last-child { border-bottom: none; }
        .preset-item-info { flex: 1; min-width: 0; }
        .preset-item-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .preset-item-meta { font-size: 11px; color: #667085; margin-top: 2px; }
        .preset-item-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .preset-item-actions button {
          padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 5px;
          cursor: pointer; font-family: inherit; border: none;
        }
        .preset-load-btn { background: var(--primary); color: #fff; }
        .preset-load-btn:hover { background: var(--primary-light); }
        .preset-update-btn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a !important; }
        .preset-update-btn:hover { background: #fef3c7; }
        .preset-delete-btn { background: #fef2f2; color: var(--accent); border: 1px solid #fecaca !important; }
        .preset-delete-btn:hover { background: #fee2e2; }
        .preset-mode-btns {
          display: flex; gap: 6px; margin-top: 6px;
        }
        .preset-mode-btns button {
          flex: 1; padding: 5px 8px; font-size: 11px; font-weight: 600; border-radius: 4px;
          cursor: pointer; font-family: inherit; border: 1.5px solid var(--border);
          background: #fff; color: var(--primary); transition: background 0.15s;
        }
        .preset-mode-btns button:hover { background: #f0f4f8; }
        .preset-empty { padding: 32px 20px; text-align: center; color: #667085; font-size: 13px; }
        .preset-success {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #27ae60; color: #fff; padding: 10px 24px; border-radius: 8px;
          font-size: 13px; font-weight: 600; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: presetFadeIn 0.2s ease;
        }
        @keyframes presetFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .modal-body input[type="text"].preset-name-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #d0d5dd; border-radius: 8px;
          font-size: 14px; font-family: inherit; color: #1a1a2e; outline: none;
        }
        .modal-body input[type="text"].preset-name-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,58,92,0.1); }

        /* Section label */
        .section-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--primary); margin: 16px 0 8px; padding-bottom: 4px;
          border-bottom: 1.5px solid var(--primary); display: inline-block;
        }

        /* Action Buttons */
        .actions {
          display: flex; gap: 10px; justify-content: center;
          margin-top: 20px; padding-top: 16px; border-top: 1px solid #ddd;
        }
        .actions button {
          padding: 10px 28px; font-size: 13px; font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          border: none; border-radius: 6px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; gap: 6px;
        }
        .actions button:active { opacity: 0.8; }
        .btn-photo { background: #8e44ad; color: #fff; }
        .btn-photo:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-reset { background: #fff; color: var(--text-muted); border: 1.5px solid #ccc !important; }
        .btn-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer { padding: 12px 16px; text-align: center; font-size: 10px; color: var(--text-muted); border-top: 1px solid #ddd; font-family: -apple-system, sans-serif; }

        /* Generate Modal */
        .modal-overlay {
          display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 10000; justify-content: center; align-items: center; padding: 20px;
        }
        .modal-overlay.show { display: flex; }
        .modal-content {
          background: #fff; border-radius: 10px; width: 100%; max-width: 600px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h3 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
        .modal-close {
          background: none; border: none; font-size: 22px; color: #667085;
          cursor: pointer; padding: 0 4px; line-height: 1;
        }
        .modal-close:hover { color: #1a1a2e; }
        .modal-body { padding: 20px; }
        .modal-body label { display: block; font-size: 13px; font-weight: 600; color: #344054; margin-bottom: 8px; }
        .modal-body textarea {
          width: 100%; min-height: 200px; padding: 12px; border: 1.5px solid #d0d5dd;
          border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px;
          line-height: 1.5; resize: vertical; outline: none; color: #1a1a2e;
        }
        .modal-body textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,58,92,0.1); }
        .modal-body textarea::placeholder { color: #98a2b3; }
        .modal-body .modal-hint { font-size: 11px; color: #667085; margin-top: 8px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; }
        .modal-footer button {
          padding: 8px 20px; font-size: 13px; font-weight: 600; border-radius: 6px;
          cursor: pointer; font-family: inherit; border: none;
        }
        .modal-cancel { background: #fff; color: #344054; border: 1.5px solid #d0d5dd !important; }
        .modal-cancel:hover { background: #f9fafb; }
        .modal-generate { background: #27ae60; color: #fff; }
        .modal-generate:hover { background: #219a52; }

        /* Print output styles - FR Form style (matches PDF) */
        #printOutput {
          position: absolute; left: -9999px; top: 0;
          box-sizing: border-box;
          width: 816px; min-height: 1056px;
          font-family: 'Times New Roman', Times, serif; color: #000; background: #fff;
          padding: 36px 50px;
        }
        #printOutput .fr-title {
          text-align: center; font-size: 16px; font-weight: 700; margin-bottom: 18px;
        }
        #printOutput .fr-row {
          display: flex; align-items: flex-end; margin-bottom: 8px; gap: 4px;
        }
        #printOutput .fr-field {
          display: flex; align-items: flex-end; flex: 1; min-width: 0;
        }
        #printOutput .fr-field.small { flex: 0 0 130px; }
        #printOutput .fr-field.medium { flex: 0 0 170px; }
        #printOutput .fr-field.tiny { flex: 0 0 50px; }
        #printOutput .fr-label {
          font-size: 12px; font-weight: 400; white-space: nowrap; margin-right: 3px; padding-bottom: 3px;
        }
        #printOutput .fr-value {
          flex: 1; border-bottom: 1px solid #000; min-height: 20px; font-size: 12px;
          padding: 0 2px 3px; min-width: 30px; line-height: 1; font-weight: 700;
        }
        #printOutput .fr-blank-line {
          border-bottom: 1px solid #000; min-height: 20px; margin-bottom: 8px;
        }
        #printOutput .fr-lined-section {
          line-height: 28px;
          background-image: linear-gradient(to bottom, transparent 27px, #000 27px);
          background-size: 100% 28px;
          background-position: 0 0;
          min-height: 56px;
          padding: 0 2px 4px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }
        #printOutput .fr-lined-section .fr-label {
          font-size: 14px; font-weight: 400; white-space: nowrap; margin-right: 3px;
        }
        #printOutput .fr-loc-text {
          font-size: 11px; white-space: nowrap; margin-left: 4px;
        }
        #printOutput .fr-loc-text b { font-weight: 700; text-decoration: underline; }
        #printOutput .fr-parts-header {
          display: flex; margin-top: 14px; margin-bottom: 4px; gap: 8px;
        }
        #printOutput .fr-parts-header span {
          font-size: 11px; font-weight: 400;
        }
        #printOutput .fr-parts-header .col-desc { flex: 2; }
        #printOutput .fr-parts-header .col-part { flex: 1.2; }
        #printOutput .fr-parts-header .col-qty { flex: 0.8; }
        #printOutput .fr-parts-header .col-cost { flex: 1.2; }
        #printOutput .fr-parts-header .col-vendor { flex: 1.2; }
        #printOutput .fr-parts-row {
          display: flex; margin-bottom: 5px; gap: 8px;
        }
        #printOutput .fr-parts-row .fr-cell {
          border-bottom: 1px solid #000; min-height: 20px; font-size: 12px; padding: 0 2px 3px; line-height: 1;
        }
        #printOutput .fr-parts-row .col-desc { flex: 2; }
        #printOutput .fr-parts-row .col-part { flex: 1.2; }
        #printOutput .fr-parts-row .col-qty { flex: 0.8; }
        #printOutput .fr-parts-row .col-cost { flex: 1.2; }
        #printOutput .fr-parts-row .col-vendor { flex: 1.2; }

        /* Desktop overrides */
        @media (min-width: 768px) {
          body { padding: 30px 20px; }
          .form-container { max-width: 800px; min-height: auto; }
          .field-group.sm { flex: 0 0 140px; }
          .field-group.md { flex: 0 0 180px; }
          .parts-carousel { display: none; }
          .parts-wrapper { display: block; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-top: 6px; }
          .add-row-btn { width: auto; padding: 8px 20px; font-size: 12px; }
        }
        @media (max-width: 767px) {
          .field-row { flex-wrap: wrap; gap: 10px; }
          .field-group.sm, .field-group.md { flex: 1 1 100%; }
          .field-group.tn { flex: 0 0 45%; }
          .field-group input, .field-group select { font-size: 16px; }
          .field-group textarea { font-size: 16px; }
          .form-card { padding: 16px; }
        }
        @media print {
          body { background: #fff; padding: 0; }
          .form-container { display: none; }
          #printOutput { position: static !important; left: auto !important; display: block !important; }
        }
      `}</style>

      <div className="form-container" id="quoteForm">
        <div className="form-title">Component Quote Sheet</div>
        <div className="form-top-bar">
          <button type="button" className="generate-btn" id="generateBtn">Generate</button>
          <a href="/login" className="admin-link">Admin Portal</a>
        </div>

        {/* Customer & Job Info */}
        <div className="form-card">
          <div className="form-card-title">Customer &amp; Job Info</div>
          <div className="field-row">
            <div className="field-group"><label>Customer Name</label><input type="text" id="customerName" placeholder="Customer name" /></div>
            <div className="field-group sm"><label>Store #</label><input type="text" id="storeNumber" placeholder="Store #" /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>WO Number</label><input type="text" id="woNumber" placeholder="Work order #" /></div>
            <div className="field-group sm"><label>Tech</label><input type="text" id="tech" placeholder="Tech name" /></div>
            <div className="field-group tn"><label>Page</label><input type="text" id="pageNum" placeholder="#" /></div>
            <div className="field-group tn"><label>Of</label><input type="text" id="pageOf" placeholder="#" /></div>
          </div>
        </div>

        {/* Equipment Details */}
        <div className="form-card">
          <div className="form-card-title">Equipment Details</div>
          <div className="field-row">
            <div className="field-group"><label>Equipment Type</label><input type="text" id="equipmentType" placeholder="e.g. RTU, Condenser" /></div>
            <div className="field-group sm">
              <label>Location</label>
              <select id="location"><option value="">-- Select --</option><option value="Roof">Roof</option><option value="Ground">Ground</option><option value="Self-Contained">Self-Contained</option></select>
            </div>
          </div>
          <div className="field-row">
            <div className="field-group">
              <label>Manufacturer</label>
              <input type="text" id="manufacturer" list="mfgList" placeholder="Type or select" autoComplete="off" />
              <datalist id="mfgList">
                <option value="AAON" /><option value="ADP (Advanced Distributor Products)" /><option value="Aire-Flo" /><option value="Amana" /><option value="American Standard" />
                <option value="Armstrong Air" /><option value="Bard Manufacturing" /><option value="Bosch" /><option value="Bryant" /><option value="Carrier" />
                <option value="Comfortmaker" /><option value="Daikin" /><option value="Dunham-Bush" /><option value="Friedrich" /><option value="Fujitsu" />
                <option value="Goodman" /><option value="Heil" /><option value="Honeywell" /><option value="ICP (International Comfort Products)" /><option value="Johnson Controls" />
                <option value="Lennox" /><option value="LG" /><option value="Luxaire" /><option value="Mammoth" /><option value="McQuay International" />
                <option value="Mitsubishi Electric" /><option value="Modine" /><option value="Nortek" /><option value="Payne" /><option value="Reznor" />
                <option value="Rheem" /><option value="Ruud" /><option value="Samsung" /><option value="Trane" /><option value="York" />
                <option value="Bally Refrigerated Boxes" /><option value="Beacon/Morris" /><option value="Bohn (Heatcraft)" /><option value="Bristol Compressors" />
                <option value="Climate Master" /><option value="Copeland (Emerson)" /><option value="Danfoss" /><option value="Embraco" /><option value="Heatcraft" />
                <option value="Hill Phoenix" /><option value="Hussmann" /><option value="KeepRite Refrigeration" /><option value="Kelvinator Commercial" />
                <option value="Kolpak" /><option value="Kramer Trenton" /><option value="Kysor/Warren" /><option value="Larkin (Heatcraft)" /><option value="Master-Bilt" />
                <option value="McCall" /><option value="Nor-Lake" /><option value="Randell" /><option value="Russell" /><option value="Sporlan" />
                <option value="Sub-Zero Commercial" /><option value="Tecumseh" /><option value="Traulsen" /><option value="True Manufacturing" /><option value="Turbo Air" />
                <option value="Tyler Refrigeration" /><option value="Victory Refrigeration" /><option value="Walk-In Cooler Warehouse" /><option value="Zero Zone" />
              </datalist>
            </div>
            <div className="field-group sm"><label>Unit</label><input type="text" id="unit" placeholder="Unit ID" /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Model #</label><input type="text" id="modelNumber" placeholder="Model number" /></div>
            <div className="field-group"><label>Serial #</label><input type="text" id="serialNumber" placeholder="Serial number" /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Voltage</label><input type="text" id="voltage" placeholder="e.g. 208/230" /></div>
            <div className="field-group"><label>Phase</label><input type="text" id="phase" placeholder="e.g. 1, 3" /></div>
            <div className="field-group"><label>Refrigerant</label><input type="text" id="refrigerant" placeholder="e.g. R-410A, R-22" /></div>
          </div>
          <div className="toggle-row">
            <div className="toggle-group"><span className="toggle-label">Warranty</span><div className="pill-group"><input type="radio" name="warranty" id="warrantyYes" value="Yes" /><label className="pill" htmlFor="warrantyYes">Yes</label><input type="radio" name="warranty" id="warrantyNo" value="No" /><label className="pill" htmlFor="warrantyNo">No</label></div></div>
            <div className="toggle-group"><span className="toggle-label">Operational</span><div className="pill-group"><input type="radio" name="operational" id="operationalYes" value="Yes" /><label className="pill" htmlFor="operationalYes">Yes</label><input type="radio" name="operational" id="operationalNo" value="No" /><label className="pill" htmlFor="operationalNo">No</label></div></div>
          </div>
        </div>

        {/* Work Details */}
        <div className="form-card">
          <div className="form-card-title">Work Details</div>
          <div className="field-row">
            <div className="field-group"><label>Work Performed</label><textarea id="workPerformed" rows={3} placeholder="Describe work performed..."></textarea></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Reason for Repair</label><textarea id="reasonForRepair" rows={2} placeholder="Describe reason for repair..."></textarea></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Equipment Needed</label><textarea id="equipmentNeeded" rows={2} placeholder={"Scissor lift, duct jack, 40' ladder, etc."}></textarea></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Other Comments</label><textarea id="otherComments" rows={2} placeholder="Any additional comments..."></textarea></div>
          </div>
        </div>

        {/* Logistics */}
        <div className="form-card">
          <div className="form-card-title">Logistics</div>
          <div className="toggle-row">
            <div className="toggle-group"><span className="toggle-label">Boom Truck Needed</span><div className="pill-group"><input type="radio" name="boomTruck" id="boomYes" value="Yes" /><label className="pill" htmlFor="boomYes">Yes</label><input type="radio" name="boomTruck" id="boomNo" value="No" /><label className="pill" htmlFor="boomNo">No</label></div></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Up (ft)</label><input type="text" id="boomUp" placeholder="ft" /></div>
            <div className="field-group"><label>In (ft)</label><input type="text" id="boomIn" placeholder="ft" /></div>
            <div className="field-group"><label>Set Back (ft)</label><input type="text" id="boomSetBack" placeholder="ft" /></div>
          </div>
          <div className="toggle-row">
            <div className="toggle-group"><span className="toggle-label">Trailer Needed</span><div className="pill-group"><input type="radio" name="trailerNeeded" id="trailerYes" value="Yes" /><label className="pill" htmlFor="trailerYes">Yes</label><input type="radio" name="trailerNeeded" id="trailerNo" value="No" /><label className="pill" htmlFor="trailerNo">No</label></div></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Tech Hours</label><input type="text" id="techHours" placeholder="Hours" /></div>
            <div className="field-group"><label>Helper Hours</label><input type="text" id="helperHours" placeholder="Hours" /></div>
            <div className="field-group"><label>Travel Hours</label><input type="text" id="travelHours" placeholder="Hours" /></div>
          </div>
        </div>

        {/* Parts & Materials */}
        <div className="form-card">
          <div className="form-card-title">Parts &amp; Materials</div>
          <div className="parts-carousel" id="partsCarousel">
            <div className="parts-list" id="partsList"></div>
            <div className="part-nav" id="partNav" style={{ display: 'none' }}>
              <button className="part-nav-btn" id="partPrev">&larr; Prev</button>
              <div className="part-nav-dots" id="partDots"></div>
              <button className="part-nav-btn" id="partNext">Next &rarr;</button>
            </div>
          </div>
          <div className="parts-wrapper">
            <table className="parts-table" id="partsTable"><thead><tr>
              <th style={{ width: '28px' }}>#</th><th>DESCRIPTION</th><th style={{ width: '130px' }}>PART#</th>
              <th style={{ width: '70px' }}>QTY</th><th style={{ width: '100px' }}>COST</th><th style={{ width: '120px' }}>VENDOR</th><th style={{ width: '30px' }}></th>
            </tr></thead><tbody id="partsBody"></tbody></table>
          </div>
          <div className="table-actions">
            <button className="add-row-btn" type="button" id="addPartBtn">+ Add Part</button>
            <div className="preset-btn-row">
              <button className="preset-btn" type="button" id="savePresetBtn">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h8l4 4v8H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 2v4h5V2M4 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Save Preset
              </button>
              <button className="preset-btn" type="button" id="loadPresetBtn">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4.5A1.5 1.5 0 013.5 3h3.172a1.5 1.5 0 011.06.44l.768.767A1.5 1.5 0 009.56 4.5H12.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Load Preset
              </button>
            </div>
            <div id="partCount" style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: '#667085', fontWeight: 500 }}></div>
          </div>
        </div>

        <div className="actions">
          <button className="btn-photo" id="savePhotoBtn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.172a1.5 1.5 0 011.06.44L6.94 4.646A.5.5 0 007.293 4.5H12.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> Photo</button>
          <button className="btn-reset" id="resetBtn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2v4.5h4.5M14 14v-4.5H9.5M1.5 10a6.5 6.5 0 0111.48-3M14.5 6a6.5 6.5 0 01-11.48 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Reset</button>
        </div>
        <div className="form-footer">All fields auto-save. Your data will be here when you come back.</div>
      </div>

      <div id="printOutput"></div>

      {/* Generate Modal */}
      <div className="modal-overlay" id="generateModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Paste Job Information</h3>
            <button className="modal-close" id="modalClose">&times;</button>
          </div>
          <div className="modal-body">
            <label htmlFor="jobInfoInput">Paste the dispatch or job info below:</label>
            <textarea id="jobInfoInput" placeholder={"Paste job dispatch info here...\n\nExample:\nSTBU013922 - STARBUCKS 13922\nSERVICEWO#: 4181959\nRIF 2  REACH IN FREEZER  REFR\nMake: True\nModel#: TWT-48\nSerial#: 12345678"}></textarea>
            <div className="modal-hint">The system will auto-fill Customer Name, Store#, WO#, Equipment Type, Manufacturer, Model#, Serial#, and Unit from the pasted text.</div>
          </div>
          <div className="modal-footer">
            <button className="modal-cancel" id="modalCancel">Cancel</button>
            <button className="modal-generate" id="modalGenerate">Generate</button>
          </div>
        </div>
      </div>

      {/* Save Preset Modal */}
      <div className="modal-overlay" id="savePresetModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Save Parts Preset</h3>
            <button className="modal-close" id="savePresetClose">&times;</button>
          </div>
          <div className="modal-body">
            <label htmlFor="presetNameInput">Preset Name</label>
            <input type="text" className="preset-name-input" id="presetNameInput" placeholder="e.g. RTU Compressor Swap" />
          </div>
          <div className="modal-footer">
            <button className="modal-cancel" id="savePresetCancel">Cancel</button>
            <button className="modal-generate" id="savePresetConfirm">Save</button>
          </div>
        </div>
      </div>

      {/* Load Preset Modal */}
      <div className="modal-overlay" id="loadPresetModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Load Parts Preset</h3>
            <button className="modal-close" id="loadPresetClose">&times;</button>
          </div>
          <div className="modal-body" style={{ padding: 0 }}>
            <div className="preset-list" id="presetListContainer"></div>
          </div>
          <div className="modal-footer">
            <button className="modal-cancel" id="loadPresetCancel">Close</button>
          </div>
        </div>
      </div>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" strategy="beforeInteractive" />

      <Script id="quote-form-script" strategy="afterInteractive">{`
        const STORAGE_KEY = 'componentQuoteSheet';
        let rowCount = 0, isRestoring = false, currentPartIndex = 0;

        // Parts Database for autocomplete
        const PARTS_DATABASE = [
          { item: "10RC", description: "10X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "125RC", description: "12.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "15RC", description: "15X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "20RC", description: "20X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "25RC", description: "25X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "30RC", description: "30X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "35RC", description: "35X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "40RC", description: "40X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "45RC", description: "45X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "50RC", description: "50X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "5RC", description: "5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "75RC", description: "7.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "RC55", description: "55X440 MFD RUN CAPACITOR", category: "Capacitors" },
          { item: "355RCD", description: "35/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "405RCD", description: "40/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "445RCD", description: "44/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "555RCD", description: "55/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "805RCD", description: "80/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "SC108250", description: "108/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC124250", description: "124/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC130250", description: "130/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC189250", description: "189/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC233250", description: "233/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC88250", description: "88/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC88330", description: "88/330 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "12C90LR", description: "1/2 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "12C90LRST", description: "1/2 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "12CC", description: "1/2 COPPER COUPLING", category: "Copper Fittings" },
          { item: "12CT", description: "1/2 COPPER TEE", category: "Copper Fittings" },
          { item: "34C90LR", description: "3/4 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "34C90LRST", description: "3/4 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "34CC", description: "3/4 COPPER COUPLING", category: "Copper Fittings" },
          { item: "34CT", description: "3/4 COPPER TEE", category: "Copper Fittings" },
          { item: "38C90LR", description: "3/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "38C90LRST", description: "3/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "38CC", description: "3/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "38CT", description: "3/8 COPPER TEE", category: "Copper Fittings" },
          { item: "58C90LR", description: "5/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "58C90LRST", description: "5/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "58CC", description: "5/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "58CT", description: "5/8 COPPER TEE", category: "Copper Fittings" },
          { item: "78C90LR", description: "7/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "78C90LRST", description: "7/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "78CC", description: "7/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "78CT", description: "7/8 COPPER TEE", category: "Copper Fittings" },
          { item: "1PVC90", description: "ELBOW PVC 1", category: "PVC Fittings" },
          { item: "1PVCCOUP", description: "COUPLING PVC 1", category: "PVC Fittings" },
          { item: "1PVCMPTAD", description: "ADAPTER PVC SXMPT 1", category: "PVC Fittings" },
          { item: "1PVCPIPE", description: "PIPE PVC 1 X 10 FT SCH 40", category: "PVC Fittings" },
          { item: "1PVCTEE", description: "1 PVC TEES", category: "PVC Fittings" },
          { item: "34PVC90", description: "ELBOW PVC 3/4", category: "PVC Fittings" },
          { item: "34PVCCAP", description: "3/4 PVC CAP", category: "PVC Fittings" },
          { item: "34PVCCOUP", description: "COUPLING PVC 3/4", category: "PVC Fittings" },
          { item: "34PVCFPTAD", description: "ADAPTER PVC SXFPT 3/4", category: "PVC Fittings" },
          { item: "34PVCMPTAD", description: "ADAPTER PVC SXMPT 3/4", category: "PVC Fittings" },
          { item: "34PVCPIPE", description: "PIPE PVC 3/4 X 10 FT SCH 40", category: "PVC Fittings" },
          { item: "34PVCTEE", description: "3/4 PVC TEES", category: "PVC Fittings" },
          { item: "34PVCUNION", description: "3/4 X 3/4 PVC SLIP UNION", category: "PVC Fittings" },
          { item: "1216SWBFD", description: "1/2 X 16CI SW BI-FLOW DRIER", category: "Driers" },
          { item: "148SWD", description: "1/4 X 8CI SW DRIERS", category: "Driers" },
          { item: "3816SWD", description: "3/8 X 16CI SW DRIER", category: "Driers" },
          { item: "388SWD", description: "3/8 X 8CI SW DRIER", category: "Driers" },
          { item: "EPADR", description: "RECOVERY DRIER 032MF", category: "Driers" },
          { item: "20FUSE250V", description: "FUSE 20 AMP 250V", category: "Fuses" },
          { item: "30FUSE250V", description: "FUSE 30 AMP 250V", category: "Fuses" },
          { item: "30FUSE600V", description: "FUSE 30 AMP 600V", category: "Fuses" },
          { item: "40FUSE250V", description: "FUSE 40 AMP 250V", category: "Fuses" },
          { item: "40FUSE600V", description: "FUSE 40 AMP 600V", category: "Fuses" },
          { item: "50FUSE250V", description: "FUSE 50 AMP 250V", category: "Fuses" },
          { item: "50FUSE600V", description: "FUSE 50 AMP 600V", category: "Fuses" },
          { item: "60FUSE250V", description: "FUSE 60 AMP 250V", category: "Fuses" },
          { item: "60FUSE600V", description: "FUSE 60 AMP 600V", category: "Fuses" },
          { item: "3FUSEATC", description: "FUSE 3 AMP ATC BLADE", category: "Fuses" },
          { item: "5FUSEATC", description: "FUSE 5 AMP ATC BLADE", category: "Fuses" },
          { item: "2P40A120V", description: "40A 2P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "2P40A240V", description: "40A 2P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "2P40A24V", description: "40A 2P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A120V", description: "40A 3P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A240V", description: "40A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A24V", description: "40A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P60A240V", description: "60A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P60A24V", description: "60A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "35WM", description: "35W CW 115 GE", category: "Motors" },
          { item: "6WM", description: "6W CW 115 GE MOTOR", category: "Motors" },
          { item: "9WM", description: "9W CW 115 GE MOTOR", category: "Motors" },
          { item: "CFM12230", description: "CFM 1/2 TE 230 1075", category: "Motors" },
          { item: "CFM12460", description: "CFM 1/2 TE 460 1075", category: "Motors" },
          { item: "CFM13230850", description: "CFM 1/3 TE 230 850 RPM", category: "Motors" },
          { item: "CFM14230", description: "CFM 1/4 TE 230 1075", category: "Motors" },
          { item: "CFM34230", description: "CFM 3/4 TE 230 1075", category: "Motors" },
          { item: "MTRRESC115230", description: "RESCUE MOTOR 115 230 VOLT", category: "Motors" },
          { item: "RM120115CWSEB", description: "MOTOR 1/20 115V CWSE BOHN", category: "Motors" },
          { item: "STR6WFANMO23", description: "STRU 6W FAN MOTOR 23", category: "Motors" },
          { item: "STREVAPMO", description: "EVAPORATOR FAN MOTOR", category: "Motors" },
          { item: "TRUMOTOR", description: "TRUE MOTOR COND ESP-L16EM1 16W", category: "Motors" },
          { item: "R290", description: "R290 (14 OZ - USE PER OZ)", category: "Refrigerants" },
          { item: "R404", description: "R404A LB", category: "Refrigerants" },
          { item: "R407C", description: "R407C LB", category: "Refrigerants" },
          { item: "R410A", description: "R410A LB", category: "Refrigerants" },
          { item: "R448A", description: "R448A REFRIGERANT PER POUND", category: "Refrigerants" },
          { item: "R513A", description: "R513A LB", category: "Refrigerants" },
          { item: "SW120", description: "RELAY SWITCHING 90-341 120V", category: "Relays" },
          { item: "SW24", description: "RELAY SWITCHING 90-340 24V", category: "Relays" },
          { item: "SW240", description: "RELAY SWITCHING 90-342 240V", category: "Relays" },
          { item: "PR90380", description: "RELAY PEANUT 90-380", category: "Relays" },
          { item: "SSHREL220", description: "SOLID STATE HARDSTART RELAY 220-240VAC", category: "Relays" },
          { item: "HSR5", description: "RELAY HARDSTART TO-5", category: "Relays" },
          { item: "HS", description: "HEAT SEQUENCER", category: "Relays" },
          { item: "HPC", description: "CONTROL HIGH PRESSURE - P70AA-118C", category: "Pressure Controls" },
          { item: "HPCOND", description: "HIGH PRESSURE COND FAN CYCLING CONTROL", category: "Pressure Controls" },
          { item: "HPS", description: "HP SCREW ON SWITCH 3100-103", category: "Pressure Controls" },
          { item: "HPSA", description: "HIGH PRESSURE CONTROL SWITCH", category: "Pressure Controls" },
          { item: "LPS", description: "LP SCREW ON SWITCH 3100-002", category: "Pressure Controls" },
          { item: "LPSA", description: "LOW PRESSURE CONTROL SWITCH", category: "Pressure Controls" },
          { item: "MSTAT", description: "WHITE ROGERS THERMOSTAT 1F56-444", category: "Thermostats" },
          { item: "MTSTAT", description: "STAT MED TEMP A30-261 CONTROLLER", category: "Thermostats" },
          { item: "WISTAT", description: "STAT WALKIN A19ABC-24C", category: "Thermostats" },
          { item: "T32PCLIENT", description: "CLIENT T STAT", category: "Thermostats" },
          { item: "IRTS-CLIENT", description: "INDOOR REMOTE TEMP SENSOR FOR T32", category: "Thermostats" },
          { item: "STRCARELDI", description: "STRU CAREL DISCHARGE/AIR PROBE", category: "Sensors" },
          { item: "STRDEFSEN", description: "STRU SB5766 DEFROST SENSOR", category: "Sensors" },
          { item: "VENCT414", description: "VENSTAR COMMUNICATING T/STAT", category: "Venstar" },
          { item: "VENECP4003", description: "VENSTAR EQUIP CONTROL PAC", category: "Venstar" },
          { item: "VENRS400", description: "VENSTAR REMOTE SEN-20 THERMISTOR", category: "Venstar" },
          { item: "VENRS410", description: "VENSTAR REMOTE SENSOR-WALL MOUNT", category: "Venstar" },
          { item: "VENRS420", description: "VENSTAR REMOTE SENSOR (BOH TUBE)", category: "Venstar" },
          { item: "VENSP400", description: "VENSTAR SENSOR PAC", category: "Venstar" },
          { item: "VENTIB515", description: "VENSTAR TRANE INTERFACE BOARD", category: "Venstar" },
          { item: "40VAT", description: "TRANSFORMER 40VA", category: "Transformers" },
          { item: "75VAT", description: "TRANSFORMER FUSED 75VA", category: "Transformers" },
          { item: "EBC10", description: "BUTT CONNECTOR #10", category: "Electrical" },
          { item: "EFC10", description: "FEMALE TERMINAL #10", category: "Electrical" },
          { item: "ETBC1614", description: "ELEC. BUTT CONNECTOR 16-14 EACH", category: "Electrical" },
          { item: "ETBC2218", description: "ELEC. BUTT CONNECTOR 22-18 EACH", category: "Electrical" },
          { item: "ETFC1210", description: "ELEC. FEMALE CONNECTOR 12-10 EACH", category: "Electrical" },
          { item: "ETFC1814", description: "ELEC. FEMALE CONNECTOR FLAG 18-14", category: "Electrical" },
          { item: "ETFCV1614", description: "ELEC. FEMALE CONNECTOR VINYL 16-14", category: "Electrical" },
          { item: "ETFORK1210", description: "ELEC. TERMINAL FORK 12-10 EACH", category: "Electrical" },
          { item: "ETFORK1614", description: "ELEC. TERMINAL FORK 16-14 EACH", category: "Electrical" },
          { item: "ETMFMST", description: "ELEC. MALE/FEMALE MULTISTACK", category: "Electrical" },
          { item: "ETPTC1810", description: "ELEC. PIGTAIL CONNECTOR 18-10", category: "Electrical" },
          { item: "ETPTC2214", description: "ELEC. PIGTAIL CONNECTOR 22-14", category: "Electrical" },
          { item: "ETRING1210", description: "ELEC. TERMINAL RING 12-10 EACH", category: "Electrical" },
          { item: "ETRING1614", description: "ELEC. TERMINAL RING 16-14 EACH", category: "Electrical" },
          { item: "WNBLUE", description: "WIRE NUTS BLUE EACH", category: "Electrical" },
          { item: "WNORANGE", description: "WIRE NUTS ORANGE EACH", category: "Electrical" },
          { item: "WNRED", description: "WIRE NUTS RED EACH", category: "Electrical" },
          { item: "WNYELLOW", description: "WIRE NUTS YELLOW EACH", category: "Electrical" },
          { item: "WT11BL", description: "WIRE TIES 11 BLACK EACH", category: "Electrical" },
          { item: "THHN10", description: "WIRE THHN BLACK 10 GA PER FOOT", category: "Wire" },
          { item: "THHN12", description: "WIRE THHN BLACK 12 GA PER FOOT", category: "Wire" },
          { item: "THHN14", description: "WIRE THHN BLACK 14 GA PER FOOT", category: "Wire" },
          { item: "THHN8", description: "WIRE THHN BLACK 8 GA PER FOOT", category: "Wire" },
          { item: "LVW188", description: "LOW VOLTAGE WIRE 18-8 PER FT", category: "Wire" },
          { item: "SJC", description: "SJ CORD 12/3 PER FOOT", category: "Wire" },
          { item: "ICECLP", description: "ICE MACHINE CLEANER-PINT", category: "Ice Machine" },
          { item: "ICECONDFAN", description: "ICE CONFANMTR 208/230V", category: "Ice Machine" },
          { item: "ICECURTALA", description: "ICE CURTAIN LOWER ASSEMBLY", category: "Ice Machine" },
          { item: "ICEFLOATSK", description: "ICE FLOAT SWITCH KIT", category: "Ice Machine" },
          { item: "ICEFLOATVA", description: "ICE FLOAT VA", category: "Ice Machine" },
          { item: "ICEHARVEAS", description: "ICE HARVEST ASSIST 230V", category: "Ice Machine" },
          { item: "ICEMOTOFAN", description: "ICE MOTOR FAN 230V", category: "Ice Machine" },
          { item: "ICEPUMP230", description: "ICE H2O PUMP 230V", category: "Ice Machine" },
          { item: "ICERIBSWI", description: "ICE RIBBON SWITCH", category: "Ice Machine" },
          { item: "ICESWITFCY", description: "ICE SWITCH FAN CYCLE", category: "Ice Machine" },
          { item: "ICETIMERMO", description: "ICE TIMER MODULE", category: "Ice Machine" },
          { item: "ICETUBEWDI", description: "ICE TUBE WATER DISTRIBUTION", category: "Ice Machine" },
          { item: "ICEVALVEPU", description: "ICE VALVE PURGE 230", category: "Ice Machine" },
          { item: "ICEVALVEWATERIN", description: "VALVE WATER INLET 240V", category: "Ice Machine" },
          { item: "ICEWATERPUMPASS", description: "WATER PUMP ASSY", category: "Ice Machine" },
          { item: "TRUBTMHINAS", description: "TRUE BTM HINGE ASSEMBLY", category: "True Parts" },
          { item: "TRUCOLDCON", description: "TRUE COLD CONTROL TR", category: "True Parts" },
          { item: "TRUCTRLTEMP", description: "TRUE CONTROL TEMP", category: "True Parts" },
          { item: "TRUDRAINELBOW811501", description: "TRUE EVAP DRAIN ELBOW", category: "True Parts" },
          { item: "TRUDRNWICKPAD", description: "TRUE DRAIN PAN WICKING PAD", category: "True Parts" },
          { item: "TRUHEATERTUBE801849", description: "TRUE HEATER DRAIN TUBE", category: "True Parts" },
          { item: "TRULEDLIGSTR", description: "TRUE LED LIGHT STRIP", category: "True Parts" },
          { item: "TRULEDWIRHAR", description: "TRUE LED WIRE HARNESS", category: "True Parts" },
          { item: "TRULHCARTHIN", description: "TRUE LH CARTRIDGE HINGE", category: "True Parts" },
          { item: "TRUPIN", description: "TRUE PIN SWING DR HINGE SHFT/PIN", category: "True Parts" },
          { item: "TRURHCARTHIN", description: "TRUE RH CARTRIDGE HINGE", category: "True Parts" },
          { item: "TRUSCREW", description: "TRUE SCREWS SHELF STANDARD 10-32", category: "True Parts" },
          { item: "TRUSHELFCL", description: "TRUE SHELF CLIPS", category: "True Parts" },
          { item: "TRUTOPHIN", description: "TRUE DOOR HINGE KIT TOP RT OR LT", category: "True Parts" },
          { item: "TRUTOPHINAS", description: "TRUE TOP HINGE ASSEMBLY", category: "True Parts" },
          { item: "TRUUNIVCBIT25", description: "TRUE UNIV CNTRL BIT25 KIT", category: "True Parts" },
          { item: "TRUWICKING", description: "TRUE WICKING KIT CON", category: "True Parts" },
          { item: "STRPOWERSW", description: "STRU POWER SWITCH 2PST", category: "Strutherford" },
          { item: "STRWICK", description: "STRU WICKING MAT", category: "Strutherford" },
          { item: "FS", description: "FLOAT SWITCH 1502UR", category: "Switches" },
          { item: "FSO", description: "OVER FLOW SWITCH", category: "Switches" },
          { item: "FSP", description: "DRAIN PAN SWITCH", category: "Switches" },
          { item: "LS160", description: "LIMIT SWITCH 160", category: "Switches" },
          { item: "LS190", description: "LIMIT SWITCH 190", category: "Switches" },
          { item: "DTC814520", description: "CLOCK DEFROST 8145-20 230V", category: "Switches" },
          { item: "38LLS", description: "SOLENOID 3/8 SW", category: "Valves" },
          { item: "38SG", description: "SITE GLASS 3/8 M X F", category: "Valves" },
          { item: "LLSC120240", description: "SOLENOID COIL 120/240", category: "Valves" },
          { item: "UGV", description: "UNIVERSAL GAS VALVE", category: "Valves" },
          { item: "VALCAP", description: "FLARE CAPS 1/4 EACH", category: "Valves" },
          { item: "VCORE", description: "VALVE CORES CD4450B EACH", category: "Valves" },
          { item: "2R322D", description: "115V CONDENSATE PUMP", category: "Pumps" },
          { item: "PUMPASSYMINI", description: "PUMP ASSY MINIBULE 115V", category: "Pumps" },
          { item: "UNIVCPUMP110", description: "UNIV PUMP COND 110-250V", category: "Pumps" },
          { item: "HSIT", description: "HOT SURFACE IGNITORS TRANE", category: "Ignition" },
          { item: "UIIM", description: "UNIVERSAL INTERMITTENT IGNITION MODULE", category: "Ignition" },
          { item: "THCO60", description: "THERMOCOUPLES 60", category: "Ignition" },
          { item: "TDADOB", description: "TIME DELAY ADJ DOB", category: "Time Delays" },
          { item: "TDADOM", description: "TIME DELAY ADJ DOM", category: "Time Delays" },
          { item: "A26", description: "A26 BELT", category: "Belts" },
          { item: "A32", description: "A32 BELT", category: "Belts" },
          { item: "A35", description: "A35 BELT", category: "Belts" },
          { item: "A36", description: "A36 BELT", category: "Belts" },
          { item: "A38", description: "A38 BELT", category: "Belts" },
          { item: "A39", description: "A39 BELT", category: "Belts" },
          { item: "A40", description: "A40 BELT", category: "Belts" },
          { item: "A44", description: "A44 BELT", category: "Belts" },
          { item: "A47", description: "A47 BELT", category: "Belts" },
          { item: "A48", description: "A48 BELT", category: "Belts" },
          { item: "A49", description: "A49 BELT", category: "Belts" },
          { item: "A52", description: "A52 BELT", category: "Belts" },
          { item: "A53", description: "A53 BELT", category: "Belts" },
          { item: "A54", description: "A54 BELT", category: "Belts" },
          { item: "LNKBELTA", description: "LINK BELT A", category: "Belts" },
          { item: "LNKBELTB", description: "LINK BELT B", category: "Belts" },
          { item: "101STSCR", description: "10 X1 SELF TAPPING SCREWS (500)", category: "Hardware" },
          { item: "812STSCR", description: "8 X1/2 SELF TAPPING SCREWS (500)", category: "Hardware" },
          { item: "12NUT", description: "HEX NUT 1/2", category: "Hardware" },
          { item: "38FW", description: "FENDER WASHER 3/8", category: "Hardware" },
          { item: "38LW", description: "LOCK WASHER 3/8", category: "Hardware" },
          { item: "38NUT", description: "HEX NUT 3/8", category: "Hardware" },
          { item: "38NUTCOMP", description: "NUTS COMP 3/8 61-6", category: "Hardware" },
          { item: "ANC", description: "ANCHOR KIT 10 X 1-1/4 HEX EACH", category: "Hardware" },
          { item: "716X1HC", description: "HOSE CLAMP 7/16 X 1", category: "Hardware" },
          { item: "STRAP", description: "GALV. STRAP 1 FOOT", category: "Hardware" },
          { item: "PDT", description: "DUCT STRAPS 36 INCH", category: "Hardware" },
          { item: "14ACCTUBE", description: "ACCESS TUBES 1/4 CD3604", category: "Access Tubes" },
          { item: "18ACCTUBE", description: "ACCESS TUBES 1/8 CD3608", category: "Access Tubes" },
          { item: "316ACCTUBE", description: "ACCESS TUBES 3/16 CD3603", category: "Access Tubes" },
          { item: "15SS", description: "SOLDER 15% PER STICK", category: "Soldering" },
          { item: "45SS", description: "45% SILVER SOLDER", category: "Soldering" },
          { item: "ACE", description: "ACETYLENE PER USE", category: "Soldering" },
          { item: "OXY", description: "OXYGEN PER USE", category: "Soldering" },
          { item: "MAPGAS", description: "MAPP GAS 14.1OZ", category: "Soldering" },
          { item: "ALUROD", description: "ALUMINUM FLUX CORED RODS", category: "Soldering" },
          { item: "ACID", description: "ACID A WAY", category: "Chemicals" },
          { item: "ATK", description: "ACID TEST KIT QT2000", category: "Chemicals" },
          { item: "CCCL", description: "CONDENSER CLEANER CCL GALLON", category: "Chemicals" },
          { item: "ECCL", description: "EVAP CLEANER CCL PER USE 1/2 GAL", category: "Chemicals" },
          { item: "DEGR", description: "DEGREASER VIRGINIA 10", category: "Chemicals" },
          { item: "DSA", description: "SPRAY ADHESIVE PER CAN", category: "Chemicals" },
          { item: "LKDETBLU", description: "LEAK DETECTOR BIG BLUE PER USE", category: "Chemicals" },
          { item: "LLOCK", description: "LEAK LOCK EACH", category: "Chemicals" },
          { item: "NEVSEE", description: "NEVERSEEZE 8 OZ BRUSH TOP PER USE", category: "Chemicals" },
          { item: "PVCGLUE", description: "GLUE PVC 1/4 PT", category: "Chemicals" },
          { item: "PVCPRIMER", description: "PRIMER PVC 1/2 PT", category: "Chemicals" },
          { item: "CGP", description: "COLD GALVANIZED PAINT", category: "Chemicals" },
          { item: "GREASE", description: "GREASE CARTRIDGE", category: "Chemicals" },
          { item: "THTRAP", description: "HEAT PASTE THERMO TRAP PER USE", category: "Chemicals" },
          { item: "WASPSPRAY", description: "WASP/HORNET SPRAY", category: "Chemicals" },
          { item: "WD40", description: "WD40 11 OZ PER USE", category: "Chemicals" },
          { item: "VPO1QT", description: "VACUUM PUMP OIL 1 QT", category: "Chemicals" },
          { item: "ELECTAPE", description: "ELECTRICAL TAPE PER YARD", category: "Tape" },
          { item: "TTAPE", description: "TAPE TEFLON PER FOOT", category: "Tape" },
          { item: "BLDT", description: "DUCT TAPE 2 BLACK PER YARD", category: "Tape" },
          { item: "FODT", description: "DUCT TAPE FOIL 2-1/2 UL PER YARD", category: "Tape" },
          { item: "CTAPE", description: "TAPE CORK PER FOOT", category: "Tape" },
          { item: "FTAPE", description: "TAPE FOAM PER FOOT", category: "Tape" },
          { item: "SCL", description: "SAND CLOTH 1-1/2 IN PER FOOT", category: "Tape" },
          { item: "ABPA", description: "ABRASIVE PADS EA", category: "Tape" },
          { item: "PIPESEAL", description: "PIPE THREAD SEALANT", category: "Tape" },
          { item: "CAULKCL", description: "CAULKING CLEAR", category: "Tape" },
          { item: "BAT9", description: "BATTERY 9V ALKALINE", category: "Batteries" },
          { item: "BATAA", description: "BATTERY AA ALKALINE", category: "Batteries" },
          { item: "BATAAA", description: "BATTERY AAA ALKALINE", category: "Batteries" },
          { item: "NITRO", description: "NITROGEN 40", category: "Gases" },
          { item: "SCRUBS", description: "SCRUBS IN A BUCKET", category: "Shop Supplies" },
          { item: "SRAGS", description: "SHOP TOWELS", category: "Shop Supplies" },
          { item: "SPOIL", description: "ZOOM SPOUT OILER", category: "Shop Supplies" },
          { item: "KNB", description: "NUT & BOLT (FASTENER KIT)", category: "Shop Supplies" },
          { item: "SH503", description: "DRAIN LINE HEATER", category: "Drain" },
          { item: "PT", description: "PAN TABS EACH", category: "Drain" },
          { item: "SWTEE", description: "SWIVEL TEE", category: "Drain" },
          { item: "MP", description: "CORD END MALE", category: "Misc" },
          { item: "PHMON", description: "3 PHASE MONITOR", category: "Misc" }
        ];

        // Search parts for autocomplete (stock parts only)
        function searchParts(query) {
          if (!query || query.length < 1) return [];
          const lowerQuery = query.toLowerCase();
          return PARTS_DATABASE.filter(p =>
            p.item.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
          ).slice(0, 8);
        }

        // Currently active autocomplete dropdown
        let activeAutocomplete = null;
        let selectedAutocompleteIndex = -1;

        function createAutocomplete(input, partNumInput) {
          // Create wrapper if not exists — use the existing .pf parent instead of reparenting
          let wrapper = input.closest('.part-autocomplete-wrapper') || input.closest('.pf') || input.parentElement;
          if (!wrapper.classList.contains('part-autocomplete-wrapper')) {
            wrapper.classList.add('part-autocomplete-wrapper');
            wrapper.style.position = 'relative';
          }

          // Remove existing dropdown
          const existing = wrapper.querySelector('.part-autocomplete');
          if (existing) existing.remove();

          // Create dropdown
          const dropdown = document.createElement('div');
          dropdown.className = 'part-autocomplete';
          wrapper.appendChild(dropdown);

          return dropdown;
        }

        function showAutocomplete(input, partNumInput, results) {
          let wrapper = input.closest('.part-autocomplete-wrapper') || input.closest('.pf') || input.parentElement;
          let dropdown = wrapper.querySelector('.part-autocomplete');
          if (!dropdown) {
            dropdown = createAutocomplete(input, partNumInput);
          }

          if (results.length === 0) {
            dropdown.classList.remove('show');
            return;
          }

          dropdown.innerHTML = results.map((part, i) =>
            '<div class="part-autocomplete-item" data-index="' + i + '" data-item="' + part.item + '" data-desc="' + part.description + '">' +
              '<div class="part-item-code">' + part.item + (part.isCustom ? '<span class="custom-badge">CUSTOM</span>' : '') + '</div>' +
              '<div class="part-item-desc">' + part.description + '</div>' +
              '<div class="part-item-cat">' + (part.category || '') + '</div>' +
            '</div>'
          ).join('');

          dropdown.classList.add('show');
          activeAutocomplete = { dropdown, input, partNumInput, results };
          selectedAutocompleteIndex = -1;

          // Add click handlers
          dropdown.querySelectorAll('.part-autocomplete-item').forEach(item => {
            item.addEventListener('click', function() {
              selectAutocompleteItem(this);
            });
          });
        }

        function selectAutocompleteItem(item) {
          if (!activeAutocomplete) return;
          const desc = item.getAttribute('data-desc');
          const itemCode = item.getAttribute('data-item');

          activeAutocomplete.input.value = desc;
          if (activeAutocomplete.partNumInput) {
            activeAutocomplete.partNumInput.value = itemCode;
          }

          activeAutocomplete.dropdown.classList.remove('show');

          // Sync between card and table
          syncAllPartInputs(activeAutocomplete.input, desc, itemCode);
          saveForm();
          activeAutocomplete = null;
        }

        function hideAllAutocompletes() {
          document.querySelectorAll('.part-autocomplete').forEach(d => d.classList.remove('show'));
          activeAutocomplete = null;
        }

        function syncAllPartInputs(input, desc, itemCode) {
          // Check if input is in card or table
          const card = input.closest('.part-card');
          const tableRow = input.closest('tr');

          if (card) {
            // Input is in card, sync to table
            const row = card.dataset.row;
            const targetRow = document.querySelector('#partsBody tr[data-row="' + row + '"]');
            if (targetRow) {
              const tableInputs = targetRow.querySelectorAll('input');
              tableInputs[0].value = desc; // Description
              tableInputs[1].value = itemCode; // Part #
            }
          } else if (tableRow) {
            // Input is in table, sync to card
            const row = tableRow.dataset.row;
            const targetCard = document.querySelector('#partsList .part-card[data-row="' + row + '"]');
            if (targetCard) {
              const cardInputs = targetCard.querySelectorAll('input');
              cardInputs[0].value = desc; // Description
              cardInputs[1].value = itemCode; // Part #
            }
          }
        }

        // Keyboard navigation for autocomplete
        document.addEventListener('keydown', function(e) {
          if (!activeAutocomplete) return;

          const items = activeAutocomplete.dropdown.querySelectorAll('.part-autocomplete-item');
          if (items.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
            items.forEach((item, i) => item.classList.toggle('selected', i === selectedAutocompleteIndex));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, 0);
            items.forEach((item, i) => item.classList.toggle('selected', i === selectedAutocompleteIndex));
          } else if (e.key === 'Enter' && selectedAutocompleteIndex >= 0) {
            e.preventDefault();
            selectAutocompleteItem(items[selectedAutocompleteIndex]);
          } else if (e.key === 'Escape') {
            hideAllAutocompletes();
          }
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', function(e) {
          if (!e.target.closest('.part-autocomplete-wrapper')) {
            hideAllAutocompletes();
          }
        });

        const fieldIds = [
          'customerName','storeNumber','woNumber','tech','pageNum','pageOf',
          'equipmentType','location','manufacturer','unit','modelNumber','serialNumber',
          'voltage','phase','refrigerant','workPerformed','reasonForRepair','equipmentNeeded',
          'otherComments','boomUp','boomIn','boomSetBack','techHours','helperHours','travelHours'
        ];
        const radioNames = ['warranty','operational','boomTruck','trailerNeeded'];

        function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
        function radioVal(name) { const c = document.querySelector('input[name="'+name+'"]:checked'); return c ? c.value : '—'; }
        function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

        function buildOutput() {
          const parts = [];
          document.querySelectorAll('#partsList .part-card').forEach(card => {
            const inputs = card.querySelectorAll('input');
            const r = { desc: inputs[0]?.value||'', part: inputs[1]?.value||'', qty: inputs[2]?.value||'', cost: inputs[3]?.value||'', vendor: inputs[4]?.value||'' };
            if (r.desc || r.part || r.qty || r.cost || r.vendor) parts.push(r);
          });

          // Helper functions for FR Form style
          function frField(label, value, cls) {
            cls = cls || '';
            return '<div class="fr-field '+cls+'"><span class="fr-label">'+label+'</span><span class="fr-value">'+esc(value)+'</span></div>';
          }
          function radioValChecked(name) {
            const c = document.querySelector('input[name="'+name+'"]:checked');
            return c ? c.value : '';
          }
          function locationText(selected) {
            const opts = ['ROOF', 'GROUND', 'SELF-CONTAINED'];
            return opts.map(function(o) {
              if (selected && o.toUpperCase() === selected.toUpperCase()) return '<b>'+o+'</b>';
              return o;
            }).join(' / ');
          }

          // Build FR Form style output (matches PDF form exactly)
          let html = '<div class="fr-title">Component Quote Sheet</div>';

          // Row 1: Customer Name, Store#
          html += '<div class="fr-row">';
          html += frField('CUSTOMER NAME', val('customerName'));
          html += frField('STORE#', val('storeNumber'), 'small');
          html += '</div>';

          // Row 2: WO Number, Tech, Page of
          html += '<div class="fr-row">';
          html += frField('WO NUMBER', val('woNumber'));
          html += frField('TECH', val('tech'), 'small');
          html += frField('PAGE', val('pageNum'), 'tiny');
          html += '<span class="fr-label">OF</span>';
          html += '<div class="fr-field tiny"><span class="fr-value">'+esc(val('pageOf'))+'</span></div>';
          html += '</div>';

          // Row 3: Equipment Type, Location: ROOF / GROUND / SELF-CONTAINED
          html += '<div class="fr-row">';
          html += frField('EQUIPMENT TYPE', val('equipmentType'));
          html += '<span class="fr-label">LOCATION:</span>';
          html += '<span class="fr-loc-text">'+locationText(val('location'))+'</span>';
          html += '</div>';

          // Row 4: Manufacturer, Unit
          html += '<div class="fr-row">';
          html += frField('MANUFACTURER', val('manufacturer'));
          html += frField('UNIT', val('unit'), 'small');
          html += '</div>';

          // Row 5: Model#
          html += '<div class="fr-row">';
          html += frField('MODEL#', val('modelNumber'));
          html += '</div>';

          // Row 6: Serial#
          html += '<div class="fr-row">';
          html += frField('SERIAL#', val('serialNumber'));
          html += '</div>';

          // Row 7: Voltage, Phase
          html += '<div class="fr-row">';
          html += frField('VOLTAGE', val('voltage'), 'medium');
          html += frField('PHASE', val('phase'), 'small');
          html += '</div>';

          // Row 8: Warranty, Operational
          html += '<div class="fr-row">';
          html += frField('WARRANTY YES/NO', radioValChecked('warranty'), 'medium');
          html += frField('OPERATIONAL YES/NO', radioValChecked('operational'), 'medium');
          html += '</div>';

          // Work Performed (lined section - text wraps across underlines)
          html += '<div class="fr-lined-section" style="min-height:40px;"><span class="fr-label">WORK PERFORMED</span>'+esc(val('workPerformed'))+'</div>';

          // Reason for Repair (lined section)
          html += '<div class="fr-lined-section" style="min-height:40px;"><span class="fr-label">REASON FOR REPAIR</span>'+esc(val('reasonForRepair'))+'</div>';

          // Equipment Needed (bold label + value on lined section, ie hint below)
          html += '<div class="fr-lined-section" style="min-height:40px;margin-bottom:1px;padding-bottom:1px;"><span class="fr-label">EQUIPMENT NEEDED</span>'+esc(val('equipmentNeeded'))+'</div>';
          html += '<div style="font-size:9px;font-weight:400;margin-top:0;margin-bottom:6px;padding-left:2px;color:#333;line-height:1;">ie: scissor lift, duct jack, 40&apos; ladder, etc, any equipment you don&apos;t normally have</div>';

          // Other Comments (lined section)
          html += '<div class="fr-lined-section" style="min-height:40px;"><span class="fr-label">OTHER COMMENTS</span>'+esc(val('otherComments'))+'</div>';

          // Boom Truck row
          html += '<div class="fr-row">';
          html += '<div class="fr-field" style="flex:0 0 280px;"><span class="fr-label">BOOM TRUCK NEEDED? YES/NO</span><span class="fr-value">'+esc(radioValChecked('boomTruck'))+'</span></div>';
          html += frField('UP', val('boomUp'), 'tiny');
          html += frField('IN', val('boomIn'), 'tiny');
          html += frField('SET BACK', val('boomSetBack'), 'small');
          html += '</div>';

          // Tech Hours row
          html += '<div class="fr-row">';
          html += frField('TECH HOURS NEEDED', val('techHours'), 'medium');
          html += frField('HELPER', val('helperHours'), 'small');
          html += frField('TRAVEL', val('travelHours'), 'small');
          html += '</div>';

          // Parts header
          html += '<div class="fr-parts-header">';
          html += '<span class="col-desc">DESCRIPTION</span>';
          html += '<span class="col-part">PART#</span>';
          html += '<span class="col-qty">QUANTITY</span>';
          html += '<span class="col-cost">COST</span>';
          html += '<span class="col-vendor">VENDOR</span>';
          html += '</div>';

          // Parts rows (always show 12 rows like the original form)
          const totalRows = Math.max(12, parts.length);
          for (let i = 0; i < totalRows; i++) {
            const p = parts[i] || { desc: '', part: '', qty: '', cost: '', vendor: '' };
            html += '<div class="fr-parts-row">';
            html += '<div class="fr-cell col-desc">'+esc(p.desc)+'</div>';
            html += '<div class="fr-cell col-part">'+esc(p.part)+'</div>';
            html += '<div class="fr-cell col-qty">'+esc(p.qty)+'</div>';
            html += '<div class="fr-cell col-cost">'+esc(p.cost)+'</div>';
            html += '<div class="fr-cell col-vendor">'+esc(p.vendor)+'</div>';
            html += '</div>';
          }

          // Build Parts-only section for page 2
          let partsOnlyHTML = '<div class="fr-title">Component Quote Sheet</div>';
          partsOnlyHTML += '<div class="fr-parts-header">';
          partsOnlyHTML += '<span class="col-desc">DESCRIPTION</span>';
          partsOnlyHTML += '<span class="col-part">PART#</span>';
          partsOnlyHTML += '<span class="col-qty">QUANTITY</span>';
          partsOnlyHTML += '<span class="col-cost">COST</span>';
          partsOnlyHTML += '<span class="col-vendor">VENDOR</span>';
          partsOnlyHTML += '</div>';
          for (let i = 0; i < totalRows; i++) {
            const p = parts[i] || { desc: '', part: '', qty: '', cost: '', vendor: '' };
            partsOnlyHTML += '<div class="fr-parts-row">';
            partsOnlyHTML += '<div class="fr-cell col-desc">'+esc(p.desc)+'</div>';
            partsOnlyHTML += '<div class="fr-cell col-part">'+esc(p.part)+'</div>';
            partsOnlyHTML += '<div class="fr-cell col-qty">'+esc(p.qty)+'</div>';
            partsOnlyHTML += '<div class="fr-cell col-cost">'+esc(p.cost)+'</div>';
            partsOnlyHTML += '<div class="fr-cell col-vendor">'+esc(p.vendor)+'</div>';
            partsOnlyHTML += '</div>';
          }

          // For legacy compatibility
          let partsHTML = '';

          return {
            full: html,
            page1: html,
            page2: parts.length > 0 ? partsOnlyHTML : null,
            hasParts: parts.length > 0
          };
        }

        function getFilename(ext) {
          const c = val('customerName') || 'Quote';
          const w = val('woNumber');
          return 'Component_Quote_'+c.replace(/\\s+/g,'_')+(w ? '_WO'+w : '')+'.'+ext;
        }

        function triggerDownload(blob, filename, mimeType) {
          const url = URL.createObjectURL(blob);
          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([blob], filename, { type: mimeType });
              if (navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: filename }).catch(() => window.open(url, '_blank'));
                return;
              }
            } catch(e) {}
          }
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }

        function captureOutput(html) {
          return new Promise(function(resolve, reject) {
            var output = document.getElementById('printOutput');
            output.innerHTML = html;
            output.style.left = '0'; output.style.position = 'fixed'; output.style.top = '0'; output.style.zIndex = '9999';
            setTimeout(function() {
              html2canvas(output, { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 }).then(function(canvas) {
                output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';
                resolve(canvas);
              }).catch(function(err) {
                output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';
                reject(err);
              });
            }, 100);
          });
        }

        var pendingPartsHTML = null;
        var photoOriginalHTML = null;

        function saveAsPhoto() {
          var btn = document.getElementById('savePhotoBtn');
          if (!photoOriginalHTML) photoOriginalHTML = btn.innerHTML;
          if (typeof html2canvas === 'undefined') {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            s.onload = function() { saveAsPhoto(); };
            document.head.appendChild(s);
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> Loading...';
            return;
          }

          // Step 2: save the parts page
          if (pendingPartsHTML) {
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> Generating...';
            var partsHtml = pendingPartsHTML;
            var baseName = getFilename('png').replace('.png', '');
            pendingPartsHTML = null;
            captureOutput(partsHtml).then(function(canvas) {
              canvas.toBlob(function(blob) {
                triggerDownload(blob, baseName + '_Parts.png', 'image/png');
                btn.innerHTML = photoOriginalHTML;
                btn.disabled = false;
              }, 'image/png');
            }).catch(function() { btn.innerHTML = photoOriginalHTML; btn.disabled = false; });
            return;
          }

          // Step 1: render full output first, check if too tall
          btn.disabled = true;
          btn.innerHTML = '<span class="btn-spinner"></span> Generating...';
          var result = buildOutput();
          var baseName = getFilename('png').replace('.png', '');

          // Measure the full output height
          var output = document.getElementById('printOutput');
          output.innerHTML = result.full;
          output.style.left = '0'; output.style.position = 'fixed'; output.style.top = '0'; output.style.zIndex = '9999';
          var fullHeight = output.scrollHeight;
          output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';

          // If under 1400px tall or no parts, save as one image
          var isTooLong = fullHeight > 1056 && result.hasParts && result.page2;

          var pageToCapture = isTooLong ? result.page1 : result.full;
          var filename = isTooLong ? baseName + '_Page1.png' : baseName + '.png';

          captureOutput(pageToCapture).then(function(canvas) {
            canvas.toBlob(function(blob) {
              triggerDownload(blob, filename, 'image/png');
              if (isTooLong) {
                // Switch button to "Save Parts" for step 2
                pendingPartsHTML = result.page2;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.172a1.5 1.5 0 011.06.44L6.94 4.646A.5.5 0 007.293 4.5H12.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> Save Parts';
                btn.disabled = false;
              } else {
                btn.innerHTML = photoOriginalHTML;
                btn.disabled = false;
              }
            }, 'image/png');
          }).catch(function() { btn.innerHTML = photoOriginalHTML; btn.disabled = false; });
        }

        function saveForm() {
          if (isRestoring) return;
          const data = {};
          fieldIds.forEach(id => { data[id] = val(id); });
          radioNames.forEach(name => { const c = document.querySelector('input[name="'+name+'"]:checked'); data['radio_'+name] = c ? c.value : ''; });
          const parts = [];
          document.querySelectorAll('#partsList .part-card').forEach(card => {
            const inputs = card.querySelectorAll('input');
            const row = []; inputs.forEach(inp => row.push(inp.value)); parts.push(row);
          });
          data.parts = parts;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        function restoreForm() {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) { addPartRow(); return; }
          isRestoring = true;
          const data = JSON.parse(raw);
          fieldIds.forEach(id => { const el = document.getElementById(id); if (el && data[id] !== undefined) el.value = data[id]; });
          radioNames.forEach(name => { const v = data['radio_'+name]; if (v) { const r = document.querySelector('input[name="'+name+'"][value="'+v+'"]'); if (r) r.checked = true; } });
          if (data.parts && data.parts.length > 0) {
            data.parts.forEach(rowData => {
              addPartRow();
              const card = document.querySelector('#partsList .part-card:last-child');
              const ci = card.querySelectorAll('input');
              const tr = document.querySelector('#partsBody tr:last-child');
              const ti = tr.querySelectorAll('input');
              rowData.forEach((v,i) => { if(ci[i]) ci[i].value=v; if(ti[i]) ti[i].value=v; });
            });
          } else { addPartRow(); }
          isRestoring = false;
          updatePartView();
        }

        function addPartRow() {
          rowCount++;
          const n = rowCount;
          const total = document.querySelectorAll('#partsList .part-card').length + 1;

          const list = document.getElementById('partsList');
          const card = document.createElement('div');
          card.className = 'part-card'; card.dataset.row = n;
          card.innerHTML = '<div class="part-card-header"><div class="part-card-header-left"><div class="part-card-num">'+total+'</div><span class="part-card-label">Part '+total+'</span></div><button class="remove-btn" onclick="removeRow('+n+')">Remove</button></div><div class="part-card-fields"><div class="pf"><label>Description <span style="font-weight:400;color:#98a2b3;font-size:9px;">(type to search)</span></label><input type="text" placeholder="Start typing to search parts..." data-col="0"></div><div class="pf"><label>Part #</label><input type="text" placeholder="Auto-fills when selected" data-col="1"></div><div class="pf"><label>Quantity</label><input type="text" inputmode="numeric" placeholder="Enter quantity" data-col="2"></div><div class="pf"><label>Cost</label><input type="text" inputmode="decimal" placeholder="$0.00" data-col="3"></div><div class="pf"><label>Vendor</label><input type="text" placeholder="Enter vendor name" data-col="4"></div></div>';
          list.appendChild(card);

          const tbody = document.getElementById('partsBody');
          const tr = document.createElement('tr'); tr.dataset.row = n;
          tr.innerHTML = '<td class="row-num">'+total+'</td><td><input type="text" placeholder="Type to search..." data-col="0"></td><td><input type="text" placeholder="Part #" data-col="1"></td><td><input type="text" placeholder="Qty" data-col="2"></td><td><input type="text" placeholder="$0.00" data-col="3"></td><td><input type="text" placeholder="Vendor" data-col="4"></td><td style="text-align:center"><button class="remove-btn" onclick="removeRow('+n+')">&times;</button></td>';
          tbody.appendChild(tr);

          const ci = card.querySelectorAll('input'), ti = tr.querySelectorAll('input');

          // Add autocomplete to description inputs (data-col="0")
          const cardDescInput = ci[0];
          const cardPartNumInput = ci[1];
          const tableDescInput = ti[0];
          const tablePartNumInput = ti[1];

          // Card description autocomplete
          cardDescInput.addEventListener('input', function() {
            const results = searchParts(this.value);
            showAutocomplete(this, cardPartNumInput, results);
            if(ti[0]) ti[0].value = this.value;
            saveForm();
          });

          // Table description autocomplete
          tableDescInput.addEventListener('input', function() {
            const results = searchParts(this.value);
            showAutocomplete(this, tablePartNumInput, results);
            if(ci[0]) ci[0].value = this.value;
            saveForm();
          });

          // Sync other inputs normally
          ci.forEach((inp,i) => {
            if (i !== 0) { // Skip description, already handled
              inp.addEventListener('input', () => { if(ti[i]) ti[i].value=inp.value; saveForm(); });
            }
          });
          ti.forEach((inp,i) => {
            if (i !== 0) { // Skip description, already handled
              inp.addEventListener('input', () => { if(ci[i]) ci[i].value=inp.value; saveForm(); });
            }
          });

          if (!isRestoring) { currentPartIndex = document.querySelectorAll('#partsList .part-card').length - 1; saveForm(); }
          updatePartView();
        }

        function removeRow(n) {
          document.querySelector('#partsList .part-card[data-row="'+n+'"]')?.remove();
          document.querySelector('#partsBody tr[data-row="'+n+'"]')?.remove();
          renumberRows();
          const total = document.querySelectorAll('#partsList .part-card').length;
          if (total === 0) { addPartRow(); return; }
          if (currentPartIndex >= total) currentPartIndex = total - 1;
          updatePartView(); saveForm();
        }
        window.removeRow = removeRow;

        function renumberRows() {
          rowCount = 0;
          document.querySelectorAll('#partsList .part-card').forEach((card,i) => { rowCount=i+1; card.querySelector('.part-card-num').textContent=rowCount; card.querySelector('.part-card-label').textContent='Part '+rowCount; });
          document.querySelectorAll('#partsBody tr').forEach((tr,i) => { tr.querySelector('.row-num').textContent=i+1; });
        }

        function navigatePart(dir) {
          const total = document.querySelectorAll('#partsList .part-card').length;
          if (!total) return;
          currentPartIndex = Math.max(0, Math.min(total-1, currentPartIndex+dir));
          updatePartView();
        }

        function updatePartView() {
          const cards = document.querySelectorAll('#partsList .part-card');
          const total = cards.length;
          cards.forEach((c,i) => c.classList.toggle('active', i===currentPartIndex));
          const nav = document.getElementById('partNav');
          nav.style.display = total <= 1 ? 'none' : 'flex';
          const dots = document.getElementById('partDots'); dots.innerHTML = '';
          for (let i=0; i<total; i++) { const d=document.createElement('div'); d.className='part-nav-dot'+(i===currentPartIndex?' active':''); d.onclick=()=>{currentPartIndex=i;updatePartView();}; dots.appendChild(d); }
          document.getElementById('partPrev').disabled = currentPartIndex===0;
          document.getElementById('partNext').disabled = currentPartIndex>=total-1;
          const pc = document.getElementById('partCount');
          if (pc) pc.textContent = total > 0 ? total+' part'+(total!==1?'s':'')+' added' : '';
        }

        function resetForm() {
          if (confirm('Clear all fields? This cannot be undone.')) {
            document.querySelectorAll('#quoteForm input[type="text"], #quoteForm textarea').forEach(el => el.value='');
            document.querySelectorAll('#quoteForm select').forEach(el => el.selectedIndex=0);
            document.querySelectorAll('#quoteForm input[type="radio"]').forEach(el => el.checked=false);
            document.getElementById('partsList').innerHTML = '';
            document.getElementById('partsBody').innerHTML = '';
            rowCount = 0; currentPartIndex = 0;
            addPartRow();
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        function openGenerateModal() {
          document.getElementById('generateModal').classList.add('show');
          var ta = document.getElementById('jobInfoInput');
          ta.focus();
        }
        function closeGenerateModal() {
          document.getElementById('generateModal').classList.remove('show');
        }

        function generateFromJobInfo() {
          var text = val('jobInfoInput');
          if (!text.trim()) { return; }

          var customerName = '';
          var storeNumber = '';
          var woNumber = '';
          var equipmentType = '';
          var unitId = '';
          var manufacturer = '';
          var modelNumber = '';
          var serialNumber = '';

          var lines = text.split('\\n').map(function(l) { return l.trim(); });
          var allText = text;

          // Customer name & store number: line with " - " separator
          // Format: "STBU013922 - STARBUCKS 13922"
          for (var i = 0; i < lines.length; i++) {
            var dashMatch = lines[i].match(/^\\S+\\s+-\\s+(.+)/);
            if (dashMatch) {
              var nameAndStore = dashMatch[1].trim();
              // Store number is the trailing digits
              var storeMatch = nameAndStore.match(/^(.+?)\\s+(\\d{3,})\\s*$/);
              if (storeMatch) {
                customerName = storeMatch[1].trim();
                storeNumber = storeMatch[2].trim();
              } else {
                customerName = nameAndStore;
              }
              break;
            }
          }

          // Match WO number in various formats: SERVICEWO#: 4181959, WO: 123, WO# 456, WO #: 789, Work Order: 123, Work Order#: 456
          var woMatch = allText.match(/(?:SERVICEWO|Work\\s*Order|WO)\\s*#?\\s*:?\\s*([A-Za-z0-9\\-]+)/i);
          if (woMatch) woNumber = woMatch[1].trim();

          // Equipment line: "RIF 2  REACH IN FREEZER  REFR"
          // Unit ID is before the equipment type, equipment type is the middle part
          // Look for a line that has the equipment info (after a blank line, contains multiple segments)
          var equipLine = '';
          for (var j = 0; j < lines.length; j++) {
            // Skip lines that are labels (contain ":" like Make:, Model:, etc.)
            if (lines[j].match(/^(PROBLEM|Make|Model|Serial|Description|Service Area|Year|Service Type|Job Type|Cust PO|NTE|Complete|\\d)/i)) continue;
            if (lines[j].match(/:/)) continue;
            // Skip known header labels that start with uppercase (but NOT equipment unit IDs like AC, RTU, AHU)
            if (lines[j].match(/^(SERVICEWO|PROBLEM|DESCRIPTION|SERVICE AREA|CUSTOMER|ADDRESS|CITY|STATE|ZIP|PHONE|EMAIL|NOTES|STATUS|PRIORITY|DISPATCHED|SCHEDULED|COMPLETED|NTE|INVOICE|BILLING|WARRANTY|OPERATIONAL)/i)) continue;
            // Skip address lines (contain comma with state abbreviation)
            if (lines[j].match(/,\\s*[A-Z]{2},?\\s*\\d{5}/)) continue;
            // Skip the customer line (has " - ")
            if (lines[j].match(/\\s+-\\s+/)) continue;
            // Skip blank lines
            if (!lines[j]) continue;
            // This might be the equipment line - it typically has unit ID + equipment type + service code
            // Pattern: letters/numbers + spaces + equipment description + spaces + short code
            var eqMatch = lines[j].match(/^(.+?)\\s{2,}(.+?)\\s{2,}([A-Z]{2,})\\s*$/);
            if (eqMatch) {
              unitId = eqMatch[1].trim();
              equipmentType = eqMatch[2].trim();
              equipLine = lines[j];
              break;
            }
          }

          // If we didn't find the equipment line with double-space parsing, try another approach
          if (!equipLine) {
            for (var k = 0; k < lines.length; k++) {
              // Look for common equipment keywords on a line
              if (lines[k].match(/(?:REACH IN|WALK.IN|RTU|AHU|CONDENSER|COMPRESSOR|DISPLAY CASE|ICE MACHINE|ROOFTOP|SPLIT SYSTEM|HEAT PUMP|FURNACE|FREEZER|COOLER|EVAPORATOR|AIR HANDLER)/i)) {
                // Skip if it's the PROBLEM line
                if (lines[k].match(/^PROBLEM/i)) continue;
                var parts = lines[k].split(/\\s{2,}/);
                if (parts.length >= 2) {
                  unitId = parts[0].trim();
                  equipmentType = parts[1].trim();
                } else {
                  equipmentType = lines[k].trim();
                }
                break;
              }
            }
          }

          // Make / Manufacturer
          var makeMatch = allText.match(/Make\\s*:\\s*(.+)/im);
          if (makeMatch) manufacturer = makeMatch[1].trim();

          // Model
          var modelMatch = allText.match(/Model\\s*#?\\s*:\\s*(.+)/im);
          if (modelMatch) modelNumber = modelMatch[1].trim();

          // Serial #
          var serialMatch = allText.match(/Serial\\s*#?\\s*:\\s*(.+)/im);
          if (serialMatch) serialNumber = serialMatch[1].trim();

          // Set the values
          function setField(id, value) {
            if (value) {
              var el = document.getElementById(id);
              if (el) { el.value = value; }
            }
          }

          setField('customerName', customerName);
          setField('storeNumber', storeNumber);
          setField('woNumber', woNumber);
          setField('equipmentType', equipmentType);
          setField('unit', unitId);
          setField('manufacturer', manufacturer);
          setField('modelNumber', modelNumber);
          setField('serialNumber', serialNumber);

          saveForm();
          closeGenerateModal();
        }

        // ---- Parts Preset Functions ----
        const PRESET_KEY = 'componentQuotePresets';

        function getPresets() {
          try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || []; }
          catch(e) { return []; }
        }

        function setPresets(presets) {
          localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
        }

        function collectCurrentParts() {
          const parts = [];
          document.querySelectorAll('#partsList .part-card').forEach(function(card) {
            var inputs = card.querySelectorAll('input');
            var p = { desc: inputs[0]?.value||'', part: inputs[1]?.value||'', qty: inputs[2]?.value||'', cost: inputs[3]?.value||'', vendor: inputs[4]?.value||'' };
            if (p.desc || p.part || p.qty || p.cost || p.vendor) parts.push(p);
          });
          return parts;
        }

        function showPresetToast(msg) {
          var existing = document.querySelector('.preset-success');
          if (existing) existing.remove();
          var toast = document.createElement('div');
          toast.className = 'preset-success';
          toast.textContent = msg;
          document.body.appendChild(toast);
          setTimeout(function() { toast.remove(); }, 2000);
        }

        function openSavePresetModal() {
          var parts = collectCurrentParts();
          if (parts.length === 0) {
            showPresetToast('Add at least one part before saving a preset');
            return;
          }
          document.getElementById('presetNameInput').value = '';
          document.getElementById('savePresetModal').classList.add('show');
          document.getElementById('presetNameInput').focus();
        }

        function closeSavePresetModal() {
          document.getElementById('savePresetModal').classList.remove('show');
        }

        function savePreset() {
          var name = document.getElementById('presetNameInput').value.trim();
          if (!name) { document.getElementById('presetNameInput').focus(); return; }
          var parts = collectCurrentParts();
          if (parts.length === 0) { closeSavePresetModal(); return; }
          var presets = getPresets();
          presets.push({ id: Date.now().toString(), name: name, parts: parts, createdAt: new Date().toISOString() });
          setPresets(presets);
          closeSavePresetModal();
          showPresetToast('Preset "' + name + '" saved');
        }

        function openLoadPresetModal() {
          renderPresetList();
          document.getElementById('loadPresetModal').classList.add('show');
        }

        function closeLoadPresetModal() {
          document.getElementById('loadPresetModal').classList.remove('show');
        }

        function renderPresetList() {
          var container = document.getElementById('presetListContainer');
          var presets = getPresets();
          if (presets.length === 0) {
            container.innerHTML = '<div class="preset-empty">No presets saved yet</div>';
            return;
          }
          container.innerHTML = presets.map(function(p) {
            var date = new Date(p.createdAt).toLocaleDateString();
            return '<div class="preset-item" data-preset-id="' + p.id + '">' +
              '<div class="preset-item-info">' +
                '<div class="preset-item-name">' + esc(p.name) + '</div>' +
                '<div class="preset-item-meta">' + p.parts.length + ' part' + (p.parts.length !== 1 ? 's' : '') + ' &middot; ' + date + '</div>' +
                '<div class="preset-mode-btns" style="display:none">' +
                  '<button onclick="loadPreset(\\'' + p.id + '\\',\\'replace\\')">Replace All</button>' +
                  '<button onclick="loadPreset(\\'' + p.id + '\\',\\'add\\')">Add to Existing</button>' +
                '</div>' +
              '</div>' +
              '<div class="preset-item-actions">' +
                '<button class="preset-load-btn" onclick="showPresetModeChoice(\\'' + p.id + '\\')">Load</button>' +
                '<button class="preset-update-btn" onclick="updatePreset(\\'' + p.id + '\\')">&#9998;</button>' +
                '<button class="preset-delete-btn" onclick="deletePreset(\\'' + p.id + '\\')">&#128465;</button>' +
              '</div>' +
            '</div>';
          }).join('');
        }

        function showPresetModeChoice(id) {
          // Hide all mode buttons first
          document.querySelectorAll('.preset-mode-btns').forEach(function(el) { el.style.display = 'none'; });
          var item = document.querySelector('.preset-item[data-preset-id="' + id + '"]');
          if (item) {
            var btns = item.querySelector('.preset-mode-btns');
            if (btns) btns.style.display = 'flex';
          }
        }
        window.showPresetModeChoice = showPresetModeChoice;

        function loadPreset(id, mode) {
          var presets = getPresets();
          var preset = presets.find(function(p) { return p.id === id; });
          if (!preset) return;

          if (mode === 'replace') {
            // Clear all existing parts
            document.getElementById('partsList').innerHTML = '';
            document.getElementById('partsBody').innerHTML = '';
            rowCount = 0;
            currentPartIndex = 0;
          }

          // Add each preset part
          preset.parts.forEach(function(p) {
            addPartRow();
            var card = document.querySelector('#partsList .part-card:last-child');
            var tr = document.querySelector('#partsBody tr:last-child');
            var ci = card.querySelectorAll('input');
            var ti = tr.querySelectorAll('input');
            var vals = [p.desc, p.part, p.qty, p.cost, p.vendor];
            vals.forEach(function(v, i) {
              if (ci[i]) ci[i].value = v || '';
              if (ti[i]) ti[i].value = v || '';
            });
          });

          saveForm();
          closeLoadPresetModal();
          showPresetToast('Loaded "' + preset.name + '"');
        }
        window.loadPreset = loadPreset;

        function updatePreset(id) {
          var parts = collectCurrentParts();
          if (parts.length === 0) {
            showPresetToast('Add at least one part before updating');
            return;
          }
          var presets = getPresets();
          var preset = presets.find(function(p) { return p.id === id; });
          if (!preset) return;
          preset.parts = parts;
          setPresets(presets);
          renderPresetList();
          showPresetToast('Updated "' + preset.name + '"');
        }
        window.updatePreset = updatePreset;

        function deletePreset(id) {
          var presets = getPresets().filter(function(p) { return p.id !== id; });
          setPresets(presets);
          renderPresetList();
        }
        window.deletePreset = deletePreset;

        window.initQuoteForm = function() {
          fieldIds.forEach(id => { const el=document.getElementById(id); if(el){el.addEventListener('input',saveForm);el.addEventListener('change',saveForm);} });
          radioNames.forEach(name => document.querySelectorAll('input[name="'+name+'"]').forEach(r => r.addEventListener('change', saveForm)));

          document.getElementById('addPartBtn').addEventListener('click', addPartRow);
          document.getElementById('partPrev').addEventListener('click', () => navigatePart(-1));
          document.getElementById('partNext').addEventListener('click', () => navigatePart(1));
          document.getElementById('savePhotoBtn').addEventListener('click', saveAsPhoto);
          document.getElementById('resetBtn').addEventListener('click', resetForm);
          document.getElementById('generateBtn').addEventListener('click', openGenerateModal);
          document.getElementById('modalClose').addEventListener('click', closeGenerateModal);
          document.getElementById('modalCancel').addEventListener('click', closeGenerateModal);
          document.getElementById('modalGenerate').addEventListener('click', generateFromJobInfo);
          document.getElementById('generateModal').addEventListener('click', function(e) { if (e.target === this) closeGenerateModal(); });

          // Preset event listeners
          document.getElementById('savePresetBtn').addEventListener('click', openSavePresetModal);
          document.getElementById('loadPresetBtn').addEventListener('click', openLoadPresetModal);
          document.getElementById('savePresetClose').addEventListener('click', closeSavePresetModal);
          document.getElementById('savePresetCancel').addEventListener('click', closeSavePresetModal);
          document.getElementById('savePresetConfirm').addEventListener('click', savePreset);
          document.getElementById('savePresetModal').addEventListener('click', function(e) { if (e.target === this) closeSavePresetModal(); });
          document.getElementById('loadPresetClose').addEventListener('click', closeLoadPresetModal);
          document.getElementById('loadPresetCancel').addEventListener('click', closeLoadPresetModal);
          document.getElementById('loadPresetModal').addEventListener('click', function(e) { if (e.target === this) closeLoadPresetModal(); });
          // Allow Enter key to save preset
          document.getElementById('presetNameInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') savePreset(); });

          restoreForm();
        };

        if (document.readyState === 'complete') {
          window.initQuoteForm();
        } else {
          window.addEventListener('load', window.initQuoteForm);
        }
      `}</Script>
    </>
  );
}
