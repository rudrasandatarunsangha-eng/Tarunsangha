import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  User, 
  Receipt, 
  Calendar, 
  Printer, 
  Download, 
  QrCode as QrCodeIcon, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Droplet, 
  Upload, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  BadgeCheck,
  AlertCircle,
  MessageCircle,
  Share2,
  Lock,
  Key,
  Layers,
  FileSpreadsheet,
  Check,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Send,
  Plus
} from 'lucide-react';
import { 
  Member, 
  PaymentReceipt, 
  ClubSettings, 
  AppUser, 
  CustomerSelection, 
  SelectionStatus 
} from '../types/club.ts';
import { MemberIdCard } from './MemberIdCard.tsx';
import { 
  updateMember, 
  changeSelfPassword,
  submitForgotPasswordRequest,
  resetPasswordWithToken,
  getCustomerSelections, 
  submitCustomerSelection, 
  cancelCustomerSelection 
} from '../services/api.ts';
import { downloadMemberIdCardPdf } from '../utils/pdfGenerator.ts';
import { createMemberIdCardWhatsAppUrl } from '../utils/whatsapp.ts';
import { exportMemberLedgerCsv } from '../utils/exportTools.ts';

interface CustomerPortalProps {
  currentUser: AppUser;
  member: Member | null;
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  onRefreshData: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentUser,
  member,
  receipts,
  settings,
  activeYear,
  onViewReceipt,
  onRefreshData,
}) => {
  const [activePortalTab, setActivePortalTab] = useState<
    'overview' | 'id_card' | 'ledger' | 'selections' | 'profile'
  >('overview');

  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [bloodGroupInput, setBloodGroupInput] = useState(member?.bloodGroup || '');
  const [phoneInput, setPhoneInput] = useState(member?.phone || currentUser.phone || '');
  const [addressInput, setAddressInput] = useState(member?.address || '');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Customer Selection State
  const [selections, setSelections] = useState<CustomerSelection[]>([]);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);
  const [isNewSelectionModalOpen, setIsNewSelectionModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCategory, setNewCustomerCategory] = useState('Scholarship / Education Grant');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerReason, setNewCustomerReason] = useState('');
  const [selectionSubmitMsg, setSelectionSubmitMsg] = useState('');
  const [selectionSubmitErr, setSelectionSubmitErr] = useState('');
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

  // Fallback member representation if none linked directly
  const activeMember: Member = member || {
    id: currentUser.memberId || currentUser.username || 'MEM-001',
    name: currentUser.fullName,
    phone: currentUser.phone || '+91 98000 00000',
    category: 'club_member',
    villageWard: settings.villageTown || 'Gramin Para',
    address: 'Club Member Residence',
    joinedYear: 2024,
    status: 'active',
    bloodGroup: 'B+',
    createdAt: currentUser.createdAt || new Date().toISOString(),
  };

  // Filter receipts for this member
  const memberReceipts = useMemo(() => {
    return receipts
      .filter(r => 
        (member && r.memberId === member.id) ||
        r.memberId === activeMember.id ||
        (r.phone && r.phone === currentUser.phone) ||
        r.memberName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, member, activeMember.id, currentUser]);

  // Today's date calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReceipts = memberReceipts.filter(r => r.date === todayStr && r.status === 'APPROVED');
  const todayTotalPaid = todayReceipts.reduce((sum, r) => sum + r.amount, 0);

  // All-time Total Paid
  const totalLifetimePaid = memberReceipts
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.amount, 0);

  // Active Financial Year calculations
  const currentYearReceipts = memberReceipts.filter(r => r.financialYear === activeYear && r.status === 'APPROVED');
  const currentYearPaid = currentYearReceipts.reduce((sum, r) => sum + r.amount, 0);

  const expectedAnnualFee = activeMember.category === 'club_member'
    ? settings.defaultAnnualClubFee
    : (settings.defaultAnnualResidentFee ?? settings.defaultAnnualVillageFee);

  const dueBalance = Math.max(0, expectedAnnualFee - currentYearPaid);

  // Monthly subscription history breakdown for activeYear
  const monthlyHistory = useMemo(() => {
    const months = [
      { num: '04', name: 'Apr' },
      { num: '05', name: 'May' },
      { num: '06', name: 'Jun' },
      { num: '07', name: 'Jul' },
      { num: '08', name: 'Aug' },
      { num: '09', name: 'Sep' },
      { num: '10', name: 'Oct' },
      { num: '11', name: 'Nov' },
      { num: '12', name: 'Dec' },
      { num: '01', name: 'Jan' },
      { num: '02', name: 'Feb' },
      { num: '03', name: 'Mar' },
    ];

    return months.map(m => {
      const monthPaid = currentYearReceipts
        .filter(r => {
          const rMonth = r.date.split('-')[1];
          return rMonth === m.num;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        ...m,
        amount: monthPaid,
        hasPaid: monthPaid > 0,
      };
    });
  }, [currentYearReceipts]);

  // Build Comprehensive Personal Membership Ledger Transactions with Running Balance
  const ledgerTransactions = useMemo(() => {
    // Generate chronologically ordered ledger entries
    // 1. Annual dues charge (Debit)
    const entries: Array<{
      date: string;
      txnId: string;
      receiptNo: string;
      description: string;
      type: string;
      mode: string;
      debit: number;
      credit: number;
      balance: number;
      status: string;
      collector: string;
    }> = [];

    // Add initial Annual Dues assessment debit
    const assessmentDate = `${activeYear - 1}-04-01`;
    entries.push({
      date: assessmentDate,
      txnId: `ASSESS-${activeYear}`,
      receiptNo: 'LEDGER-DUE',
      description: `Annual Membership Assessment (FY ${activeYear - 1}-${activeYear})`,
      type: 'Membership Subscription',
      mode: 'System Billing',
      debit: expectedAnnualFee,
      credit: 0,
      balance: expectedAnnualFee,
      status: 'Assessed',
      collector: settings.treasurerName,
    });

    // Add all payments in chronological order (Credits)
    const sortedReceiptsAsc = [...memberReceipts]
      .filter(r => r.financialYear === activeYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBal = expectedAnnualFee;

    sortedReceiptsAsc.forEach((r) => {
      const isApproved = r.status === 'APPROVED';
      const creditAmt = isApproved ? r.amount : 0;
      if (isApproved) {
        runningBal = Math.max(0, runningBal - creditAmt);
      }
      entries.push({
        date: r.date,
        txnId: r.id,
        receiptNo: r.receiptNo,
        description: r.purpose || 'Membership Subscription Payment',
        type: r.paymentType || 'Subscription',
        mode: r.paymentMode,
        debit: 0,
        credit: r.amount,
        balance: runningBal,
        status: r.status,
        collector: r.collectorName || r.submittedBy || settings.treasurerName,
      });
    });

    return entries;
  }, [activeYear, expectedAnnualFee, memberReceipts, settings]);

  // Load customer selections
  const loadSelections = async () => {
    setIsLoadingSelections(true);
    try {
      const data = await getCustomerSelections();
      setSelections(data);
    } catch (err) {
      console.error('Failed to load customer selections:', err);
    } finally {
      setIsLoadingSelections(false);
    }
  };

  useEffect(() => {
    loadSelections();
  }, []);

  // Handle Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    try {
      setIsUpdatingPhoto(true);
      setSaveStatus('');
      setErrorMessage('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await updateMember(member.id, { photoUrl: base64 });
        setSaveStatus('Photo successfully updated on your Official Membership Card!');
        setIsUpdatingPhoto(false);
        onRefreshData();
        setTimeout(() => setSaveStatus(''), 4000);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage('Failed to update photo: ' + err.message);
      setIsUpdatingPhoto(false);
    }
  };

  // Handle Save Profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      setSaveStatus('Saving profile...');
      setErrorMessage('');
      await updateMember(member.id, {
        bloodGroup: bloodGroupInput.trim(),
        phone: phoneInput.trim(),
        address: addressInput.trim(),
      });
      setSaveStatus('Profile updated successfully!');
      onRefreshData();
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err: any) {
      setErrorMessage('Failed to update profile: ' + err.message);
    }
  };

  // Handle Direct Self Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }
    if (newPasswordInput.length < 4) {
      setPasswordErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const msg = await changeSelfPassword(currentPasswordInput, newPasswordInput);
      setPasswordSuccessMsg(msg || 'Password updated successfully!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => setPasswordSuccessMsg(''), 5000);
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Submit Customer Selection Request
  const handleSubmitSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectionSubmitMsg('');
    setSelectionSubmitErr('');

    if (!newCustomerName.trim()) {
      setSelectionSubmitErr('Please enter the customer / beneficiary name.');
      return;
    }

    setIsSubmittingSelection(true);
    try {
      const res = await submitCustomerSelection({
        customerName: newCustomerName.trim(),
        category: newCustomerCategory,
        phone: newCustomerPhone.trim() || undefined,
        reason: newCustomerReason.trim() || undefined,
        memberId: activeMember.id,
        memberName: activeMember.name,
      });

      setSelectionSubmitMsg(res.message || 'Selection request submitted for Admin review!');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerReason('');
      setIsNewSelectionModalOpen(false);
      loadSelections();
      setTimeout(() => setSelectionSubmitMsg(''), 4000);
    } catch (err: any) {
      setSelectionSubmitErr(err?.message || 'Failed to submit selection request');
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  // Handle cancel selection
  const handleCancelSelection = async (selId: string) => {
    if (!window.confirm('Are you sure you want to cancel this selection request?')) return;
    try {
      await cancelCustomerSelection(selId);
      loadSelections();
      setSaveStatus('Selection request cancelled.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner - Member ID Card Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4 sm:space-x-5">
            {activeMember.photoUrl ? (
              <img
                src={activeMember.photoUrl}
                alt={activeMember.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-3xl shadow-lg shadow-emerald-500/20">
                {activeMember.name.charAt(0) || 'M'}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Verified Club Member</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                  {activeMember.category === 'club_member' ? 'Core Member' : 'Village Resident'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                  activeMember.status === 'active' 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  Status: {activeMember.status.toUpperCase()}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {activeMember.name}
              </h1>

              {/* User ID & Member ID */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs sm:text-sm text-slate-300 font-medium">
                <div className="flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                  <span className="text-slate-400">User ID:</span>
                  <span className="text-emerald-300 font-bold">@{currentUser.username}</span>
                </div>
                <div className="flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                  <span className="text-slate-400">Member ID:</span>
                  <span className="text-white font-bold">{activeMember.id}</span>
                </div>
                <span className="text-slate-400">Joined {activeMember.joinedYear}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setIsIdCardModalOpen(true)}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs sm:text-sm"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Membership ID Card</span>
            </button>
            <button
              onClick={async () => {
                await downloadMemberIdCardPdf(activeMember, settings, memberReceipts, activeYear);
              }}
              className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs transition-colors"
              title="Download print-ready PDF ID Card"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>PDF Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {saveStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs within Member Portal */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview' as const, label: 'Dashboard Overview', icon: Layers },
          { id: 'ledger' as const, label: 'Personal Membership Ledger', icon: FileSpreadsheet },
          { id: 'id_card' as const, label: 'Membership ID Card', icon: CreditCard },
          { id: 'selections' as const, label: 'Customer Selection & Status', icon: UserCheck, count: selections.length },
          { id: 'profile' as const, label: 'Profile & Password', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePortalTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePortalTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & KEY KPI CARDS */}
      {activePortalTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Payment Report */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Today's Payment Report</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                ₹{todayTotalPaid.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">
                {todayReceipts.length} receipt{todayReceipts.length === 1 ? '' : 's'} recorded today
              </p>
            </div>

            {/* Total Amount Paid */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Total Amount Paid (Lifetime)</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                ₹{totalLifetimePaid.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">
                Across {memberReceipts.filter(r => r.status === 'APPROVED').length} confirmed receipts
              </p>
            </div>

            {/* Outstanding Dues (Active FY) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Outstanding Dues (FY {activeYear})</span>
                <AlertCircle className={`w-4 h-4 ${dueBalance === 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
              </div>
              <p className={`text-2xl font-black font-mono ${dueBalance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                ₹{dueBalance.toLocaleString('en-IN')}
              </p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                dueBalance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {dueBalance === 0 ? 'All Dues Cleared' : 'Payment Pending'}
              </span>
            </div>

            {/* Customer Selection Requests */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Customer Selection Status</span>
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {selections.length}
              </p>
              <p className="text-[11px] text-slate-500">
                {selections.filter(s => s.status === 'Approved').length} approved • {selections.filter(s => s.status === 'Pending').length} pending
              </p>
            </div>
          </div>

          {/* Monthly Subscription History Tracker */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Monthly Subscription History (FY {activeYear})</h3>
                <p className="text-xs text-slate-500">Real-time payment audit tracker across accounting months</p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Paid: ₹{currentYearPaid.toLocaleString('en-IN')}</span>
                </span>
                <span className="flex items-center space-x-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <span>Assessed: ₹{expectedAnnualFee.toLocaleString('en-IN')}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-center">
              {monthlyHistory.map((m) => (
                <div
                  key={m.num}
                  className={`p-3 rounded-2xl border transition-all ${
                    m.hasPaid
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <p className="text-xs font-bold">{m.name}</p>
                  <p className="text-[10px] font-mono mt-1">
                    {m.hasPaid ? `₹${m.amount.toLocaleString('en-IN')}` : '—'}
                  </p>
                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 ${
                    m.hasPaid ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Recent Receipts Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Recent Payment Receipts</h3>
              </div>
              <button
                onClick={() => setActivePortalTab('ledger')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
              >
                <span>View Full Ledger</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {memberReceipts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No payment receipts on record yet</p>
                <p className="text-xs">Receipts issued by the club Cashier will appear here instantly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Receipt No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Purpose</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberReceipts.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                          {r.receiptNo}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {r.date}
                        </td>
                        <td className="py-3 px-3 text-slate-900 font-medium">
                          {r.purpose}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium">
                            {r.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 text-sm">
                          ₹{r.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onViewReceipt(r)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL MEMBERSHIP LEDGER */}
      {activePortalTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900">Personal Membership Ledger</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Member: <strong>{activeMember.name}</strong> ({activeMember.id}) • FY {activeYear - 1}-{activeYear}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportMemberLedgerCsv(activeMember.name, activeMember.id, ledgerTransactions)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200 transition-colors"
                title="Download complete ledger spreadsheet (CSV / Excel)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Ledger CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ledger</span>
              </button>
            </div>
          </div>

          {/* Ledger Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-slate-500 font-semibold">Total Assessed Fees (Debit):</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-1">
                ₹{expectedAnnualFee.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Membership Admission & Annual Fee</p>
            </div>

            <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200">
              <span className="text-emerald-800 font-semibold">Total Paid & Approved (Credit):</span>
              <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                ₹{currentYearPaid.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Payments cleared by Cashier</p>
            </div>

            <div className={`rounded-2xl p-4 border ${
              dueBalance === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <span className={`font-semibold ${dueBalance === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                Outstanding Net Ledger Balance:
              </span>
              <p className={`text-xl font-black font-mono mt-1 ${
                dueBalance === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                ₹{dueBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {dueBalance === 0 ? 'Nil dues pending' : 'Pending payment settlement'}
              </p>
            </div>
          </div>

          {/* Detailed Transaction Ledger Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Txn / Ref No</th>
                  <th className="py-3 px-3">Receipt No</th>
                  <th className="py-3 px-3">Particulars / Head</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right">Debit (₹)</th>
                  <th className="py-3 px-3 text-right">Credit (₹)</th>
                  <th className="py-3 px-3 text-right">Running Balance (₹)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-700 font-mono font-medium whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {t.txnId}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                      {t.receiptNo}
                    </td>
                    <td className="py-3 px-3 text-slate-900 font-medium max-w-xs">
                      {t.description}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                        {t.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-rose-600">
                      {t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-emerald-600">
                      {t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-black text-slate-900">
                      ₹{t.balance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'APPROVED' || t.status === 'Assessed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t.receiptNo.startsWith('RCP-') ? (
                        <button
                          onClick={() => {
                            const rec = memberReceipts.find(r => r.receiptNo === t.receiptNo);
                            if (rec) onViewReceipt(rec);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Assessment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERSHIP ID CARD CARD & PASS */}
      {activePortalTab === 'id_card' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Official Club Membership ID Card</h2>
                  <p className="text-xs text-slate-500">Verified Plastic Badge & Digital QR Pass</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const url = createMemberIdCardWhatsAppUrl(activeMember, settings, activeYear, memberReceipts);
                    window.open(url, '_blank');
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={async () => {
                    await downloadMemberIdCardPdf(activeMember, settings, memberReceipts, activeYear);
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setIsIdCardModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Badge</span>
                </button>
              </div>
            </div>

            {/* Mini Interactive Preview of the ID Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden max-w-md mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg bg-white/10 p-0.5 object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                      {settings.clubName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide leading-tight text-white">{settings.clubName}</h4>
                    <p className="text-[10px] text-slate-400">Reg: {settings.registrationNo}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  MEMBER ID
                </span>
              </div>

              <div className="flex items-center space-x-4 py-4">
                {activeMember.photoUrl ? (
                  <img
                    src={activeMember.photoUrl}
                    alt={activeMember.name}
                    className="w-16 h-16 rounded-xl object-cover border border-white/20 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-700 border border-white/10 flex flex-col items-center justify-center text-slate-400">
                    <User className="w-7 h-7" />
                    <span className="text-[8px]">No Photo</span>
                  </div>
                )}

                <div className="space-y-0.5 flex-1 min-w-0">
                  <h3 className="font-extrabold text-sm text-white truncate">{activeMember.name}</h3>
                  <p className="text-[11px] font-mono text-emerald-300 font-bold">{activeMember.id}</p>
                  <p className="text-[10px] text-slate-300 truncate">
                    {activeMember.villageWard || 'Gramin Para'}
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                      Blood: <strong className="text-rose-400">{activeMember.bloodGroup || 'O+'}</strong>
                    </span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                      Since: {activeMember.joinedYear}
                    </span>
                  </div>
                </div>

                <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                  <QrCodeIcon className="w-10 h-10 text-slate-900" />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                <span>Authorized Signatory: {settings.secretaryName}</span>
                <span>Active FY: {activeYear}</span>
              </div>
            </div>

            {/* Quick Photo Upload & Badge Customization */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Photo & Card Personalization
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm transition-all text-xs">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>{isUpdatingPhoto ? 'Updating Photo...' : 'Upload New Member Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isUpdatingPhoto}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsIdCardModalOpen(true)}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Open Full Printable Card Modal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Profile Quick Snapshot */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100">
              Verified Club Records
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Club Name:</span>
                <span className="font-bold text-slate-800 text-right">{settings.clubName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registration No:</span>
                <span className="font-mono font-bold text-slate-800">{settings.registrationNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Unique Member ID:</span>
                <span className="font-mono font-bold text-indigo-600">{activeMember.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Membership Category:</span>
                <span className="font-semibold text-slate-800">
                  {activeMember.category === 'club_member' ? 'Club Core Member' : 'Village Resident'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Joining Date:</span>
                <span className="font-semibold text-slate-800">{activeMember.joinedYear}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Membership Status:</span>
                <span className="font-bold text-emerald-600">{activeMember.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER SELECTION & SELECTION STATUS */}
      {activePortalTab === 'selections' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-900">Customer Selection & Status</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                View eligible customers/beneficiaries and submit selection requests. Only Admin can finalize approval.
              </p>
            </div>

            <button
              onClick={() => setIsNewSelectionModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Customer Selection Request</span>
            </button>
          </div>

          {selectionSubmitMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{selectionSubmitMsg}</span>
            </div>
          )}

          {isLoadingSelections ? (
            <div className="text-center py-8 text-slate-400">Loading selection requests...</div>
          ) : selections.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No customer selection requests submitted yet</p>
              <p className="text-xs">
                Submit eligible candidates for scholarships, sports representations, or event delegations.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Req ID</th>
                    <th className="py-3 px-3">Customer / Beneficiary</th>
                    <th className="py-3 px-3">Selection Category</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Member Justification</th>
                    <th className="py-3 px-3">Selection Status</th>
                    <th className="py-3 px-3">Admin Remarks</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selections.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                        {s.id}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {s.customerName}
                        {s.customerId && (
                          <span className="block text-[10px] text-slate-400 font-mono">{s.customerId}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-semibold">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {s.phone || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={s.reason}>
                        {s.reason || 'None provided'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          s.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : s.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : s.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {s.adminRemarks ? (
                          <span className="text-slate-800 font-medium">{s.adminRemarks}</span>
                        ) : (
                          'Awaiting Admin Review'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {s.status === 'Pending' && (
                          <button
                            onClick={() => handleCancelSelection(s.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MY PROFILE & PASSWORD CHANGE */}
      {activePortalTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Profile Edit Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">My Member Profile</h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Member Name</label>
                <input
                  type="text"
                  disabled
                  value={activeMember.name}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Official name modifications require Admin approval.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={bloodGroupInput}
                    onChange={(e) => setBloodGroupInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Home Address / Para</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Lock className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Change Password</h3>
                <p className="text-[11px] text-slate-500">Update your account login password</p>
              </div>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Key className="w-4 h-4" />
                  <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Selection Modal */}
      {isNewSelectionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">Submit Customer Selection Request</h3>
              </div>
              <button
                onClick={() => setIsNewSelectionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSelection} className="p-6 space-y-4 text-xs">
              {selectionSubmitErr && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{selectionSubmitErr}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Beneficiary Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Ghosh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selection Category
                </label>
                <select
                  value={newCustomerCategory}
                  onChange={(e) => setNewCustomerCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                >
                  <option value="Scholarship / Education Grant">Scholarship / Education Grant</option>
                  <option value="Sports Tournament Representative">Sports Tournament Representative</option>
                  <option value="Cultural Program Participant">Cultural Program Participant</option>
                  <option value="Annual General Meeting Delegate">Annual General Meeting Delegate</option>
                  <option value="Community Welfare Relief">Community Welfare Relief</option>
                  <option value="Sub-Committee Member Nominee">Sub-Committee Member Nominee</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Member Justification / Reason for Selection
                </label>
                <textarea
                  rows={3}
                  value={newCustomerReason}
                  onChange={(e) => setNewCustomerReason(e.target.value)}
                  placeholder="State the reasons, achievements, or justification for this candidate's selection..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewSelectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSelection}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {isSubmittingSelection ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable / Downloadable Full Member ID Card Modal */}
      {isIdCardModalOpen && (
        <MemberIdCard
          member={activeMember}
          settings={settings}
          activeYear={activeYear}
          receipts={memberReceipts}
          isOpen={isIdCardModalOpen}
          onClose={() => setIsIdCardModalOpen(false)}
        />
      )}
    </div>
  );
};
