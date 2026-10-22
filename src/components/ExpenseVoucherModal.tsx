import React from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { Expense, ClubSettings } from '../types/club.ts';

interface ExpenseVoucherModalProps {
  expense: Expense;
  settings: ClubSettings;
  onClose: () => void;
}

export const ExpenseVoucherModal: React.FC<ExpenseVoucherModalProps> = ({
  expense,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2 text-rose-600">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">Official Expense Voucher</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div id="printable-expense-voucher" className="border-2 border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 bg-amber-50/20">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {settings.clubName}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {settings.villageTown} • Reg: {settings.registrationNo}
            </p>
            {settings.tagline && (
              <p className="text-[11px] text-slate-500 italic mt-0.5">{settings.tagline}</p>
            )}
            <div className="inline-block mt-3 px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-full">
              Debit Payment Voucher
            </div>
          </div>

          {/* Voucher Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Voucher No:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{expense.voucherNo || expense.id}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Date:</span>
              <span className="font-bold text-slate-900">{expense.date}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Financial Year:</span>
              <span className="font-bold text-slate-900">{expense.financialYear}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Expense Type:</span>
              <span className="font-bold text-rose-700 uppercase">{expense.expenseType || 'Local Expense'}</span>
            </div>
          </div>

          {/* Main Info Box */}
          <div className="bg-white rounded-xl border border-slate-300 p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Paid To (Vendor / Person):</span>
              <span className="font-bold text-slate-900 text-sm">{expense.paidTo}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Category / Account Head:</span>
              <span className="font-bold text-slate-900">{expense.category}</span>
            </div>
            {expense.programName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Linked Program / Event:</span>
                <span className="font-bold text-indigo-700">{expense.programName}</span>
              </div>
            )}
            <div className="py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold block mb-1">Particulars / Description:</span>
              <p className="font-medium text-slate-900 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200">
                {expense.title}
              </p>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Payment Mode:</span>
              <span className="font-bold text-slate-900">{expense.paymentMode || 'Cash'}</span>
            </div>
            {expense.billRef && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Bill / Invoice Reference:</span>
                <span className="font-mono font-medium text-slate-800">{expense.billRef}</span>
              </div>
            )}
            {expense.remarks && (
              <div className="py-1">
                <span className="text-slate-500 font-semibold block mb-0.5">Remarks:</span>
                <span className="text-slate-700 italic">{expense.remarks}</span>
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-rose-800 uppercase block tracking-wider">Amount Paid</span>
              <span className="text-xs text-rose-700 font-medium">Passed for Payment</span>
            </div>
            <div className="text-2xl font-black text-rose-700">
              {settings.currency} {expense.amount.toLocaleString()}
            </div>
          </div>

          {/* Authorization & Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                {expense.enteredBy || 'Cashier'}
              </div>
              <span className="text-[10px] text-slate-500">Prepared By</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                {expense.approvedBy || settings.treasurerName || 'Treasurer'}
              </div>
              <span className="text-[10px] text-slate-500">Passed By (Treasurer)</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                {settings.secretaryName || 'President / Secretary'}
              </div>
              <span className="text-[10px] text-slate-500">Authorized Signatory</span>
            </div>
          </div>
        </div>

        {/* Modal Actions Bottom */}
        <div className="flex items-center justify-end space-x-3 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Voucher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
