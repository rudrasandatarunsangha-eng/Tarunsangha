import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  MessageCircle, 
  Printer, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Sparkles,
  Download
} from 'lucide-react';
import { Member, PaymentReceipt, ClubSettings } from '../types/club.ts';
import { downloadReceiptPdf, downloadMemberIdCardPdf } from '../utils/pdfGenerator.ts';
import { createWhatsAppChatUrl, formatReceiptWhatsAppMessage, formatMemberStatementWhatsAppMessage, createMemberIdCardWhatsAppUrl } from '../utils/whatsapp.ts';

interface MemberDetailModalProps {
  member: Member | null;
  receipts: PaymentReceipt[];
  settings: ClubSettings;
  activeYear: number;
  onClose: () => void;
  onRecordPayment: (member: Member) => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  onOpenIdCard?: (member: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  receipts,
  settings,
  activeYear,
  onClose,
  onRecordPayment,
  onViewReceipt,
  onOpenIdCard,
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (!member) return null;

  // Member's all receipts
  const memberReceipts = useMemo(() => {
    return receipts
      .filter(r => r.memberId === member.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, member.id]);

  const totalPaidLifetime = useMemo(() => {
    return memberReceipts
      .filter(r => r.status === 'APPROVED' || !r.status)
      .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);
  }, [memberReceipts]);

  // Target fee for member
  const memberTargetFee = member.category === 'club_member'
    ? settings.defaultAnnualClubFee
    : member.category === 'village_resident'
    ? settings.defaultAnnualVillageFee
    : 0;

  // Determine year range for line chart (from member.joinedYear or at least last 4 years up to activeYear)
  const chartYears = useMemo(() => {
    const startYear = Math.max(2022, Math.min(member.joinedYear || 2024, activeYear - 3));
    const list: number[] = [];
    for (let yr = startYear; yr <= activeYear; yr++) {
      list.push(yr);
    }
    // Guarantee at least 3 points
    if (list.length < 3) {
      if (list[0] > 2023) list.unshift(list[0] - 1);
      if (list.length < 3 && list[0] > 2022) list.unshift(list[0] - 1);
    }
    return list;
  }, [member.joinedYear, activeYear]);

  // Compute yearly data for line chart
  const yearlyChartData = useMemo(() => {
    return chartYears.map((yr, idx) => {
      const yearReceipts = memberReceipts.filter(r => r.financialYear === yr);
      const paid = yearReceipts
        .filter(r => r.status === 'APPROVED' || !r.status)
        .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);
      
      const target = memberTargetFee;
      return {
        year: yr,
        paid,
        target,
        receiptsCount: yearReceipts.length,
      };
    });
  }, [chartYears, memberReceipts, memberTargetFee]);

  // Calculate annual growth & consistency statistics
  const { growthRate, consistencyLabel, consistencyScore } = useMemo(() => {
    if (yearlyChartData.length < 2) {
      return { growthRate: 0, consistencyLabel: 'Active Member', consistencyScore: 100 };
    }
    const current = yearlyChartData[yearlyChartData.length - 1].paid;
    const previous = yearlyChartData[yearlyChartData.length - 2].paid;

    let growth = 0;
    if (previous > 0) {
      growth = Math.round(((current - previous) / previous) * 100);
    } else if (current > 0) {
      growth = 100;
    }

    // Consistency: consecutive years contributing
    const activeContributedYears = yearlyChartData.filter(d => d.paid > 0).length;
    const consistencyPct = Math.round((activeContributedYears / yearlyChartData.length) * 100);

    let label = 'Regular Contributor';
    if (consistencyPct >= 80) label = 'Highly Consistent (100% on-track)';
    else if (consistencyPct >= 50) label = 'Consistent Member';
    else label = 'Occasional Contributor';

    return { growthRate: growth, consistencyLabel: label, consistencyScore: consistencyPct };
  }, [yearlyChartData]);

  // Year breakdown for current recent 3 years cards
  const years = [2026, 2025, 2024];
  const yearlyBreakdown = years.map(yr => {
    const target = memberTargetFee;
    const paidInYear = memberReceipts
      .filter(r => r.financialYear === yr && (r.status === 'APPROVED' || !r.status))
      .reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);

    const dueInYear = Math.max(0, target - paidInYear);
    const isPaid = target > 0 ? dueInYear === 0 : true;

    return { year: yr, target, paid: paidInYear, due: dueInYear, isPaid };
  });

  const categoryLabel =
    member.category === 'village_resident' ? 'Village Resident' :
    member.category === 'club_member' ? 'Core Club Member' :
    member.category === 'patron' ? 'Honorary Patron' : 'Senior Member';

  const handleSendStatement = () => {
    const text = formatMemberStatementWhatsAppMessage(member, memberReceipts, settings);
    const url = createWhatsAppChatUrl(member.phone, text);
    window.open(url, '_blank');
  };

  const handleWhatsAppReceipt = (receipt: PaymentReceipt) => {
    const text = formatReceiptWhatsAppMessage(receipt, settings);
    const url = createWhatsAppChatUrl(member.phone, text);
    window.open(url, '_blank');
  };

  // SVG Chart Geometry Calculations
  const chartWidth = 520;
  const chartHeight = 170;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxPaid = Math.max(...yearlyChartData.map(d => d.paid), memberTargetFee, 500);
  const yAxisMax = Math.ceil((maxPaid * 1.2) / 200) * 200;

  const points = yearlyChartData.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, yearlyChartData.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (d.paid / yAxisMax) * innerHeight;
    return { ...d, x, y };
  });

  // SVG Path generator
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
    : '';

  // Target reference line Y coordinate
  const targetY = paddingTop + innerHeight - (memberTargetFee / yAxisMax) * innerHeight;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold">
              <User className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg">{member.name}</h3>
                <span className="text-[11px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {member.id}
                </span>
              </div>
            <p className="text-xs text-slate-400">
                {categoryLabel} • {member.villageWard || 'Gramin Para'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenIdCard && (
              <button
                onClick={() => onOpenIdCard(member)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Generate Printable Member ID Card with QR Code"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Member ID Card</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-sm">
          {/* Member Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Category & Status</span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {categoryLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {member.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Area / Village Ward</span>
              <span className="text-xs font-medium text-slate-800 mt-1 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                {member.villageWard || 'Gramin Para'}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Mobile Phone / WhatsApp</span>
              <span className="text-xs font-medium text-slate-800 mt-1 flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                {member.phone || 'No phone number'}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Member Since</span>
              <span className="text-xs font-medium text-slate-800 mt-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                Year {member.joinedYear}
              </span>
            </div>

            {member.guardianName && (
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Guardian / Father Name</span>
                <span className="text-xs text-slate-800 font-medium">{member.guardianName}</span>
              </div>
            )}

            {member.address && (
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Home Address</span>
                <span className="text-xs text-slate-800">{member.address}</span>
              </div>
            )}

            {member.notes && (
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Notes & Roles</span>
                <span className="text-xs text-slate-600 italic">{member.notes}</span>
              </div>
            )}
          </div>

          {/* Quick Member Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onRecordPayment(member)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Record Payment</span>
            </button>

            {member.phone && (
              <button
                onClick={handleSendStatement}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                title="Send Member Contribution Statement on WhatsApp (You will press Send)"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Send WhatsApp Statement</span>
                <ExternalLink className="w-3 h-3 ml-0.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* ============================================================== */}
          {/* PAYMENT HISTORY & ANNUAL GROWTH LINE CHART */}
          {/* ============================================================== */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            {/* Chart Header & KPIs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">Payment History & Annual Growth</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 mr-0.5" />
                    <span>Annual Growth & Consistency</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual timeline of annual contributions from Year {chartYears[0]} to {activeYear}.
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center space-x-2">
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">YoY Growth</span>
                  <div className="flex items-center text-xs font-black">
                    {growthRate >= 0 ? (
                      <span className="text-emerald-400 flex items-center">
                        <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                        +{growthRate}%
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center">
                        <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                        {growthRate}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Consistency</span>
                  <span className="text-xs font-bold text-teal-300">
                    {consistencyScore}% active
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Line Chart */}
            <div className="mt-4 relative">
              <div className="w-full overflow-x-auto scrollbar-none">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto min-w-[340px] overflow-visible"
                >
                  <defs>
                    {/* Area Gradient */}
                    <linearGradient id={`chart-grad-${member.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Line Stroke Gradient */}
                    <linearGradient id={`stroke-grad-${member.id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines & Y-Axis Labels */}
                  {[0, 0.5, 1].map((ratio) => {
                    const y = paddingTop + innerHeight * (1 - ratio);
                    const val = Math.round(yAxisMax * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="#334155"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {settings.currency}{val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target Reference Line if target > 0 */}
                  {memberTargetFee > 0 && targetY >= paddingTop && targetY <= paddingTop + innerHeight && (
                    <g>
                      <line
                        x1={paddingLeft}
                        y1={targetY}
                        x2={chartWidth - paddingRight}
                        y2={targetY}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                        opacity="0.75"
                      />
                      <text
                        x={chartWidth - paddingRight}
                        y={targetY - 4}
                        textAnchor="end"
                        fill="#fbbf24"
                        fontSize="8.5"
                        fontWeight="bold"
                      >
                        Target ({settings.currency}{memberTargetFee})
                      </text>
                    </g>
                  )}

                  {/* Gradient Area Fill */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill={`url(#chart-grad-${member.id})`}
                    />
                  )}

                  {/* Main Line Stroke */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={`url(#stroke-grad-${member.id})`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points / Circles */}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    const isMeetingTarget = memberTargetFee > 0 ? p.paid >= memberTargetFee : p.paid > 0;

                    return (
                      <g key={p.year} className="cursor-pointer">
                        {/* Vertical Guide on Hover */}
                        {isHovered && (
                          <line
                            x1={p.x}
                            y1={paddingTop}
                            x2={p.x}
                            y2={paddingTop + innerHeight}
                            stroke="#10b981"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                            opacity="0.8"
                          />
                        )}

                        {/* Outer Glow Circle */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 8 : 5}
                          fill={isMeetingTarget ? '#10b981' : '#f59e0b'}
                          className="transition-all duration-200"
                        />

                        {/* Inner Circle */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 4 : 2.5}
                          fill="#ffffff"
                        />

                        {/* Interactive Click/Hover Hitbox */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="16"
                          fill="transparent"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        />

                        {/* X-Axis Year Labels */}
                        <text
                          x={p.x}
                          y={paddingTop + innerHeight + 16}
                          textAnchor="middle"
                          fill={isHovered ? '#34d399' : '#cbd5e1'}
                          fontSize="10"
                          fontWeight={isHovered ? 'bold' : 'normal'}
                        >
                          {p.year}
                        </text>

                        {/* Amount Badge on Top of Point */}
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fill={isHovered ? '#a7f3d0' : '#e2e8f0'}
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {settings.currency}{p.paid}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Tooltip Card below chart for hovered node or summary */}
              <div className="mt-2 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
                {hoveredPointIndex !== null ? (
                  <div className="flex items-center space-x-3 text-emerald-300 font-medium">
                    <span>
                      📅 <strong>Year {points[hoveredPointIndex].year}:</strong> {settings.currency}{points[hoveredPointIndex].paid.toLocaleString()} paid
                    </span>
                    <span>
                      ({points[hoveredPointIndex].receiptsCount} receipt{points[hoveredPointIndex].receiptsCount === 1 ? '' : 's'})
                    </span>
                    {memberTargetFee > 0 && (
                      <span className={points[hoveredPointIndex].paid >= memberTargetFee ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {points[hoveredPointIndex].paid >= memberTargetFee ? '✓ Target Met' : `Due: ${settings.currency}${Math.max(0, memberTargetFee - points[hoveredPointIndex].paid)}`}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    <span>Hover or tap on points to view annual contributions breakdown & receipts</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                    Actual Paid
                  </span>
                  {memberTargetFee > 0 && (
                    <span className="flex items-center">
                      <span className="w-2.5 h-0.5 bg-amber-400 mr-1.5" />
                      Annual Target
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Year-by-Year Financial Ledger */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2.5 flex items-center justify-between">
              <span>Annual Contribution Status</span>
              <span className="text-xs font-normal text-slate-500">
                Lifetime Paid: {settings.currency}{totalPaidLifetime.toLocaleString()}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {yearlyBreakdown.map((item) => (
                <div
                  key={item.year}
                  className={`p-3.5 rounded-xl border ${
                    item.isPaid
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{item.year}</span>
                    {item.target === 0 ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        Patron
                      </span>
                    ) : item.isPaid ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> PAID
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded flex items-center">
                        <AlertCircle className="w-3 h-3 mr-0.5" /> DUE
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs space-y-0.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Target:</span>
                      <span>{settings.currency}{item.target}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>Paid:</span>
                      <span>{settings.currency}{item.paid}</span>
                    </div>
                    {item.due > 0 && (
                      <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-rose-200">
                        <span>Balance Due:</span>
                        <span>{settings.currency}{item.due}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Receipts History */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2.5">
              Issued Receipts History ({memberReceipts.length})
            </h4>

            {memberReceipts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                No receipts recorded yet for this member.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {memberReceipts.map((r) => (
                  <div key={r.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-red-700 font-mono">{r.receiptNo}</span>
                        <span className="font-semibold text-slate-800">{r.purpose}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {r.date} • {r.paymentMode} • Recv by: {r.collectorName}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="font-bold text-emerald-700 text-sm">
                        +{settings.currency}{r.amount.toLocaleString()}
                      </span>

                      <button
                        onClick={() => onViewReceipt(r)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
                        title="View & Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => downloadReceiptPdf(r, settings)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
                        title="Download PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleWhatsAppReceipt(r)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Share on WhatsApp (You will press Send)"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const url = createMemberIdCardWhatsAppUrl(member, settings, 2026, memberReceipts);
                window.open(url, '_blank');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95"
              title="Send Member ID Card details & verification to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send ID Card</span>
            </button>

            <button
              onClick={async () => {
                await downloadMemberIdCardPdf(member, settings, memberReceipts, 2026);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95"
              title="Download print-ready Member ID Card PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ID Card PDF</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
