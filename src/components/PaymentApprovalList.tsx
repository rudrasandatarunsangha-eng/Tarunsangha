import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  ShieldCheck, 
  Printer, 
  FileText, 
  AlertCircle, 
  Filter, 
  History, 
  Calendar,
  Lock,
  ArrowRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { PaymentReceipt, PaymentAuditLog, ClubSettings } from '../types/club.ts';

interface PaymentApprovalListProps {
  receipts: PaymentReceipt[];
  auditLogs: PaymentAuditLog[];
  settings: ClubSettings;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
  onApprovePayment: (paymentId: string) => Promise<void>;
  onRejectPayment: (paymentId: string, reason: string) => Promise<void>;
  onViewReceipt: (receipt: PaymentReceipt) => void;
}

export const PaymentApprovalList: React.FC<PaymentApprovalListProps> = ({
  receipts,
  auditLogs,
  settings,
  isAdminUnlocked,
  onOpenPinModal,
  onApprovePayment,
  onRejectPayment,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'audit'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rejection modal state
  const [rejectingPayment, setRejectingPayment] = useState<PaymentReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pendingList = receipts.filter(r => r.status === 'PENDING_APPROVAL');
  const approvedList = receipts.filter(r => r.status === 'APPROVED');
  const rejectedList = receipts.filter(r => r.status === 'REJECTED');

  const getActiveList = () => {
    switch (activeTab) {
      case 'pending': return pendingList;
      case 'approved': return approvedList;
      case 'rejected': return rejectedList;
      case 'all': return receipts;
      default: return [];
    }
  };

  const filteredList = getActiveList().filter(r => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      r.receiptNo.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      (r.programName && r.programName.toLowerCase().includes(q)) ||
      (r.transactionRef && r.transactionRef.toLowerCase().includes(q)) ||
      r.submittedBy.toLowerCase().includes(q);
  });

  const handleApprove = async (payment: PaymentReceipt) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setIsProcessing(true);
    try {
      await onApprovePayment(payment.id);
    } catch (err: any) {
      alert(err.message || 'Failed to approve payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenReject = (payment: PaymentReceipt) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setRejectingPayment(payment);
    setRejectionReason('');
    setErrorMsg('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is required.');
      return;
    }
    if (!rejectingPayment) return;

    setIsProcessing(true);
    try {
      await onRejectPayment(rejectingPayment.id, rejectionReason.trim());
      setRejectingPayment(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Payment Verification & Admin Approvals</h2>
            {pendingList.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold animate-pulse border border-amber-300">
                {pendingList.length} Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-tier accounting safety: all submissions require authorized Administrator approval before confirming revenue.
          </p>
        </div>

        {/* Admin Status Indicator */}
        <div>
          {isAdminUnlocked ? (
            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
              <Check className="w-3.5 h-3.5 mr-1" /> Admin Authorized
            </span>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Admin Mode (PIN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60 text-xs font-bold">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approval ({pendingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Approved / Verified ({approvedList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected ({rejectedList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <span>All Records ({receipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ml-auto ${
            activeTab === 'audit'
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Main View: Payment List vs Audit Logs */}
      {activeTab !== 'audit' ? (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Receipt No, Payment ID, Payer Name, Program, or Transaction Ref..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Alert for Pending Queue */}
          {activeTab === 'pending' && pendingList.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{pendingList.length} Payment(s)</strong> awaiting Admin approval totaling{' '}
                  <strong>{settings.currency} {pendingList.reduce((s, r) => s + r.amount, 0).toLocaleString()}</strong>.
                  These payments are currently <em>excluded</em> from confirmed club revenue until verified.
                </span>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredList.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No payment records found in this view</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Receipt / Payment ID</th>
                      <th className="py-3 px-4">Payer & Program Details</th>
                      <th className="py-3 px-4">Payment Type & Mode</th>
                      <th className="py-3 px-4">Submission Info</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ID & Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-red-700 block">{payment.receiptNo}</span>
                          <span className="font-mono text-[11px] text-slate-400 block">{payment.id}</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">{payment.date}</span>
                        </td>

                        {/* Payer & Program */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{payment.memberName}</span>
                          {payment.programName ? (
                            <span className="text-[11px] font-semibold text-indigo-700 block truncate max-w-xs">
                              Program: {payment.programName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 block">
                              {payment.purpose}
                            </span>
                          )}
                          {payment.phone && <span className="text-[11px] text-slate-400">{payment.phone}</span>}
                        </td>

                        {/* Type & Mode */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">{payment.paymentType}</span>
                          <span className="text-[11px] text-slate-500 block">{payment.paymentMode}</span>
                          {payment.transactionRef && (
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[120px]">
                              Ref: {payment.transactionRef}
                            </span>
                          )}
                        </td>

                        {/* Submission */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-slate-700 block font-medium">By: {payment.submittedBy}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {payment.submissionDateTime ? new Date(payment.submissionDateTime).toLocaleString() : 'Recent'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-base text-emerald-700">
                            {settings.currency} {payment.amount.toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {payment.status === 'APPROVED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" /> VERIFIED
                            </span>
                          ) : payment.status === 'REJECTED' ? (
                            <div title={payment.rejectionReason}>
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center">
                                <XCircle className="w-3 h-3 mr-1" /> REJECTED
                              </span>
                              {payment.rejectionReason && (
                                <span className="text-[10px] text-rose-600 block mt-0.5 truncate max-w-[120px]">
                                  {payment.rejectionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center">
                              <Clock className="w-3 h-3 mr-1" /> PENDING
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* View / Print Receipt */}
                            <button
                              onClick={() => onViewReceipt(payment)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              title="View & Print Official Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Approve Button */}
                            {payment.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleApprove(payment)}
                                disabled={isProcessing}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                                title="Approve & Verify Payment"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Reject Button */}
                            {payment.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleOpenReject(payment)}
                                disabled={isProcessing}
                                className="flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                                title="Reject Payment with Reason"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audit Log Trail View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-500">Chronological history of payment submissions, approvals, and rejections.</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {auditLogs.length} Logged Events
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-3">Audit ID & Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Payment Ref</th>
                  <th className="p-3">Payer & Amount</th>
                  <th className="p-3">State Transition</th>
                  <th className="p-3">User / Admin ID</th>
                  <th className="p-3">Notes & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">{log.id}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono font-bold text-red-700">
                      {log.receiptNo}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 block">{log.payerName || 'N/A'}</span>
                      {log.amount !== undefined && (
                        <span className="text-emerald-700 font-bold">{settings.currency} {log.amount.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-slate-400">{log.previousStatus}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <strong className="text-slate-900">{log.newStatus}</strong>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.adminName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{log.adminId}</span>
                    </td>
                    <td className="p-3 text-slate-600 italic">
                      {log.rejectionReason ? `Reason: ${log.rejectionReason}` : log.notes || 'Normal transaction'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-base">Reject Payment Submission</h3>
              </div>
              <button
                onClick={() => setRejectingPayment(null)}
                className="p-1 rounded-lg text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4 text-sm">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Receipt:</strong> {rejectingPayment.receiptNo} ({rejectingPayment.id})</p>
                <p><strong>Payer:</strong> {rejectingPayment.memberName}</p>
                <p><strong>Amount:</strong> {settings.currency} {rejectingPayment.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction reference not found in bank statement / Duplicate entry."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingPayment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
