import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Building2, 
  MapPin, 
  Clock, 
  Phone, 
  CreditCard, 
  TrendingDown, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Download,
  MessageCircle,
  Share2
} from 'lucide-react';
import { Program, PaymentReceipt, Expense, ClubSettings, ProgramFinancialSummary } from '../types/club.ts';
import { downloadProgramAgreementPdf } from '../utils/pdfGenerator.ts';
import { ProgramAgreementModal } from './ProgramAgreementModal.tsx';

interface ProgramDetailModalProps {
  program: Program | null;
  receipts: PaymentReceipt[];
  expenses: Expense[];
  settings: ClubSettings;
  onClose: () => void;
  onRecordPayment: (program: Program) => void;
  onRecordExpense: (program: Program) => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  program,
  receipts,
  expenses,
  settings,
  onClose,
  onRecordPayment,
  onRecordExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'payments' | 'expenses'>('summary');
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  if (!program) return null;

  // Linked payments & expenses
  const programPayments = receipts.filter(r => r.programId === program.id);
  const programExpenses = expenses.filter(e => e.programId === program.id);

  // Financial calculations
  const approvedPayments = programPayments.filter(r => r.status === 'APPROVED');
  const pendingPayments = programPayments.filter(r => r.status === 'PENDING_APPROVAL');
  const rejectedPayments = programPayments.filter(r => r.status === 'REJECTED');

  const totalApprovedReceived = approvedPayments.reduce((sum, r) => {
    return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
  }, 0);

  const totalAdvanceAmount = approvedPayments
    .filter(r => r.paymentType === 'Advance')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalSubsequentPayments = totalApprovedReceived - totalAdvanceAmount;
  const totalPendingApproval = pendingPayments.reduce((sum, r) => sum + r.amount, 0);
  const totalRejected = rejectedPayments.reduce((sum, r) => sum + r.amount, 0);
  const totalRefunds = approvedPayments
    .filter(r => r.paymentType === 'Refund')
    .reduce((sum, r) => sum + r.amount, 0);

  const remainingBalanceDue = Math.max(0, program.totalContractAmount - totalApprovedReceived);
  const totalLocalExpenses = programExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Profits
  const expectedProfit = program.totalContractAmount - totalLocalExpenses;
  const actualProfit = totalApprovedReceived - totalLocalExpenses;

  // Status calculation
  let paymentStatus: 'FULLY RECEIVED' | 'PARTIALLY RECEIVED' | 'PAYMENT PENDING' | 'OVERPAYMENT' = 'PAYMENT PENDING';
  if (totalApprovedReceived > program.totalContractAmount) {
    paymentStatus = 'OVERPAYMENT';
  } else if (totalApprovedReceived === program.totalContractAmount && program.totalContractAmount > 0) {
    paymentStatus = 'FULLY RECEIVED';
  } else if (totalApprovedReceived > 0) {
    paymentStatus = 'PARTIALLY RECEIVED';
  } else {
    paymentStatus = 'PAYMENT PENDING';
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none">
        
        {/* Header Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg">{program.name}</h3>
                <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {program.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {program.type} • Organizer: {program.organizerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Nav Bar (Hidden in Print) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Contract & Financial Summary
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'payments'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Payments ({programPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Local Expenses ({programExpenses.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadProgramAgreementPdf(program, settings, receipts)}
              className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
              title="Download Official Agreement Contract PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Agreement PDF</span>
            </button>
            <button
              onClick={() => setIsAgreementModalOpen(true)}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
              title="Send Agreement to Client via WhatsApp or Share"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send Agreement</span>
            </button>
            <button
              onClick={() => onRecordPayment(program)}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Record Payment</span>
            </button>
            <button
              onClick={() => onRecordExpense(program)}
              className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>+ Add Expense</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm print:p-2 print:overflow-visible">
          
          {/* Printable Official Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.clubName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-contain rounded-xl border border-slate-300 p-1 bg-white flex-shrink-0"
                />
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{settings.clubName.toUpperCase()}</h1>
                <p className="text-xs font-semibold text-slate-600">{settings.villageTown} • Reg: {settings.registrationNo}</p>
                <p className="text-xs text-slate-500 italic">{settings.tagline}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold uppercase tracking-wider">
                PROGRAM CONTRACT & LEDGER
              </span>
              <p className="text-xs text-slate-500 mt-1">Ref ID: <strong className="text-slate-900 font-mono">{program.id}</strong></p>
              <p className="text-xs text-slate-500">Contract Date: <strong>{program.contractDate}</strong></p>
            </div>
          </div>

          {/* Section: Logistics & Organizer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Program Information
              </span>
              <h2 className="text-base font-bold text-slate-900">{program.name}</h2>
              <p className="text-xs text-indigo-700 font-semibold">{program.type}</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Event Date: <strong>{program.programDate}</strong></p>
                <p className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Timing: {program.startTime} - {program.endTime}</p>
                <p className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Venue: {program.venue} ({program.venueAddress})</p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Client / Organizer Information
              </span>
              <h3 className="text-base font-bold text-slate-900">{program.organizerName}</h3>
              {program.organizerCompany && <p className="text-xs text-slate-600 font-medium">{program.organizerCompany}</p>}
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Phone: {program.organizerPhone || 'N/A'}</p>
                <p className="flex items-center">
                  <span className="mr-1.5 font-bold">Status:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800">
                    {program.status}
                  </span>
                </p>
              </div>
            </div>

            {program.specialInstructions && (
              <div className="md:col-span-2 pt-2 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Special Instructions / Scope:</span>
                <p className="text-slate-600 italic mt-0.5">{program.specialInstructions}</p>
              </div>
            )}
          </div>

          {/* Section: Comprehensive Financial Calculation Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Financial Calculation & Balance Sheet
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                paymentStatus === 'FULLY RECEIVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                paymentStatus === 'OVERPAYMENT' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                paymentStatus === 'PARTIALLY RECEIVED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Contract Value</span>
                <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  {settings.currency} {program.totalContractAmount.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">Agreed contract fee</span>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Confirmed Received</span>
                <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                  {settings.currency} {totalApprovedReceived.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-600">Only approved payments</span>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-700 uppercase block">Pending Approval</span>
                <div className="text-lg sm:text-xl font-black text-amber-700 mt-1">
                  {settings.currency} {totalPendingApproval.toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-600">{pendingPayments.length} awaiting verification</span>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-700 uppercase block">Balance Due</span>
                <div className="text-lg sm:text-xl font-black text-rose-700 mt-1">
                  {settings.currency} {remainingBalanceDue.toLocaleString()}
                </div>
                <span className="text-[10px] text-rose-600">Outstanding collection</span>
              </div>
            </div>

            {/* Profit Summary Section */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-800 uppercase block">Total Local Expenses</span>
                <div className="text-lg font-black text-rose-700 mt-1">
                  {settings.currency} {totalLocalExpenses.toLocaleString()}
                </div>
                <span className="text-[10px] text-rose-500">Across {programExpenses.length} expense vouchers</span>
              </div>

              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200">
                <span className="text-[11px] font-semibold text-indigo-700 uppercase block">Expected Profit</span>
                <div className="text-lg font-black text-indigo-800 mt-1">
                  {settings.currency} {expectedProfit.toLocaleString()}
                </div>
                <span className="text-[10px] text-indigo-500">Contract minus all expenses</span>
              </div>

              <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200">
                <span className="text-[11px] font-semibold text-teal-800 uppercase block">Actual Current Profit</span>
                <div className="text-lg font-black text-teal-900 mt-1">
                  {settings.currency} {actualProfit.toLocaleString()}
                </div>
                <span className="text-[10px] text-teal-600">Confirmed receipts minus expenses</span>
              </div>
            </div>
          </div>

          {/* Section: Linked Payments Table */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Payment Records ({programPayments.length})</span>
              <span className="text-xs font-normal text-slate-500">Awaiting vs Confirmed</span>
            </h4>

            {programPayments.length === 0 ? (
              <div className="p-5 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                No payments recorded for this program yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
                      <th className="p-2.5">Receipt No & Date</th>
                      <th className="p-2.5">Type & Mode</th>
                      <th className="p-2.5">Submitted By</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5">
                          <span className="font-bold font-mono text-red-700">{p.receiptNo}</span>
                          <span className="text-[11px] text-slate-400 block">{p.date}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-medium text-slate-800">{p.paymentType}</span>
                          <span className="text-[10px] text-slate-400 block">{p.paymentMode}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-slate-700">{p.submittedBy}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {settings.currency} {p.amount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          {p.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              VERIFIED
                            </span>
                          ) : p.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={p.rejectionReason}>
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Linked Expenses Table */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider mb-2">
              Program Local Expenses ({programExpenses.length})
            </h4>

            {programExpenses.length === 0 ? (
              <div className="p-5 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                No local expenses recorded for this program yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
                      <th className="p-2.5">Voucher & Date</th>
                      <th className="p-2.5">Category & Description</th>
                      <th className="p-2.5">Paid To</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-2.5">
                          <span className="font-bold font-mono text-rose-700">{exp.voucherNo}</span>
                          <span className="text-[11px] text-slate-400 block">{exp.date}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800">{exp.title}</span>
                          <span className="text-[10px] text-slate-500 block">{exp.category}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-slate-700">{exp.paidTo}</span>
                          <span className="text-[10px] text-slate-400 block">{exp.paymentMode}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          -{settings.currency} {exp.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Official Signatures for Contract / Booking Sheet (Printable) */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="h-10 border-b border-slate-400 flex items-end justify-center font-bold text-slate-800 text-xs pb-1">
                {program.organizerName}
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1">Authorized Client / Organizer</p>
              <p className="text-[10px] text-slate-400">{program.organizerCompany || 'Organizer Representative'}</p>
            </div>

            <div>
              <div className="h-10 border-b border-slate-400 flex items-end justify-center font-bold text-slate-800 text-xs pb-1">
                {settings.secretaryName}
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1">General Secretary / President</p>
              <p className="text-[10px] text-slate-400">{settings.clubName}</p>
            </div>
          </div>
        </div>

        {/* Footer (Hidden in Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Program Agreement Download & Send Modal */}
      {isAgreementModalOpen && (
        <ProgramAgreementModal
          program={program}
          settings={settings}
          receipts={receipts}
          onClose={() => setIsAgreementModalOpen(false)}
        />
      )}
    </div>
  );
};
