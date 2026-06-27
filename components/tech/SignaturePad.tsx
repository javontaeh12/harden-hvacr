'use client';

import { useRef, useState, useEffect } from 'react';
import { Eraser, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface SignaturePadProps {
  workOrderId: string;
  signatureUrl: string | null;
  onSignatureSaved: (url: string) => void;
}

export default function SignaturePad({ workOrderId, signatureUrl, onSignatureSaved }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );

      const path = `service-reports/work-orders/${workOrderId}/signature-${Date.now()}.png`;
      const { error } = await supabase.storage.from('service-reports').upload(path, blob);
      if (error) throw error;

      const { data } = supabase.storage.from('service-reports').getPublicUrl(path);
      onSignatureSaved(data.publicUrl);
    } catch (err) {
      console.error('Signature save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (signatureUrl) {
    return (
      <div className="space-y-2">
        <div className="border border-border rounded-lg p-2 bg-white">
          <img src={signatureUrl} alt="Signature" className="w-full h-24 object-contain" />
        </div>
        <p className="text-xs text-green-600 text-center font-medium">Signature captured</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 pointer-events-none">
            Sign here
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={clear}
          disabled={!hasDrawn}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-sm text-steel disabled:opacity-40"
        >
          <Eraser className="w-4 h-4" />
          Clear
        </button>
        <button
          onClick={save}
          disabled={!hasDrawn || saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-ember text-white text-sm font-medium disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
