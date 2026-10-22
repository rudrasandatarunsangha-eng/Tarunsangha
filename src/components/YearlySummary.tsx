import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  MessageCircle, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  ExternalLink 
} from 'lucide-react';
import { Member, PaymentReceipt, ClubSettings, MemberYearlyStatus } from '../types/club.ts';
import { exportYearlySummaryCsv } from '../utils/exportTools.ts';
import { createWhatsAppChatUrl, formatDueReminderWhatsAppMessage } from '../utils/whatsapp.ts';

interface YearlySummaryProps {
  members: Member[];
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  onRecordPaymentForMember: (member: Member) => void;
  onViewMemberDetails: (member: Member) => void;
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({
  members,
  receipts,
  settings,
  activeYear,
  onRecordPaymentForMember,
  onViewMemberDetails,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(activeYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  // Compute yearly summaries for each member (only APPROVED receipts count towards paid)
  const yearlyData: (MemberYearlyStatus & { pendingAmount: number })[] = members.map((m) => {
    const targetFee = m.category === 'club_member'
      ? settings.defaultAnnualClubFee
      : m.category === 'village_resident'
      ? settings.defaultAnnualVillageFee
      : 0;

    const approvedYearReceipts = receipts.filter(
      r => r.memberId === m.id && r.financialYear === selectedYear && r.status === 'APPROVED'
    );

    const pendingYearReceipts = receipts.filter(
      r => r.memberId === m.id && r.financialYear === selectedYear && r.status === 'PENDING_APPROVAL'
    );

    const paidAmount = approvedYearReceipts.reduce((sum, r) => {
      return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
    }, 0);

    const pendingAmount = pendingYearReceipts.reduce((sum, r) => sum + r.amount, 0);
    const balanceDue = Math.max(0, targetFee - paidAmount);

    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (targetFee === 0) {
      status = 'paid';
    } else if (paidAmount >= targetFee) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    const lastReceipt = approvedYearReceipts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    return {
      member: m,
      financialYear: selectedYear,
      targetFee,
      paidAmount,
      balanceDue,
      pendingAmount,
      status,
      lastPaymentDate: lastReceipt ? lastReceipt.date : undefined,
      receiptCount: approvedYearReceipts.length,
    };
  });

  // Filtered
  const filteredData = yearlyData.filter((item) => {
    const m = item.member;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.villageWard && m.villageWard.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Aggregates for selected year
  const totalTarget = yearlyData.reduce((sum, item) => sum + item.targetFee, 0);
  const totalCollected = yearlyData.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalDues = yearlyData.reduce((sum, item) => sum + item.balanceDue, 0);
  const collectionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 100;

  const handleSendReminder = (item: MemberYearlyStatus) => {
    const msg = formatDueReminderWhatsAppMessage(item.member, item, settings);
    const url = createWhatsAppChatUrl(item.member.phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Member-wise Annual Dues Ledger</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
              FY {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor target fees, verified collections, dues & dispatch one-click WhatsApp reminder statements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200 text-xs font-semibold">
            <span className="text-slate-500 mr-2">Financial Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-indigo-700 focus:outline-none cursor-pointer"
            >
              {(settings.financialYears && settings.financialYears.length > 0 ? settings.financialYears : [2024, 2025]).map(yr => (
                <option key={yr} value={yr}>
                  FY {yr - 1}-{yr} ({yr})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => exportYearlySummaryCsv(yearlyData, selectedYear)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            title="Download CSV report for Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Annual Target Dues
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {settings.currency} {totalTarget.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {members.length} registered members
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Confirmed Collected
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {settings.currency} {totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Efficiency: {collectionRate}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
            Outstanding Dues
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {settings.currency} {totalDues.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Pending collection
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Collection Rate
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
            {collectionRate}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, collectionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member by Name, ID, Phone, or Ward..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="w-full md:w-auto flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="club_member">Club Members (Core)</option>
              <option value="village_resident">Village Residents</option>
              <option value="patron">Honorary Patrons</option>
              <option value="senior">Senior Members</option>
            </select>
          </div>

          <div className="w-full md:w-auto flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid / Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">No members match your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Member Info</th>
                  <th className="py-3 px-4">Category & Ward</th>
                  <th className="py-3 px-4 text-right">Target Fee</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => {
                  const m = item.member;
                  const categoryBadge = 
                    m.category === 'club_member' ? { label: 'Club Member', cls: 'bg-indigo-50 text-indigo-700' } :
                    m.category === 'village_resident' ? { label: 'Village Resident', cls: 'bg-emerald-50 text-emerald-700' } :
                    m.category === 'patron' ? { label: 'Patron', cls: 'bg-amber-50 text-amber-700' } :
                    { label: 'Senior', cls: 'bg-purple-50 text-purple-700' };

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onViewMemberDetails(m)}
                          className="font-bold text-slate-900 hover:text-emerald-600 text-left block"
                        >
                          {m.name}
                        </button>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {m.id} • {m.phone || 'No phone'}
                        </div>
                      </td>

                      {/* Category & Ward */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${categoryBadge.cls} mb-0.5`}>
                          {categoryBadge.label}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {m.villageWard}
                        </div>
                      </td>

                      {/* Target Fee */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-slate-600">
                        {settings.currency}{item.targetFee.toLocaleString()}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-600">
                          {settings.currency}{item.paidAmount.toLocaleString()}
                        </span>
                        {item.pendingAmount > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold">
                            +{settings.currency}{item.pendingAmount.toLocaleString()} Pending
                          </div>
                        )}
                        {item.lastPaymentDate && (
                          <div className="text-[10px] text-slate-400">
                            Last: {item.lastPaymentDate}
                          </div>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold ${item.balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {settings.currency}{item.balanceDue.toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.status === 'paid' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        )}
                        {item.status === 'partial' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Partial</span>
                          </span>
                        )}
                        {item.status === 'unpaid' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unpaid</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {item.balanceDue > 0 && (
                            <button
                              onClick={() => handleSendReminder(item)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                              title="Send WhatsApp Due Reminder (Click-to-chat)"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          <button
                            onClick={() => onRecordPaymentForMember(m)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                            title="Record Payment & Issue Receipt"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pay</span>
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
    </div>
  );
};
