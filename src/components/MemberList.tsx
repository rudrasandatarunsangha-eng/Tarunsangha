import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  MessageCircle, 
  CreditCard, 
  Eye, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  CheckCircle, 
  Clock, 
  Filter,
  X,
  ArrowUpDown,
  RotateCcw,
  Download,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { Member, MemberCategory, PaymentReceipt, ClubSettings } from '../types/club.ts';
import { 
  exportMembersCsv, 
  exportFullMembersPaymentHistoryAuditCsv, 
  exportMembersPaymentAuditSummaryCsv 
} from '../utils/exportTools.ts';
import { createWhatsAppChatUrl } from '../utils/whatsapp.ts';
import { downloadMemberIdCardPdf } from '../utils/pdfGenerator.ts';

interface MemberListProps {
  members: Member[];
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
  onViewMemberDetails: (member: Member) => void;
  onRecordPaymentForMember: (member: Member) => void;
  onDeleteMember: (memberId: string, reason?: string) => Promise<void>;
  isAdminUnlocked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canRecordPayment?: boolean;
  onOpenPinModal?: () => void;
  onOpenIdCard?: (member: Member) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  receipts,
  settings,
  activeYear,
  onAddMember,
  onEditMember,
  onViewMemberDetails,
  onRecordPaymentForMember,
  onDeleteMember,
  isAdminUnlocked = false,
  canEdit = false,
  canDelete = false,
  canRecordPayment = false,
  onOpenPinModal,
  onOpenIdCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'id_asc' | 'dues_desc' | 'joined_desc'>('name_asc');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Extract unique village wards from members list
  const uniqueWards = useMemo(() => {
    const wardSet = new Set<string>();
    members.forEach((m) => {
      if (m.villageWard && m.villageWard.trim()) {
        wardSet.add(m.villageWard.trim());
      }
    });
    return Array.from(wardSet).sort();
  }, [members]);

  // Helper to compute payment status for active year
  const getMemberStatusForYear = (member: Member) => {
    const targetFee = member.category === 'club_member'
      ? settings.defaultAnnualClubFee
      : member.category === 'village_resident'
      ? settings.defaultAnnualVillageFee
      : 0;

    const paid = receipts
      .filter(r => r.memberId === member.id && r.financialYear === activeYear)
      .reduce((sum, r) => sum + r.amount, 0);

    const due = Math.max(0, targetFee - paid);

    return { targetFee, paid, due, isPaid: targetFee > 0 ? due === 0 : true };
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = 
          !query ||
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          (m.phone && m.phone.includes(query)) ||
          (m.villageWard && m.villageWard.toLowerCase().includes(query)) ||
          (m.guardianName && m.guardianName.toLowerCase().includes(query)) ||
          (m.address && m.address.toLowerCase().includes(query));

        const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
        const matchesWard = selectedWard === 'all' || m.villageWard === selectedWard;
        const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;

        // Payment status filter
        const paymentInfo = getMemberStatusForYear(m);
        let matchesPaymentStatus = true;
        if (selectedPaymentStatus === 'paid') {
          matchesPaymentStatus = paymentInfo.isPaid && paymentInfo.targetFee > 0;
        } else if (selectedPaymentStatus === 'due') {
          matchesPaymentStatus = paymentInfo.due > 0;
        } else if (selectedPaymentStatus === 'voluntary') {
          matchesPaymentStatus = paymentInfo.targetFee === 0;
        }

        return matchesSearch && matchesCategory && matchesWard && matchesStatus && matchesPaymentStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'id_asc') {
          return a.id.localeCompare(b.id);
        }
        if (sortBy === 'joined_desc') {
          return (b.joinedYear || 0) - (a.joinedYear || 0);
        }
        if (sortBy === 'dues_desc') {
          const dueA = getMemberStatusForYear(a).due;
          const dueB = getMemberStatusForYear(b).due;
          return dueB - dueA;
        }
        return 0;
      });
  }, [members, searchQuery, selectedCategory, selectedWard, selectedStatus, selectedPaymentStatus, sortBy, activeYear, receipts, settings]);

  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    selectedCategory !== 'all' || 
    selectedWard !== 'all' || 
    selectedPaymentStatus !== 'all' || 
    selectedStatus !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedWard('all');
    setSelectedPaymentStatus('all');
    setSelectedStatus('all');
    setSortBy('name_asc');
  };

  const handleWhatsAppChat = (phone: string, name: string) => {
    const text = `Namaskar ${name} ji, greetings from ${settings.clubName} (${settings.villageTown})!`;
    const url = createWhatsAppChatUrl(phone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Member Directory</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {filteredMembers.length} of {members.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quickly search, filter by category or village ward, and track annual contributions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              title="Download CSV reports formatted for Google Sheets, Excel, and External Audits"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-left">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Export & Audit Reports</p>
                    <p className="text-[11px] text-slate-500">Official CSV format for Excel & Google Sheets</p>
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => {
                        exportFullMembersPaymentHistoryAuditCsv(filteredMembers, receipts, settings, activeYear);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 group transition-colors flex items-start space-x-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 flex items-center gap-1.5">
                          <span>Full Member & Payment History Audit</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">Audit Grade</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Detailed ledger joining every member with all historical receipts, FY dues, receipt numbers, and payment modes.
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        exportMembersPaymentAuditSummaryCsv(filteredMembers, receipts, settings, activeYear);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 group transition-colors flex items-start space-x-2.5"
                    >
                      <Download className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                          Member Payment Summary Audit
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          1 row per member with lifetime totals, active FY fee targets, paid amount, and outstanding dues.
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        exportMembersCsv(filteredMembers);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 group transition-colors flex items-start space-x-2.5 border-t border-slate-100"
                    >
                      <Users className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Basic Member Directory (Profiles Only)
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Standard member contact roster without payment transactions.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => exportFullMembersPaymentHistoryAuditCsv(members, receipts, settings, activeYear)}
            className="hidden sm:flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
            title="Export complete members roster joined with full historical payments into CSV for external audits"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Audit Export (Members + Payments)</span>
          </button>

          {canEdit && (
            <button
              onClick={onAddMember}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Search & Multi-Filter Control Box */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by full name, phone number, member ID, village ward, or father's name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
              title="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category Dropdown */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              <span>Category Filter</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Categories ({members.length})</option>
              <option value="village_resident">Village Residents</option>
              <option value="club_member">Club Core Members</option>
              <option value="patron">Honorary Patrons</option>
              <option value="senior">Senior Citizens</option>
            </select>
          </div>

          {/* Village Ward / Area Dropdown */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Village Ward / Area</span>
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Wards / Paras ({uniqueWards.length})</option>
              {uniqueWards.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          </div>

          {/* Annual Payment Status Dropdown */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{activeYear} Payment Status</span>
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Fully Paid (Nil Dues)</option>
              <option value="due">Pending Annual Dues</option>
              <option value="voluntary">Patrons / Voluntary</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1 flex items-center space-x-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort Order</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="id_asc">Member ID: Low to High</option>
              <option value="dues_desc">Dues: Highest First</option>
              <option value="joined_desc">Newest Joined First</option>
            </select>
          </div>
        </div>

        {/* Quick Category Filter Pills & Reset Control */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Quick Filter:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'village_resident', label: 'Village Residents' },
              { id: 'club_member', label: 'Club Members' },
              { id: 'patron', label: 'Patrons' },
              { id: 'senior', label: 'Seniors' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No members match your search criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query, ward, or category filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center space-x-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => {
            const { targetFee, paid, due, isPaid } = getMemberStatusForYear(member);
            const categoryBadge =
              member.category === 'village_resident'
                ? { label: 'Village Resident', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                : member.category === 'club_member'
                ? { label: 'Club Member', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                : member.category === 'patron'
                ? { label: 'Patron', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                : { label: 'Senior', bg: 'bg-amber-50 text-amber-700 border-amber-200' };

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Category & Member ID */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${categoryBadge.bg}`}
                    >
                      {categoryBadge.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {member.id}
                    </span>
                  </div>

                  {/* Member Name */}
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {member.name}
                  </h3>

                  {/* Guardian Name if exists */}
                  {member.guardianName && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      S/o / D/o: {member.guardianName}
                    </p>
                  )}

                  {/* Ward / Area */}
                  <div className="flex items-center text-xs text-slate-600 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500 flex-shrink-0" />
                    <span className="truncate font-medium">{member.villageWard || 'Gramin Para'}</span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center text-xs text-slate-600 mt-1">
                    <Phone className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                    <span>{member.phone || 'No phone recorded'}</span>
                  </div>

                  {/* Annual Contribution Progress Bar for Active Year */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <span className="text-slate-500">{activeYear} Subscription:</span>
                      {targetFee === 0 ? (
                        <span className="text-purple-600 font-bold">Voluntary</span>
                      ) : isPaid ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Paid ({settings.currency}{paid})
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">
                          Due: {settings.currency}{due} (Paid: {settings.currency}{paid})
                        </span>
                      )}
                    </div>
                    {targetFee > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, (paid / targetFee) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Left: WhatsApp & Details */}
                  <div className="flex items-center space-x-1.5">
                    {member.phone && (
                      <button
                        onClick={() => handleWhatsAppChat(member.phone, member.name)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewMemberDetails(member)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="View Member History & All Receipts"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onOpenIdCard && (
                      <>
                        <button
                          onClick={() => onOpenIdCard(member)}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                          title="Generate Printable Member ID Card with QR Code"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            await downloadMemberIdCardPdf(member, settings, receipts, activeYear);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                          title="Direct Download Member ID Card PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => onEditMember(member)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Edit Member Information"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {/* Admin or delete-permitted user delete button */}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setMemberToDelete(member);
                          setDeleteReason('');
                          setDeleteError('');
                        }}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete Member (Admin Only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Right: + Record Payment button */}
                  {canRecordPayment && (
                    <button
                      onClick={() => onRecordPaymentForMember(member)}
                      className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>+ Pay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Admin Delete Confirmation</h3>
              </div>
              <button
                onClick={() => setMemberToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to permanently delete this member?</p>
              <p>Member: <strong>{memberToDelete.name}</strong> ({memberToDelete.id})</p>
              <p>Village Ward: {memberToDelete.villageWard || 'Gramin Para'}</p>
              <p className="text-[11px] text-rose-700 mt-2 font-medium">
                Note: Financial receipts associated with this member are preserved in the ledger for accounting integrity. This deletion is permanently logged in the audit trail.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Deletion (Required for Audit Log):
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Relocated to another city, duplicate record..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!deleteReason.trim()) {
                    setDeleteError('Please enter a deletion reason for the audit log.');
                    return;
                  }
                  setIsDeleting(true);
                  try {
                    await onDeleteMember(memberToDelete.id, deleteReason.trim());
                    setMemberToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete member');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Admin Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
