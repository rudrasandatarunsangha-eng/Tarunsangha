import { ClubDatabase, Member, PaymentReceipt, Expense, MemberYearlyStatus, ClubSettings } from '../types/club.ts';

// Helper to escape CSV strings
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

// Download helper for browser
function triggerDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Members for Google Sheets / Excel
export function exportMembersCsv(members: Member[]): void {
  const headers = [
    'Member ID',
    'Full Name',
    'Phone',
    'Category',
    'Area / Ward',
    'Guardian / Father Name',
    'Joined Year',
    'Status',
    'Address',
    'Notes',
  ];

  const rows = members.map(m => [
    escapeCsv(m.id),
    escapeCsv(m.name),
    escapeCsv(m.phone),
    escapeCsv(m.category === 'village_resident' ? 'Village Resident' : m.category === 'club_member' ? 'Club Member' : m.category === 'patron' ? 'Honorary Patron' : 'Senior'),
    escapeCsv(m.villageWard),
    escapeCsv(m.guardianName),
    escapeCsv(m.joinedYear),
    escapeCsv(m.status),
    escapeCsv(m.address),
    escapeCsv(m.notes),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  triggerDownload(csvContent, `Club_Members_List_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Receipts / Payment Collections
export function exportReceiptsCsv(receipts: PaymentReceipt[]): void {
  const headers = [
    'Receipt No',
    'Date',
    'Member ID',
    'Member Name',
    'Category',
    'Phone',
    'Ward / Area',
    'Financial Year',
    'Purpose',
    'Amount (INR)',
    'Payment Mode',
    'Transaction Ref',
    'Collector / Cashier',
    'Remarks',
  ];

  const rows = receipts.map(r => [
    escapeCsv(r.receiptNo),
    escapeCsv(r.date),
    escapeCsv(r.memberId),
    escapeCsv(r.memberName),
    escapeCsv(r.memberCategory),
    escapeCsv(r.phone),
    escapeCsv(r.villageWard),
    escapeCsv(r.financialYear),
    escapeCsv(r.purpose),
    escapeCsv(r.amount),
    escapeCsv(r.paymentMode),
    escapeCsv(r.transactionRef),
    escapeCsv(r.collectorName),
    escapeCsv(r.remarks),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  triggerDownload(csvContent, `Club_Receipts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Expenses
export function exportExpensesCsv(expenses: Expense[]): void {
  const headers = [
    'Voucher No',
    'Date',
    'Category',
    'Title / Description',
    'Amount (INR)',
    'Paid To',
    'Approved By',
    'Payment Mode',
    'Financial Year',
    'Remarks',
  ];

  const rows = expenses.map(e => [
    escapeCsv(e.voucherNo),
    escapeCsv(e.date),
    escapeCsv(e.category),
    escapeCsv(e.title),
    escapeCsv(e.amount),
    escapeCsv(e.paidTo),
    escapeCsv(e.approvedBy),
    escapeCsv(e.paymentMode),
    escapeCsv(e.financialYear),
    escapeCsv(e.remarks),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  triggerDownload(csvContent, `Club_Expenses_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Yearly Member Summary & Dues (Google Sheets compatible)
export function exportYearlySummaryCsv(summary: MemberYearlyStatus[], year: number): void {
  const headers = [
    'Member ID',
    'Name',
    'Category',
    'Phone',
    'Area / Ward',
    'Financial Year',
    'Target Fee (INR)',
    'Paid So Far (INR)',
    'Balance Due (INR)',
    'Payment Status',
    'Receipts Count',
    'Last Payment Date',
  ];

  const rows = summary.map(s => [
    escapeCsv(s.member.id),
    escapeCsv(s.member.name),
    escapeCsv(s.member.category === 'village_resident' ? 'Village Resident' : s.member.category === 'club_member' ? 'Club Member' : s.member.category === 'patron' ? 'Honorary Patron' : 'Senior'),
    escapeCsv(s.member.phone),
    escapeCsv(s.member.villageWard),
    escapeCsv(s.financialYear),
    escapeCsv(s.targetFee),
    escapeCsv(s.paidAmount),
    escapeCsv(s.balanceDue),
    escapeCsv(s.status.toUpperCase()),
    escapeCsv(s.receiptCount),
    escapeCsv(s.lastPaymentDate || 'None'),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  triggerDownload(csvContent, `Member_Yearly_Summary_${year}_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Full JSON Backup
export function exportDatabaseBackupJson(db: ClubDatabase): void {
  const jsonStr = JSON.stringify(db, null, 2);
  triggerDownload(jsonStr, `Gramin_Club_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
}

export interface DayCollectionRow {
  date: string;
  dayOfWeek: string;
  receiptCount: number;
  cashAmount: number;
  digitalAmount: number;
  bankAmount: number;
  totalAmount: number;
  collectors: string;
  purposes: string;
}

// Export Day-Wise Payment Collection Report for Google Sheets / Excel
export function exportDayWiseCollectionCsv(rows: DayCollectionRow[], filterLabel: string = ''): void {
  const headers = [
    'Date',
    'Day of Week',
    'Total Receipts',
    'Cash Collection (INR)',
    'Digital / UPI Collection (INR)',
    'Bank / Cheque (INR)',
    'Net Daily Total (INR)',
    'Active Collectors',
    'Payment Categories / Heads',
  ];

  const dataRows = rows.map(r => [
    escapeCsv(r.date),
    escapeCsv(r.dayOfWeek),
    escapeCsv(r.receiptCount),
    escapeCsv(r.cashAmount),
    escapeCsv(r.digitalAmount),
    escapeCsv(r.bankAmount),
    escapeCsv(r.totalAmount),
    escapeCsv(r.collectors),
    escapeCsv(r.purposes),
  ].join(','));

  const csvContent = [headers.join(','), ...dataRows].join('\n');
  const cleanLabel = filterLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Day_Wise_Payment_Collection_${cleanLabel ? cleanLabel + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
  triggerDownload(csvContent, filename);
}

// Export Member Ledger CSV
export function exportMemberLedgerCsv(
  memberName: string,
  memberId: string,
  transactions: Array<{
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
  }>
): void {
  const headers = [
    'Date',
    'Transaction ID',
    'Receipt No',
    'Description / Head',
    'Payment Type',
    'Payment Mode',
    'Debit (Fees Assessed INR)',
    'Credit (Amount Paid INR)',
    'Running Outstanding Balance (INR)',
    'Status',
    'Collector / Signatory'
  ];

  const dataRows = transactions.map(t => [
    escapeCsv(t.date),
    escapeCsv(t.txnId),
    escapeCsv(t.receiptNo),
    escapeCsv(t.description),
    escapeCsv(t.type),
    escapeCsv(t.mode),
    escapeCsv(t.debit),
    escapeCsv(t.credit),
    escapeCsv(t.balance),
    escapeCsv(t.status),
    escapeCsv(t.collector)
  ].join(','));

  const csvContent = [headers.join(','), ...dataRows].join('\n');
  const cleanId = memberId.replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerDownload(csvContent, `Member_Ledger_${cleanId}_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Customer Selections CSV
export function exportCustomerSelectionsCsv(
  selections: Array<{
    id: string;
    memberId: string;
    memberName: string;
    customerName: string;
    customerId?: string;
    category: string;
    phone?: string;
    reason?: string;
    status: string;
    adminRemarks?: string;
    actionBy?: string;
    createdAt: string;
  }>
): void {
  const headers = [
    'Selection ID',
    'Member ID',
    'Member Name',
    'Customer / Beneficiary Name',
    'Customer Ref ID',
    'Selection Category',
    'Contact Phone',
    'Member Justification',
    'Selection Status',
    'Admin Remarks',
    'Finalized By',
    'Submission Date'
  ];

  const dataRows = selections.map(s => [
    escapeCsv(s.id),
    escapeCsv(s.memberId),
    escapeCsv(s.memberName),
    escapeCsv(s.customerName),
    escapeCsv(s.customerId || ''),
    escapeCsv(s.category),
    escapeCsv(s.phone || ''),
    escapeCsv(s.reason || ''),
    escapeCsv(s.status),
    escapeCsv(s.adminRemarks || ''),
    escapeCsv(s.actionBy || ''),
    escapeCsv(s.createdAt)
  ].join(','));

  const csvContent = [headers.join(','), ...dataRows].join('\n');
  triggerDownload(csvContent, `Customer_Selections_Report_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export Full Members List and Payment History Audit Trail for External Auditing & Record-Keeping
export function exportFullMembersPaymentHistoryAuditCsv(
  members: Member[],
  receipts: PaymentReceipt[],
  settings?: ClubSettings,
  activeYear?: number
): void {
  const currentYear = activeYear || (settings?.activeFinancialYear ?? 2026);
  const defaultClubFee = settings?.defaultAnnualClubFee ?? 1200;
  const defaultResidentFee = settings?.defaultAnnualResidentFee ?? settings?.defaultAnnualVillageFee ?? 600;

  const headers = [
    'Member ID',
    'Member Full Name',
    'Phone Number',
    'Member Category',
    'Village Ward / Area',
    'Guardian / Father Name',
    'Member Status',
    'Joined Year',
    'Address',
    'Active FY',
    'FY Target Fee (INR)',
    'FY Total Paid (INR)',
    'FY Balance Due (INR)',
    'FY Payment Compliance',
    'Lifetime Total Paid (INR)',
    'Lifetime Approved Paid (INR)',
    'Lifetime Receipts Count',
    'Record Type',
    'Receipt No',
    'Payment Date',
    'Financial Year',
    'Fee Head / Purpose',
    'Payment Type',
    'Amount Paid (INR)',
    'Payment Mode',
    'Transaction / UPI Ref',
    'Collector / Cashier',
    'Submitted By',
    'Submission Date & Time',
    'Payment Approval Status',
    'Approved By',
    'Approved At',
    'Payment Remarks / Notes',
  ];

  const categoryName = (cat: string) => {
    switch (cat) {
      case 'village_resident': return 'Village Resident';
      case 'club_member': return 'Club Member';
      case 'patron': return 'Honorary Patron';
      case 'senior': return 'Senior Citizen';
      default: return cat || 'Member';
    }
  };

  // Sort members by ID numerically/alphabetically
  const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const rows: string[] = [];
  const matchedReceiptIds = new Set<string>();

  sortedMembers.forEach(m => {
    // Member's target fee for active FY
    const targetFee = m.category === 'club_member'
      ? defaultClubFee
      : m.category === 'village_resident'
      ? defaultResidentFee
      : 0;

    // Find all receipts belonging to this member
    const memberReceipts = receipts.filter(r => {
      const match = (r.memberId && r.memberId === m.id) ||
        (!r.memberId && r.memberName && r.memberName.trim().toLowerCase() === m.name.trim().toLowerCase());
      if (match) matchedReceiptIds.add(r.id);
      return match;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // FY payment calculation
    const fyReceipts = memberReceipts.filter(r => r.financialYear === currentYear && r.status === 'APPROVED');
    const fyPaid = fyReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const fyDue = Math.max(0, targetFee - fyPaid);
    const fyCompliance = targetFee === 0 
      ? 'Exempt / Voluntary' 
      : fyDue === 0 
      ? 'Fully Paid' 
      : fyPaid > 0 
      ? 'Partially Paid' 
      : 'Unpaid / Arrears';

    // Lifetime totals
    const lifetimePaid = memberReceipts
      .filter(r => r.status !== 'VOIDED' && r.status !== 'REJECTED')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const lifetimeApproved = memberReceipts
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const baseMemberCols = [
      escapeCsv(m.id),
      escapeCsv(m.name),
      escapeCsv(m.phone || 'N/A'),
      escapeCsv(categoryName(m.category)),
      escapeCsv(m.villageWard || 'N/A'),
      escapeCsv(m.guardianName || 'N/A'),
      escapeCsv(m.status === 'active' ? 'Active' : 'Inactive'),
      escapeCsv(m.joinedYear || 'N/A'),
      escapeCsv(m.address || 'N/A'),
      escapeCsv(`FY ${currentYear - 1}-${currentYear}`),
      escapeCsv(targetFee),
      escapeCsv(fyPaid),
      escapeCsv(fyDue),
      escapeCsv(fyCompliance),
      escapeCsv(lifetimePaid),
      escapeCsv(lifetimeApproved),
      escapeCsv(memberReceipts.length),
    ];

    if (memberReceipts.length === 0) {
      // Member with zero payments — output 1 row for complete external audit accounting
      const zeroRow = [
        ...baseMemberCols,
        escapeCsv('NO_PAYMENT_ON_RECORD'),
        escapeCsv('NIL'),
        escapeCsv('NIL'),
        escapeCsv(`FY ${currentYear - 1}-${currentYear}`),
        escapeCsv('NIL (No receipts recorded)'),
        escapeCsv('N/A'),
        escapeCsv(0),
        escapeCsv('N/A'),
        escapeCsv(''),
        escapeCsv('N/A'),
        escapeCsv('N/A'),
        escapeCsv(''),
        escapeCsv('N/A'),
        escapeCsv(''),
        escapeCsv(''),
        escapeCsv(m.notes || 'No payment records exist for this member'),
      ].join(',');
      rows.push(zeroRow);
    } else {
      // Member with receipts — emit 1 row per payment receipt
      memberReceipts.forEach(r => {
        const txnRow = [
          ...baseMemberCols,
          escapeCsv('PAYMENT_TRANSACTION'),
          escapeCsv(r.receiptNo),
          escapeCsv(r.date),
          escapeCsv(`FY ${r.financialYear - 1}-${r.financialYear}`),
          escapeCsv(r.purpose || 'Annual Contribution'),
          escapeCsv(r.paymentType || 'General'),
          escapeCsv(r.amount),
          escapeCsv(r.paymentMode),
          escapeCsv(r.transactionRef || ''),
          escapeCsv(r.collectorName || 'N/A'),
          escapeCsv(r.submittedBy || 'N/A'),
          escapeCsv(r.submissionDateTime || ''),
          escapeCsv(r.status),
          escapeCsv(r.approvedBy || ''),
          escapeCsv(r.approvedAt || ''),
          escapeCsv(r.remarks || ''),
        ].join(',');
        rows.push(txnRow);
      });
    }
  });

  // Include any member receipts not linked to current member IDs (e.g. historical/former member records)
  const unmatchedMemberReceipts = receipts.filter(r => 
    !matchedReceiptIds.has(r.id) && 
    (r.payerType === 'member' || (!r.payerType && !r.organizerId))
  );

  unmatchedMemberReceipts.forEach(r => {
    const orphanRow = [
      escapeCsv(r.memberId || 'UNLINKED-MEMBER'),
      escapeCsv(r.memberName || 'Direct / Former Member'),
      escapeCsv(r.phone || 'N/A'),
      escapeCsv(categoryName(r.memberCategory || '')),
      escapeCsv(r.villageWard || 'N/A'),
      escapeCsv('N/A'),
      escapeCsv('Unregistered / Former Member'),
      escapeCsv('N/A'),
      escapeCsv('N/A'),
      escapeCsv(`FY ${r.financialYear - 1}-${r.financialYear}`),
      escapeCsv(0),
      escapeCsv(r.amount),
      escapeCsv(0),
      escapeCsv('Direct Payment Record'),
      escapeCsv(r.amount),
      escapeCsv(r.status === 'APPROVED' ? r.amount : 0),
      escapeCsv(1),
      escapeCsv('DIRECT_MEMBER_PAYMENT'),
      escapeCsv(r.receiptNo),
      escapeCsv(r.date),
      escapeCsv(`FY ${r.financialYear - 1}-${r.financialYear}`),
      escapeCsv(r.purpose || 'Annual Contribution'),
      escapeCsv(r.paymentType || 'General'),
      escapeCsv(r.amount),
      escapeCsv(r.paymentMode),
      escapeCsv(r.transactionRef || ''),
      escapeCsv(r.collectorName || 'N/A'),
      escapeCsv(r.submittedBy || 'N/A'),
      escapeCsv(r.submissionDateTime || ''),
      escapeCsv(r.status),
      escapeCsv(r.approvedBy || ''),
      escapeCsv(r.approvedAt || ''),
      escapeCsv(r.remarks || 'Historical member payment entry'),
    ].join(',');
    rows.push(orphanRow);
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const clubNamePrefix = settings?.clubName ? settings.clubName.replace(/[^a-zA-Z0-9]/g, '_') + '_' : '';
  const filename = `${clubNamePrefix}Members_Full_Payment_History_Audit_${new Date().toISOString().split('T')[0]}.csv`;
  triggerDownload(csvContent, filename);
}

// Export Members Payment Audit Summary CSV (1 row per member)
export function exportMembersPaymentAuditSummaryCsv(
  members: Member[],
  receipts: PaymentReceipt[],
  settings?: ClubSettings,
  activeYear?: number
): void {
  const currentYear = activeYear || (settings?.activeFinancialYear ?? 2026);
  const defaultClubFee = settings?.defaultAnnualClubFee ?? 1200;
  const defaultResidentFee = settings?.defaultAnnualResidentFee ?? settings?.defaultAnnualVillageFee ?? 600;

  const headers = [
    'Member ID',
    'Member Full Name',
    'Phone Number',
    'Category',
    'Ward / Area',
    'Guardian / Father Name',
    'Status',
    'Joined Year',
    'Active FY',
    'FY Target Fee (INR)',
    'FY Paid (INR)',
    'FY Balance Due (INR)',
    'Compliance Status',
    'Lifetime Total Paid (INR)',
    'Lifetime Approved Paid (INR)',
    'Total Receipts Count',
    'First Payment Date',
    'Latest Payment Date',
    'Latest Receipt No',
    'Payment Modes Used',
    'Address',
    'Notes'
  ];

  const categoryName = (cat: string) => {
    switch (cat) {
      case 'village_resident': return 'Village Resident';
      case 'club_member': return 'Club Member';
      case 'patron': return 'Honorary Patron';
      case 'senior': return 'Senior Citizen';
      default: return cat || 'Member';
    }
  };

  const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const rows: string[] = [];
  const matchedReceiptIds = new Set<string>();

  sortedMembers.forEach(m => {
    const targetFee = m.category === 'club_member'
      ? defaultClubFee
      : m.category === 'village_resident'
      ? defaultResidentFee
      : 0;

    const memberReceipts = receipts.filter(r => {
      const match = (r.memberId && r.memberId === m.id) ||
        (!r.memberId && r.memberName && r.memberName.trim().toLowerCase() === m.name.trim().toLowerCase());
      if (match) matchedReceiptIds.add(r.id);
      return match;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const fyReceipts = memberReceipts.filter(r => r.financialYear === currentYear && r.status === 'APPROVED');
    const fyPaid = fyReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const fyDue = Math.max(0, targetFee - fyPaid);
    const fyCompliance = targetFee === 0 
      ? 'Exempt / Voluntary' 
      : fyDue === 0 
      ? 'Fully Paid' 
      : fyPaid > 0 
      ? 'Partially Paid' 
      : 'Unpaid / Arrears';

    const lifetimePaid = memberReceipts
      .filter(r => r.status !== 'VOIDED' && r.status !== 'REJECTED')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const lifetimeApproved = memberReceipts
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const firstDate = memberReceipts.length > 0 ? memberReceipts[memberReceipts.length - 1].date : 'N/A';
    const lastDate = memberReceipts.length > 0 ? memberReceipts[0].date : 'N/A';
    const lastRcp = memberReceipts.length > 0 ? memberReceipts[0].receiptNo : 'N/A';
    const modesUsed = Array.from(new Set(memberReceipts.map(r => r.paymentMode).filter(Boolean))).join('; ') || 'None';

    const row = [
      escapeCsv(m.id),
      escapeCsv(m.name),
      escapeCsv(m.phone || 'N/A'),
      escapeCsv(categoryName(m.category)),
      escapeCsv(m.villageWard || 'N/A'),
      escapeCsv(m.guardianName || 'N/A'),
      escapeCsv(m.status === 'active' ? 'Active' : 'Inactive'),
      escapeCsv(m.joinedYear || 'N/A'),
      escapeCsv(`FY ${currentYear - 1}-${currentYear}`),
      escapeCsv(targetFee),
      escapeCsv(fyPaid),
      escapeCsv(fyDue),
      escapeCsv(fyCompliance),
      escapeCsv(lifetimePaid),
      escapeCsv(lifetimeApproved),
      escapeCsv(memberReceipts.length),
      escapeCsv(firstDate),
      escapeCsv(lastDate),
      escapeCsv(lastRcp),
      escapeCsv(modesUsed),
      escapeCsv(m.address || ''),
      escapeCsv(m.notes || ''),
    ].join(',');
    rows.push(row);
  });

  // Include any unmatched member payments in summary
  const unmatchedMemberReceipts = receipts.filter(r => 
    !matchedReceiptIds.has(r.id) && 
    (r.payerType === 'member' || (!r.payerType && !r.organizerId))
  );

  unmatchedMemberReceipts.forEach(r => {
    const orphanSummaryRow = [
      escapeCsv(r.memberId || 'UNLINKED-MEMBER'),
      escapeCsv(r.memberName || 'Direct / Former Member'),
      escapeCsv(r.phone || 'N/A'),
      escapeCsv(categoryName(r.memberCategory || '')),
      escapeCsv(r.villageWard || 'N/A'),
      escapeCsv('N/A'),
      escapeCsv('Unregistered / Former Member'),
      escapeCsv('N/A'),
      escapeCsv(`FY ${r.financialYear - 1}-${r.financialYear}`),
      escapeCsv(0),
      escapeCsv(r.amount),
      escapeCsv(0),
      escapeCsv('Direct Payment Record'),
      escapeCsv(r.amount),
      escapeCsv(r.status === 'APPROVED' ? r.amount : 0),
      escapeCsv(1),
      escapeCsv(r.date),
      escapeCsv(r.date),
      escapeCsv(r.receiptNo),
      escapeCsv(r.paymentMode || 'None'),
      escapeCsv(''),
      escapeCsv(r.remarks || 'Historical member payment entry'),
    ].join(',');
    rows.push(orphanSummaryRow);
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const clubNamePrefix = settings?.clubName ? settings.clubName.replace(/[^a-zA-Z0-9]/g, '_') + '_' : '';
  const filename = `${clubNamePrefix}Members_Payment_Audit_Summary_${new Date().toISOString().split('T')[0]}.csv`;
  triggerDownload(csvContent, filename);
}


