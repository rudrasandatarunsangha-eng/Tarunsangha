import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  MessageCircle, 
  Trash2, 
  Calendar, 
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Filter,
  X
} from 'lucide-react';
import { PaymentReceipt, ClubSettings } from '../types/club.ts';
import { exportReceiptsCsv } from '../utils/exportTools.ts';
import { downloadReceiptPdf } from '../utils/pdfGenerator.ts';
import { createWhatsAppChatUrl, formatReceiptWhatsAppMessage } from '../utils/whatsapp.ts';

interface ReceiptsListProps {
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  onNewReceipt: () => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  onDeleteReceipt: (receiptId: string) => void;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
}

export const ReceiptsList: React.FC<ReceiptsListProps> = ({
  receipts,
  settings,
  activeYear,
  onNewReceipt,
  onViewReceipt,
  onDeleteReceipt,
  isAdminUnlocked,
  onOpenPinModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(activeYear);
  const [receiptToDelete, setReceiptToDelete] = useState<PaymentReceipt | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      r.receiptNo.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      (r.programName && r.programName.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      r.collectorName.toLowerCase().includes(q) ||
      (r.transactionRef && r.transactionRef.toLowerCase().includes(q));

    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesPurpose = selectedPurpose === 'all' || r.purpose === selectedPurpose;
    const matchesYear = selectedYear === 'all' || r.financialYear === selectedYear;

    return matchesSearch && matchesStatus && matchesPurpose && matchesYear;
  });

  const totalFilteredAmount = filteredReceipts
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);

  const pendingFilteredAmount = filteredReceipts
    .filter(r => r.status === 'PENDING_APPROVAL')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleWhatsApp = (receipt: PaymentReceipt) => {
    const text = formatReceiptWhatsAppMessage(receipt, settings);
    const url = createWhatsAppChatUrl(receipt.phone, text);
    window.open(url, '_blank');
  };

  const handleDelete = (receipt: PaymentReceipt) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setReceiptToDelete(receipt);
    setDeleteError('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Payments & Receipts Ledger</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              {filteredReceipts.length} Total Receipts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generated Payment IDs, verified accounting statuses, PDF generation, instant printing & WhatsApp receipts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportReceiptsCsv(receipts)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            title="Download formatted CSV ledger for Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Google Sheets</span>
          </button>

          <button
            onClick={onNewReceipt}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Issue Receipt</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-emerald-200 block uppercase tracking-wider font-semibold">
            Confirmed Verified Revenue
          </span>
          <span className="text-2xl font-black text-white">
            {settings.currency} {totalFilteredAmount.toLocaleString()}
          </span>
          {pendingFilteredAmount > 0 && (
            <span className="text-xs text-amber-300 block font-medium mt-0.5">
              + {settings.currency}{pendingFilteredAmount.toLocaleString()} awaiting Admin verification
            </span>
          )}
        </div>
        <div className="text-xs text-emerald-100 flex items-center space-x-4">
          <div>
            <span className="text-emerald-300 block">Total Filtered</span>
            <span className="font-bold text-base text-white">{filteredReceipts.length} records</span>
          </div>
          <div className="border-l border-emerald-700 pl-4">
            <span className="text-emerald-300 block">Filter Year</span>
            <span className="font-bold text-base text-white">{selectedYear === 'all' ? 'All Years' : selectedYear}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Payment ID, Receipt No, Member, Program, Txn Ref..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Approval Statuses</option>
              <option value="APPROVED">APPROVED / Verified</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Financial Years</option>
              {(settings.financialYears && settings.financialYears.length > 0 ? settings.financialYears : [2024, 2025]).map(yr => (
                <option key={yr} value={yr}>
                  FY {yr - 1}-{yr} ({yr})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredReceipts.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">No payment records match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or issue a new receipt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">IDs & Date</th>
                  <th className="py-3 px-4">Payer / Program</th>
                  <th className="py-3 px-4">Type & Purpose</th>
                  <th className="py-3 px-4">Mode / Ref</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((r) => {
                  const isApproved = r.status === 'APPROVED';
                  const isPending = r.status === 'PENDING_APPROVAL';
                  const isRejected = r.status === 'REJECTED';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Payment ID, Receipt No & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{r.id}</div>
                        <div className="font-mono text-[11px] text-emerald-700 font-semibold">{r.receiptNo}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{r.date} (FY {r.financialYear})</div>
                      </td>

                      {/* Payer / Program */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.memberName}</div>
                        {r.programName ? (
                          <div className="text-[11px] text-indigo-700 font-semibold flex items-center space-x-1">
                            <Building2 className="w-3 h-3 inline flex-shrink-0" />
                            <span>{r.programName}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">
                            {r.villageWard || 'Member'} • {r.phone || 'No phone'}
                          </div>
                        )}
                      </td>

                      {/* Payment Type & Purpose */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-0.5">
                          {r.paymentType || 'Payment'}
                        </span>
                        <div className="font-semibold text-slate-800 text-xs">{r.purpose}</div>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{r.paymentMode}</div>
                        {r.transactionRef && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            Txn: {r.transactionRef}
                          </div>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3 h-3" />
                              <span>REJECTED</span>
                            </span>
                            {r.rejectionReason && (
                              <div className="text-[10px] text-rose-600 italic mt-0.5 truncate max-w-[120px]">
                                {r.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold text-base ${
                          r.paymentType === 'Refund' 
                            ? 'text-rose-600' 
                            : isApproved 
                            ? 'text-emerald-700' 
                            : isPending 
                            ? 'text-amber-600' 
                            : 'text-slate-400 line-through'
                        }`}>
                          {r.paymentType === 'Refund' ? '-' : '+'}{settings.currency}{r.amount.toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onViewReceipt(r)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="View & Print Official Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => downloadReceiptPdf(r, settings)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Download Receipt PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleWhatsApp(r)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Share on WhatsApp (You will press Send)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record (Admin Protected)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Delete Confirmation Modal */}
      {receiptToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Delete Payment Receipt</h3>
              </div>
              <button
                onClick={() => setReceiptToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to permanently delete this payment receipt?</p>
              <p>Receipt No: <strong>{receiptToDelete.receiptNo}</strong> ({receiptToDelete.id})</p>
              <p>Payer: <strong>{receiptToDelete.memberName}</strong></p>
              <p>Amount: <strong>{settings.currency} {receiptToDelete.amount.toLocaleString()}</strong></p>
              <p>Purpose: {receiptToDelete.purpose}</p>
              <p className="text-[11px] text-rose-700 mt-2 font-medium">
                This deletion will be permanently logged in administrative audit history.
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteReceipt(receiptToDelete.id);
                    setReceiptToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete receipt');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
