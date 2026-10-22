import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  CreditCard, 
  TrendingDown, 
  Eye, 
  Edit2, 
  Trash2, 
  MapPin, 
  Clock, 
  Building2, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Filter,
  DollarSign,
  X,
  Download,
  MessageCircle
} from 'lucide-react';
import { Program, Organizer, PaymentReceipt, Expense, ClubSettings, ProgramStatus } from '../types/club.ts';
import { downloadProgramAgreementPdf } from '../utils/pdfGenerator.ts';
import { ProgramAgreementModal } from './ProgramAgreementModal.tsx';

interface ProgramListProps {
  programs: Program[];
  organizers: Organizer[];
  receipts: PaymentReceipt[];
  expenses: Expense[];
  settings: ClubSettings;
  onAddProgram: () => void;
  onEditProgram: (program: Program) => void;
  onViewProgram: (program: Program) => void;
  onRecordPaymentForProgram: (program: Program) => void;
  onRecordExpenseForProgram: (program: Program) => void;
  onDeleteProgram: (programId: string) => void;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
}

export const ProgramList: React.FC<ProgramListProps> = ({
  programs,
  organizers,
  receipts,
  expenses,
  settings,
  onAddProgram,
  onEditProgram,
  onViewProgram,
  onRecordPaymentForProgram,
  onRecordExpenseForProgram,
  onDeleteProgram,
  isAdminUnlocked,
  onOpenPinModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [selectedAgreementProgram, setSelectedAgreementProgram] = useState<Program | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to compute program finances
  const getProgramFinance = (prog: Program) => {
    const progPayments = receipts.filter(r => r.programId === prog.id);
    const progExpenses = expenses.filter(e => e.programId === prog.id);

    const approvedPayments = progPayments.filter(r => r.status === 'APPROVED');
    const pendingPayments = progPayments.filter(r => r.status === 'PENDING_APPROVAL');

    const confirmedReceived = approvedPayments.reduce((sum, r) => {
      return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
    }, 0);

    const pendingAmount = pendingPayments.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = progExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balanceDue = Math.max(0, prog.totalContractAmount - confirmedReceived);

    const expectedProfit = prog.totalContractAmount - totalExpenses;
    const actualProfit = confirmedReceived - totalExpenses;

    let paymentBadge: 'FULLY RECEIVED' | 'PARTIALLY RECEIVED' | 'PAYMENT PENDING' | 'OVERPAYMENT' = 'PAYMENT PENDING';
    if (confirmedReceived > prog.totalContractAmount) {
      paymentBadge = 'OVERPAYMENT';
    } else if (confirmedReceived === prog.totalContractAmount && prog.totalContractAmount > 0) {
      paymentBadge = 'FULLY RECEIVED';
    } else if (confirmedReceived > 0) {
      paymentBadge = 'PARTIALLY RECEIVED';
    }

    return {
      confirmedReceived,
      pendingAmount,
      totalExpenses,
      balanceDue,
      expectedProfit,
      actualProfit,
      paymentBadge,
      paymentCount: progPayments.length,
      expenseCount: progExpenses.length,
    };
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.organizerName.toLowerCase().includes(q) ||
        (p.organizerCompany && p.organizerCompany.toLowerCase().includes(q)) ||
        p.venue.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
      const matchesType = selectedType === 'all' || p.type === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [programs, searchQuery, selectedStatus, selectedType]);

  // Overall totals across programs
  const totalContractValue = programs.reduce((sum, p) => sum + p.totalContractAmount, 0);
  const totalAllConfirmed = programs.reduce((sum, p) => sum + getProgramFinance(p).confirmedReceived, 0);
  const totalAllPending = programs.reduce((sum, p) => sum + getProgramFinance(p).pendingAmount, 0);
  const totalAllExpenses = programs.reduce((sum, p) => sum + getProgramFinance(p).totalExpenses, 0);

  const handleDelete = (program: Program) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setProgramToDelete(program);
    setDeleteError('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Program & Contract Management</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
              {filteredPrograms.length} of {programs.length} Programs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage events, festival contracts, organizer agreements, payment milestones, and local expenses.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onAddProgram}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Book New Program</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Contract Value</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {settings.currency} {totalContractValue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{programs.length} Event Contracts</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Confirmed Received</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {settings.currency} {totalAllConfirmed.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Approved payments only</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase block">Pending Approval</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {settings.currency} {totalAllPending.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Awaiting Admin Verification</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase block">Total Program Expenses</span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {settings.currency} {totalAllExpenses.toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Stage, sound & local logistics</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programs by Name, Organizer, Venue, or ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="w-full md:w-auto flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Booked">Booked</option>
              <option value="Upcoming">Upcoming</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="w-full md:w-auto flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="Cultural Festival">Cultural Festival</option>
              <option value="Sports Tournament">Sports Tournament</option>
              <option value="Blood Donation & Health Camp">Health / Blood Camp</option>
              <option value="Religious Festival / Puja">Puja / Religious</option>
            </select>
          </div>
        </div>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No programs found</p>
            <p className="text-xs text-slate-400 mt-1">Click '+ Book New Program' to register an event contract.</p>
          </div>
        ) : (
          filteredPrograms.map((program) => {
            const finance = getProgramFinance(program);
            return (
              <div
                key={program.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top: Status & Program ID */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      program.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      program.status === 'Upcoming' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      program.status === 'In Progress' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      program.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {program.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {program.id}
                    </span>
                  </div>

                  {/* Program Title */}
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {program.name}
                  </h3>

                  <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                    {program.type}
                  </p>

                  {/* Organizer Details */}
                  <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <p className="font-semibold text-slate-800 flex items-center">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{program.organizerName}</span>
                    </p>
                    {program.organizerCompany && (
                      <p className="text-[11px] text-slate-500 pl-4">{program.organizerCompany}</p>
                    )}
                    <p className="text-slate-500 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Date: {program.programDate} ({program.startTime})</span>
                    </p>
                    <p className="text-slate-500 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span className="truncate">{program.venue}</span>
                    </p>
                  </div>

                  {/* Contract Financial Breakdown */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Contract Value:</span>
                      <span className="font-bold text-slate-900">
                        {settings.currency} {program.totalContractAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-emerald-700 font-medium">Confirmed Received:</span>
                      <span className="font-bold text-emerald-700">
                        {settings.currency} {finance.confirmedReceived.toLocaleString()}
                      </span>
                    </div>

                    {finance.pendingAmount > 0 && (
                      <div className="flex justify-between items-center text-amber-700">
                        <span>Awaiting Verification:</span>
                        <span className="font-bold">{settings.currency} {finance.pendingAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-rose-700 font-medium">Balance Due:</span>
                      <span className="font-bold text-rose-700">
                        {settings.currency} {finance.balanceDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                      <span className="text-slate-500">Local Expenses:</span>
                      <span className="font-semibold text-rose-600">
                        -{settings.currency} {finance.totalExpenses.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center font-bold">
                      <span className="text-teal-800">Actual Net Profit:</span>
                      <span className={finance.actualProfit >= 0 ? 'text-teal-700' : 'text-rose-600'}>
                        {settings.currency} {finance.actualProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onViewProgram(program)}
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      title="View Contract, Ledger & Financial Statements"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadProgramAgreementPdf(program, settings, receipts)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="Download Program Agreement PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedAgreementProgram(program)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      title="Send Agreement via WhatsApp / Share"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditProgram(program)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Edit Program Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(program)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Program (Admin Authorized)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onRecordPaymentForProgram(program)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                      title="Record Payment for this Program"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>+ Payment</span>
                    </button>

                    <button
                      onClick={() => onRecordExpenseForProgram(program)}
                      className="flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors"
                      title="Record Local Expense for this Program"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>+ Exp</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Delete Confirmation Modal */}
      {programToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Delete Program Contract</h3>
              </div>
              <button
                onClick={() => setProgramToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to permanently delete this program contract?</p>
              <p>Program: <strong>{programToDelete.name}</strong> ({programToDelete.id})</p>
              <p>Contract Amount: {settings.currency} {programToDelete.totalContractAmount.toLocaleString()}</p>
              <p>Venue: {programToDelete.venue}</p>
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
                onClick={() => setProgramToDelete(null)}
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
                    await onDeleteProgram(programToDelete.id);
                    setProgramToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete program');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Program'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Agreement Send & Download Modal */}
      {selectedAgreementProgram && (
        <ProgramAgreementModal
          program={selectedAgreementProgram}
          settings={settings}
          receipts={receipts}
          onClose={() => setSelectedAgreementProgram(null)}
        />
      )}
    </div>
  );
};
