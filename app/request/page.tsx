'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BookingForm from '@/components/BookingForm';
import { XIcon } from '@/components/icons';

export default function RequestPage() {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Header with logo and close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button onClick={goBack} className="flex items-center">
          <Image
            src="/logo.png"
            alt="Harden HVAC & Refrigeration"
            width={360}
            height={120}
            className="h-10 sm:h-16 w-auto"
            priority
          />
        </button>
        <button
          onClick={goBack}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Form fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 sm:pb-8">
        <BookingForm />
      </div>
    </div>
  );
}
