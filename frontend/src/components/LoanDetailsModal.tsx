'use client';

import { useQuery } from '@tanstack/react-query';
import { loansApi } from '@/lib/api';
import Link from 'next/link';

interface LoanDetailsModalProps {
  loanId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LoanDetailsModal({ loanId, isOpen, onClose }: LoanDetailsModalProps) {
  const { data: loanData } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => loansApi.get(loanId).then(r => r.data),
    enabled: isOpen && !!loanId,
  });

  const loan = loanData?.data;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Loan Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loan ? (
            <>
              {/* Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Loan ID</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{loan.loanNumber || loan.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    loan.status === 'ACTIVE' ? 'badge-active' :
                    loan.status === 'OVERDUE' ? 'badge-overdue' :
                    'badge-closed'
                  }`}>{loan.status}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Loan Type</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{loan.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Amount</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">₹{loan.amount?.toLocaleString()}</p>
                </div>
              </div>

              {/* Repayment Info */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Repayment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">EMI Amount</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">₹{loan.emiAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Tenure</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{loan.tenure} months</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Interest Rate</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{loan.interestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Start Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(loan.startDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Customer</h3>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Name</p>
                  <Link href={`/customers`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {loan.customer?.name}
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex gap-3">
                <Link href={`/loans`} className="flex-1 btn btn-amber justify-center">
                  View All Loans
                </Link>
                <button onClick={onClose} className="flex-1 btn">
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-amber-600 rounded-full mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading loan details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
