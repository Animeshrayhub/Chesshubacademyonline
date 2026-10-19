'use client';

import React, { useState } from 'react';
import type { PackageId } from '@/constants/PRICING';
import PublicCheckoutModal from './PublicCheckoutModal';

interface CashfreeCheckoutButtonProps {
  packageId: PackageId;
  packageName: string;
  amount: number;
  sessions: number;
  currency?: 'INR' | 'USD';
  className?: string;
  buttonText?: string;
  onSuccess?: () => void;
}

export default function CashfreeCheckoutButton({
  packageId,
  packageName,
  amount,
  sessions,
  currency = 'INR',
  className = '',
  buttonText,
}: CashfreeCheckoutButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaultText = buttonText || `Enroll in ${packageName}`;

  return (
    <>
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={
            className ||
            'w-full py-3.5 px-6 rounded-xl font-bold text-center transition-all duration-200 bg-primary hover:bg-primary-dark text-white shadow-md'
          }
        >
          {defaultText}
        </button>
      </div>

      <PublicCheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        packageId={packageId}
        currency={currency}
      />
    </>
  );
}
