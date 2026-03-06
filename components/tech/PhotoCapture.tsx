'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface PhotoCaptureProps {
  workOrderId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export default function PhotoCapture({ workOrderId, photos, onPhotosChange }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `service-reports/work-orders/${workOrderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from('service-reports').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(path);
      const newPhotos = [...photos, urlData.publicUrl];
      onPhotosChange(newPhotos);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }
    e.target.value = '';
  };

  const removePhoto = async (url: string) => {
    const supabase = createClient();
    const match = url.match(/service-reports\/.+/);
    if (match) {
      await supabase.storage.from('service-reports').remove([match[0]]);
    }
    onPhotosChange(photos.filter((p) => p !== url));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50"
        >
          <Camera className="w-5 h-5" />
          Camera
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50"
        >
          <ImageIcon className="w-5 h-5" />
          Gallery
        </button>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
