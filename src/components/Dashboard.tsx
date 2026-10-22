import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  Clock, 
  PlusCircle, 
  ArrowUpRight, 
  FileText, 
  MessageCircle, 
  Printer, 
  Calendar,
  AlertCircle,
  Building2,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { ClubDatabase, PaymentReceipt, Expense, Member, Program } from '../types/club.ts';
import { NavTab } from './Header.tsx';
import { createWhatsAppChatUrl, formatReceiptWhatsAppMessage } from '../utils/whatsapp.ts';

interface DashboardProps {
  db: ClubDatabase;
  activeYear: number;
  onQuickPayment: () => void;
  onQuickExpense: () => void;
  onQuickMember: () => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  db,
  activeYear,
  onQuickPayment,
  onQuickExpense,
  onQuickMember,
  onViewReceipt,
  onNavigateTab,
}) => {
  const { settings, members, receipts, expenses, programs = [] } = db;

  // Filter approved vs pending vs rejected
  const approvedReceipts = receipts.filter(r => r.status === 'APPROVED');
  const pendingReceipts = receipts.filter(r => r.status === 'PENDING_APPROVAL');
  const rejectedReceipts = receipts.filter(r => r.status === 'REJECTED');

  // Year filtering
  const yearApprovedReceipts = approvedReceipts.filter(r => r.financialYear === activeYear);
  const yearExpenses = expenses.filter(e => e.financialYear === activeYear);
  const yearPendingReceipts = pendingReceipts.filter(r => r.financialYear === activeYear);

  // Confirmed calculations (approved receipts minus approved refunds)
  const calculateNetConfirmed = (list: PaymentReceipt[]) => {
    return list.reduce((sum, r) => {
      return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
    }, 0);
  };

  const totalLifetimeIncome = calculateNetConfirmed(approvedReceipts);
  const totalLifetimeExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashInHand = totalLifetimeIncome - totalLifetimeExpense;

  // Current year aggregates
  const yearTotalIncome = calculateNetConfirmed(yearApprovedReceipts);
  const yearTotalExpense = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
  const yearPendingAmount = yearPendingReceipts.reduce((sum, r) => sum + r.amount, 0);

  // Member stats
  const activeMembers = members.filter(m => m.status === 'active');
  const villageMembersCount = activeMembers.filter(m => m.category === 'village_resident').length;
  const clubCoreMembersCount = activeMembers.filter(m => m.category === 'club_member').length;

  // Calculate annual dues for active year
  const memberTargetFees = activeMembers.reduce((sum, m) => {
    const fee = m.category === 'club_member' 
      ? settings.defaultAnnualClubFee 
      : m.category === 'village_resident' 
      ? settings.defaultAnnualVillageFee 
      : 0;
    return sum + fee;
  }, 0);

  // Member fees collected in active year
  const memberFeesCollected = yearApprovedReceipts
    .filter(r => r.purpose === 'Annual Club Membership Fee' || r.purpose === 'Annual Village Contribution')
    .reduce((sum, r) => sum + r.amount, 0);

  const duesPending = Math.max(0, memberTargetFees - memberFeesCollected);

  // Income by category this year
  const villageFeeIncome = yearApprovedReceipts
    .filter(r => r.purpose === 'Annual Village Contribution')
    .reduce((sum, r) => sum + r.amount, 0);

  const clubFeeIncome = yearApprovedReceipts
    .filter(r => r.purpose === 'Annual Club Membership Fee')
    .reduce((sum, r) => sum + r.amount, 0);

  const otherDonationsIncome = Math.max(0, yearTotalIncome - (villageFeeIncome + clubFeeIncome));

  // Recent combined transactions
  type RecentItem = 
    | { type: 'receipt'; date: string; data: PaymentReceipt } 
    | { type: 'expense'; date: string; data: Expense };

  const recentItems: RecentItem[] = [
    ...receipts.map(r => ({ type: 'receipt' as const, date: r.date, data: r })),
    ...expenses.map(e => ({ type: 'expense' as const, date: e.date, data: e })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

  const handleWhatsAppReceipt = (receipt: PaymentReceipt) => {
    const message = formatReceiptWhatsAppMessage(receipt, settings);
    const url = createWhatsAppChatUrl(receipt.phone, message);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Pending Approval Notice Banner if any */}
      {pendingReceipts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                {pendingReceipts.length} Payment{pendingReceipts.length > 1 ? 's' : ''} Awaiting Admin Approval
              </h4>
              <p className="text-xs text-amber-800">
                Total ₹{pendingReceipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} submitted and pending verification before counting towards confirmed revenue.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('approvals')}
            className="flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Review & Approve Now</span>
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt={settings.clubName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-contain bg-white/10 p-1 border border-slate-700 shadow-md flex-shrink-0"
              />
            )}
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Financial Year: {activeYear}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {settings.clubName}
              </h2>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                {settings.tagline} • Serving {settings.villageTown}. Two-tier verified accounting, organizers, programs, local expenses & digital receipts.
              </p>
            </div>
          </div>

          {/* Quick Action Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onQuickPayment}
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Issue Receipt</span>
            </button>
            <button
              onClick={onQuickExpense}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium px-3.5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <TrendingDown className="w-4 h-4" />
              <span>+ Record Expense</span>
            </button>
            <button
              onClick={onQuickMember}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3.5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <Users className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Fund in Hand */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Club Fund in Hand
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {settings.currency} {netCashInHand.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              Lifetime verified reserve after all expenses
            </p>
          </div>
        </div>

        {/* Current Year Confirmed Collections */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {activeYear} Confirmed Inflow
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-700">
              {settings.currency} {yearTotalIncome.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              From {yearApprovedReceipts.length} approved receipt(s) in {activeYear}
            </p>
          </div>
        </div>

        {/* Current Year Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {activeYear} Local Expenses
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600">
              {settings.currency} {yearTotalExpense.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Across {yearExpenses.length} approved voucher(s)
            </p>
          </div>
        </div>

        {/* Active Members & Pending Dues */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900">
                {activeMembers.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({clubCoreMembersCount} Club • {villageMembersCount} Village)
              </span>
            </div>
            <div className="mt-1 flex items-center text-xs text-amber-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              <span>Est. {activeYear} Dues: {settings.currency} {duesPending.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Programs & Contracts Highlights */}
      {programs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Active Programs & Event Contracts</h3>
              <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {programs.length} Events
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('programs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <span>Manage Programs</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {programs.slice(0, 3).map((p) => {
              const progPayments = approvedReceipts.filter(r => r.programId === p.id);
              const received = progPayments.reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);
              const remaining = Math.max(0, p.totalContractAmount - received);

              return (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-indigo-600">{p.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{p.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.venue} • {p.programDate}
                    </p>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Organizer: {p.organizerName}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contract Total:</span>
                      <span className="font-bold text-slate-800">₹{p.totalContractAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confirmed Recd:</span>
                      <span className="font-bold text-emerald-600">₹{received.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due Balance:</span>
                      <span className="font-bold text-amber-600">₹{remaining.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Middle Grid: Income Breakdown & Fast Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Source Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
            <span>{activeYear} Confirmed Collections</span>
            <span className="text-xs font-normal text-slate-500">By category</span>
          </h3>
          
          <div className="mt-4 space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Club Members ({settings.currency}{settings.defaultAnnualClubFee}/yr)</span>
                <span className="font-bold">{settings.currency} {clubFeeIncome.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${yearTotalIncome > 0 ? Math.min(100, (clubFeeIncome / yearTotalIncome) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Village Residents ({settings.currency}{settings.defaultAnnualVillageFee}/yr)</span>
                <span className="font-bold">{settings.currency} {villageFeeIncome.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full" 
                  style={{ width: `${yearTotalIncome > 0 ? Math.min(100, (villageFeeIncome / yearTotalIncome) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Programs, Puja & Donations</span>
                <span className="font-bold">{settings.currency} {otherDonationsIncome.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full" 
                  style={{ width: `${yearTotalIncome > 0 ? Math.min(100, (otherDonationsIncome / yearTotalIncome) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('yearly_summary')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
            >
              <span>View Member-wise Dues Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Full Reports
            </button>
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Transactions & Receipts</h3>
              <p className="text-xs text-slate-500">Latest receipts and expenditure vouchers</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateTab('receipts')}
                className="text-xs font-medium text-slate-600 hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                All Receipts
              </button>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-medium text-slate-600 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                All Expenses
              </button>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {recentItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No transactions recorded yet.
              </div>
            ) : (
              recentItems.map((item, idx) => {
                if (item.type === 'receipt') {
                  const r = item.data;
                  const isApproved = r.status === 'APPROVED';
                  const isPending = r.status === 'PENDING_APPROVAL';

                  return (
                    <div key={`rcp-${r.id}-${idx}`} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isApproved ? 'bg-emerald-50 text-emerald-600' : isPending ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {isApproved ? '₹' : isPending ? '?' : 'X'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {r.memberName}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isApproved ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {r.receiptNo} • {r.purpose} • {r.date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-emerald-600">
                          +{settings.currency}{r.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => onViewReceipt(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="View Digital Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsAppReceipt(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Send Receipt via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  const exp = item.data;
                  return (
                    <div key={`exp-${exp.id}-${idx}`} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                          -
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {exp.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {exp.voucherNo} • {exp.category} • Paid to: {exp.paidTo} • {exp.date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-rose-600">
                          -{settings.currency}{exp.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
