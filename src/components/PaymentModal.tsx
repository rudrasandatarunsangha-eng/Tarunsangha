import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  User, 
  Calendar, 
  IndianRupee, 
  CreditCard, 
  Check, 
  AlertCircle,
  Building2,
  ShieldCheck,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  Member, 
  MemberCategory, 
  PaymentReceipt, 
  PaymentPurpose, 
  PaymentMode, 
  PaymentType, 
  Program, 
  ClubSettings 
} from '../types/club.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  programs?: Program[];
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  preSelectedMemberId?: string;
  preSelectedProgramId?: string;
  isAdminUnlocked?: boolean;
  onSavePayment: (receiptData: Partial<PaymentReceipt>) => Promise<PaymentReceipt>;
  onReceiptSuccess: (receipt: PaymentReceipt) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  members,
  programs = [],
  receipts,
  settings,
  activeYear,
  preSelectedMemberId,
  preSelectedProgramId,
  isAdminUnlocked = false,
  onSavePayment,
  onReceiptSuccess,
}) => {
  const [payerType, setPayerType] = useState<'member' | 'program' | 'custom'>(
    preSelectedProgramId ? 'program' : 'member'
  );

  const [selectedMemberId, setSelectedMemberId] = useState<string>(preSelectedMemberId || '');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(preSelectedProgramId || '');

  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customWard, setCustomWard] = useState('Ward No. 1');

  const [financialYear, setFinancialYear] = useState<number>(activeYear);
  const [paymentType, setPaymentType] = useState<PaymentType>('Subscription Fee');
  const [purpose, setPurpose] = useState<string>('Annual Club Membership Fee');
  const [amount, setAmount] = useState<number>(settings.defaultAnnualClubFee);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittedBy, setSubmittedBy] = useState(settings.treasurerName);
  const [collectorName, setCollectorName] = useState(settings.treasurerName);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [saveAsApproved, setSaveAsApproved] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync props and reset default collector when opened
  useEffect(() => {
    if (isOpen) {
      setCollectorName(settings.treasurerName || 'Rajesh Das (Treasurer)');
      setSubmittedBy(settings.treasurerName || 'Rajesh Das (Treasurer)');
    }
    if (preSelectedProgramId) {
      setPayerType('program');
      setSelectedProgramId(preSelectedProgramId);
    } else if (preSelectedMemberId) {
      setPayerType('member');
      setSelectedMemberId(preSelectedMemberId);
    }
  }, [preSelectedMemberId, preSelectedProgramId, isOpen, settings.treasurerName]);

  // When Program is selected
  useEffect(() => {
    if (payerType === 'program' && selectedProgramId) {
      const prog = programs.find(p => p.id === selectedProgramId);
      if (prog) {
        setPurpose(`Contract Payment: ${prog.name}`);
        setPaymentType('Part Payment');

        // Calculate current balance due on this program
        const confirmed = receipts
          .filter(r => r.programId === prog.id && r.status === 'APPROVED')
          .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);

        const due = Math.max(0, prog.totalContractAmount - confirmed);
        setAmount(due > 0 ? due : 5000);
      }
    }
  }, [payerType, selectedProgramId, programs, receipts]);

  // When Member is selected
  useEffect(() => {
    if (payerType === 'member' && selectedMemberId) {
      const mem = members.find(m => m.id === selectedMemberId);
      if (mem) {
        setPaymentType('Subscription Fee');
        if (mem.category === 'village_resident') {
          setPurpose('Annual Village Contribution');
          setAmount(settings.defaultAnnualVillageFee);
        } else if (mem.category === 'club_member') {
          setPurpose('Annual Club Membership Fee');
          setAmount(settings.defaultAnnualClubFee);
        } else {
          setPurpose('Special Donation');
          setAmount(1000);
        }
      }
    }
  }, [payerType, selectedMemberId, members, settings]);

  if (!isOpen) return null;

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  // Dues calculations
  let targetFee = 0;
  let paidSoFar = 0;
  let balanceDue = 0;

  if (payerType === 'member' && selectedMember) {
    targetFee = selectedMember.category === 'club_member' 
      ? settings.defaultAnnualClubFee 
      : selectedMember.category === 'village_resident' 
      ? settings.defaultAnnualVillageFee 
      : 0;

    paidSoFar = receipts
      .filter(r => r.memberId === selectedMember.id && r.financialYear === financialYear && r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount, 0);

    balanceDue = Math.max(0, targetFee - paidSoFar);
  } else if (payerType === 'program' && selectedProgram) {
    targetFee = selectedProgram.totalContractAmount;
    paidSoFar = receipts
      .filter(r => r.programId === selectedProgram.id && r.status === 'APPROVED')
      .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);

    balanceDue = Math.max(0, targetFee - paidSoFar);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || amount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      let memberName = customName;
      let memberCategory: MemberCategory = 'village_resident';
      let phone = customPhone;
      let villageWard = customWard;
      let organizerId: string | undefined = undefined;
      let organizerName: string | undefined = undefined;
      let programId: string | undefined = undefined;
      let programName: string | undefined = undefined;

      if (payerType === 'member' && selectedMember) {
        memberName = selectedMember.name;
        memberCategory = selectedMember.category;
        phone = selectedMember.phone;
        villageWard = selectedMember.villageWard;
      } else if (payerType === 'program' && selectedProgram) {
        memberName = `${selectedProgram.organizerName} (${selectedProgram.name})`;
        organizerId = selectedProgram.organizerId;
        organizerName = selectedProgram.organizerName;
        programId = selectedProgram.id;
        programName = selectedProgram.name;
        phone = selectedProgram.organizerPhone || '';
        villageWard = selectedProgram.venue;
      }

      const receiptPayload: Partial<PaymentReceipt> = {
        payerType: payerType === 'program' ? 'organizer' : payerType === 'custom' ? 'direct' : 'member',
        memberId: payerType === 'member' && selectedMember ? selectedMember.id : undefined,
        memberName,
        memberCategory: payerType === 'member' ? memberCategory : undefined,
        organizerId,
        organizerName,
        programId,
        programName,
        phone,
        villageWard,
        financialYear: Number(financialYear),
        date,
        paymentType,
        purpose,
        amount: Number(amount),
        paymentMode,
        transactionRef: transactionRef.trim(),
        submittedBy: submittedBy.trim() || 'Desk Collector',
        collectorName: collectorName.trim() || settings.treasurerName,
        status: saveAsApproved ? 'APPROVED' : 'PENDING_APPROVAL',
        remarks,
      };

      const savedReceipt = await onSavePayment(receiptPayload);
      setIsSubmitting(false);
      onClose();
      onReceiptSuccess(savedReceipt);
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-lg">Record Payment Entry</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Payer Type Tabs */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs uppercase tracking-wider">
              1. Select Payment Account Category:
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setPayerType('member')}
                className={`py-2 rounded-lg transition-all ${
                  payerType === 'member'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Club Member
              </button>
              <button
                type="button"
                onClick={() => setPayerType('program')}
                className={`py-2 rounded-lg transition-all ${
                  payerType === 'program'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Program Contract
              </button>
              <button
                type="button"
                onClick={() => setPayerType('custom')}
                className={`py-2 rounded-lg transition-all ${
                  payerType === 'custom'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Direct / Donor
              </button>
            </div>
          </div>

          {/* Member Selector */}
          {payerType === 'member' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Registered Member:</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">-- Choose Registered Member --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id}) • {m.category === 'village_resident' ? 'Village' : m.category === 'club_member' ? 'Club' : 'Patron'} • {m.villageWard}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Program Selector */}
          {payerType === 'program' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Program Event / Contract:</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">-- Choose Program Contract --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) • Org: {p.organizerName} • Contract: {settings.currency}{p.totalContractAmount.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Direct / Donor */}
          {payerType === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Donor / Payer Name *</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+91 98300..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* Due Helper Card */}
          {(selectedMember || selectedProgram) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">
                  {selectedMember ? selectedMember.name : selectedProgram?.name}
                </span>
                <span className="text-slate-500">
                  Target: {settings.currency}{targetFee.toLocaleString()} | Confirmed Paid: {settings.currency}{paidSoFar.toLocaleString()}
                </span>
              </div>
              {balanceDue > 0 ? (
                <button
                  type="button"
                  onClick={() => setAmount(balanceDue)}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg transition-colors text-xs"
                >
                  Pay Due ({settings.currency}{balanceDue.toLocaleString()})
                </button>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" /> Fully Received
                </span>
              )}
            </div>
          )}

          {/* Payment Type & FY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Subscription Fee">Subscription Fee</option>
                <option value="Advance">Contract Advance</option>
                <option value="Part Payment">Part Payment</option>
                <option value="Final Payment">Final Payment</option>
                <option value="Donation">Special Donation</option>
                <option value="Refund">Refund / Return</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Financial Year</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {(settings.financialYears && settings.financialYears.length > 0 ? settings.financialYears : [2024, 2025]).map(yr => (
                  <option key={yr} value={yr}>
                    FY {yr - 1}-{yr} ({yr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Purpose / Head Description:</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Amount & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount ({settings.currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">
                  {settings.currency}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Cash">Cash (In-Hand)</option>
                <option value="UPI / GPay / PhonePe">UPI / Online</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Transaction Ref & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Transaction Reference / UPI ID
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UPI/26039912 (Unique)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Submitted By & Collector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Submitted By (User / Desk)</label>
              <input
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Received / Handled By</label>
              <input
                type="text"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Part payment deposited towards stadium booking"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Approval Notice */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-emerald-950 font-medium">
                {saveAsApproved
                  ? 'Confirmed receipt will be issued and recorded in the Day-Wise Collection Ledger.'
                  : 'Save entry as pending approval for later admin verification.'}
              </span>
            </div>
            <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-emerald-800 flex-shrink-0 ml-2">
              <input
                type="checkbox"
                checked={saveAsApproved}
                onChange={(e) => setSaveAsApproved(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>Immediate Approval</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Submit Payment Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
