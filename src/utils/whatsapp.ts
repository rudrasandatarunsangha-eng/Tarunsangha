import { PaymentReceipt, Member, ClubSettings, MemberYearlyStatus, Program } from '../types/club.ts';

/**
 * Sanitizes phone number to international WhatsApp format.
 * If 10 digits without country code, defaults to +91 (India).
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove non-digit characters except leading plus
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // If 10 digits, assume standard Indian 10-digit mobile
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Generates official click-to-chat WhatsApp link.
 * Does NOT send automatically; opens WhatsApp with pre-filled message,
 * requiring the user to tap/click "Send".
 */
export function createWhatsAppChatUrl(phone: string, message: string): string {
  const sanitized = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (!sanitized) {
    // If no phone number provided, open WhatsApp with text only
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${sanitized}?text=${encodedText}`;
}

export function formatReceiptWhatsAppMessage(receipt: PaymentReceipt, settings: ClubSettings): string {
  const categoryLabel = 
    receipt.memberCategory === 'village_resident' ? 'Village Resident' :
    receipt.memberCategory === 'club_member' ? 'Club Member' :
    receipt.memberCategory === 'patron' ? 'Honorary Patron' : 'Senior Member';

  const lines = [
    `*${settings.clubName.toUpperCase()}*`,
    `📍 ${settings.villageTown}`,
    `${settings.tagline ? settings.tagline : ''}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🧾 *OFFICIAL PAYMENT RECEIPT*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *Receipt No:* ${receipt.receiptNo}`,
    `📅 *Date:* ${receipt.date}`,
    `👤 *Member Name:* ${receipt.memberName}`,
    `🏷️ *Category:* ${categoryLabel}`,
    `📍 *Area/Ward:* ${receipt.villageWard || 'N/A'}`,
    `🎯 *Financial Year:* ${receipt.financialYear}`,
    `📌 *Purpose:* ${receipt.purpose}`,
    `💰 *Amount Paid:* ${settings.currency} ${receipt.amount.toLocaleString()}`,
    `💳 *Payment Mode:* ${receipt.paymentMode}`,
    receipt.transactionRef ? `🔖 *Txn Ref / UPI:* ${receipt.transactionRef}` : null,
    receipt.remarks ? `📝 *Remarks:* ${receipt.remarks}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✍️ *Received By:* ${receipt.collectorName}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 *Thank you for your valuable contribution towards the development and welfare of our village & club!*`,
    `📞 Helplines: ${settings.contactPhone}`
  ].filter(Boolean);

  return lines.join('\n');
}

export function formatDueReminderWhatsAppMessage(
  member: Member, 
  yearlyStatus: MemberYearlyStatus, 
  settings: ClubSettings
): string {
  const categoryLabel = 
    member.category === 'village_resident' ? 'Village Resident' :
    member.category === 'club_member' ? 'Club Core Member' :
    member.category === 'patron' ? 'Patron' : 'Senior Member';

  const lines = [
    `*${settings.clubName.toUpperCase()}*`,
    `📍 ${settings.villageTown}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🙏 *Namaskar ${member.name} ji,*`,
    ``,
    `This is a gentle update regarding your annual club contribution for *Year ${yearlyStatus.financialYear}*:`,
    ``,
    `• *Member ID:* ${member.id}`,
    `• *Category:* ${categoryLabel}`,
    `• *Annual Target Fee:* ${settings.currency} ${yearlyStatus.targetFee.toLocaleString()}`,
    `• *Amount Paid So Far:* ${settings.currency} ${yearlyStatus.paidAmount.toLocaleString()}`,
    `• *Outstanding Balance:* ${settings.currency} ${yearlyStatus.balanceDue.toLocaleString()}`,
    ``,
    `Kindly arrange to deposit your dues with our Cashier / Treasurer (${settings.treasurerName}) or via UPI at your earliest convenience to support our upcoming community events and maintenance.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📞 Contact: ${settings.contactPhone}`,
    `_Issued on behalf of ${settings.clubName} Executive Committee_`
  ];

  return lines.join('\n');
}

export function formatMemberStatementWhatsAppMessage(
  member: Member,
  receipts: PaymentReceipt[],
  settings: ClubSettings
): string {
  const totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);

  const lines = [
    `*${settings.clubName.toUpperCase()}*`,
    `📜 *MEMBER CONTRIBUTION STATEMENT*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Name:* ${member.name} (${member.id})`,
    `📞 *Phone:* ${member.phone || 'N/A'}`,
    `📍 *Ward:* ${member.villageWard || 'N/A'}`,
    `🗓️ *Member Since:* ${member.joinedYear}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Total Contributions Recorded: *${settings.currency} ${totalPaid.toLocaleString()}* across ${receipts.length} receipt(s).`,
    ``,
    `*Recent Receipts:*`,
    ...receipts.slice(0, 5).map(r => `• ${r.date} | ${r.receiptNo} | ${r.purpose} | ${settings.currency}${r.amount}`),
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Thank you for your continuous support!`,
    `📞 ${settings.contactPhone}`
  ];

  return lines.join('\n');
}

export function formatMemberIdCardWhatsAppMessage(
  member: Member,
  settings: ClubSettings,
  activeYear: number,
  receipts: PaymentReceipt[] = []
): string {
  const memberReceipts = receipts.filter(
    (r) => r.memberId === member.id && (r.status === 'APPROVED' || !r.status)
  );
  const totalPaid = memberReceipts.reduce(
    (sum, r) => (r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount),
    0
  );
  const targetFee =
    member.category === 'club_member'
      ? settings.defaultAnnualClubFee
      : settings.defaultAnnualVillageFee;
  const currentYearPaid = memberReceipts
    .filter((r) => r.financialYear === activeYear)
    .reduce((sum, r) => sum + r.amount, 0);
  const currentYearDue = Math.max(0, targetFee - currentYearPaid);
  const isPaidCurrentYear = targetFee > 0 ? currentYearDue === 0 : true;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const statementUrl = `${currentOrigin}/?tab=members&memberId=${encodeURIComponent(
    member.id
  )}&verify=${encodeURIComponent(member.id)}`;

  const lines = [
    `*${settings.clubName.toUpperCase()}*`,
    `📍 ${settings.villageTown || 'Community Club & Welfare'}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪪 *OFFICIAL MEMBER ID CARD & DIGITAL PASS*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Name:* ${member.name}`,
    `🆔 *Member ID:* ${member.id}`,
    `🏷️ *Category:* ${member.category === 'club_member' ? 'Core Club Member' : 'Village Resident'}`,
    `📍 *Village Ward:* ${member.villageWard || 'Gramin Para'}`,
    member.guardianName ? `👨‍👩‍👧 *Guardian / S/o:* ${member.guardianName}` : null,
    member.phone ? `📞 *Phone:* ${member.phone}` : null,
    `🗓️ *Member Since:* ${member.joinedYear}`,
    `🩸 *Blood Group:* ${member.bloodGroup || 'N/A'}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *${activeYear} ANNUAL SUBSCRIPTION STATUS*`,
    targetFee === 0
      ? `• Status: *Voluntary Member*`
      : isPaidCurrentYear
      ? `• Status: *PAID FULLY* (${settings.currency}${currentYearPaid}) ✅`
      : `• Status: *DUE* (${settings.currency}${currentYearDue} pending) ⚠️`,
    `• Lifetime Contributed: *${settings.currency}${totalPaid.toLocaleString('en-IN')}* (${memberReceipts.length} receipts)`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *Live Verification Statement & Digital Pass:*`,
    statementUrl,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🤝 _Please keep this official membership record safe. Scan QR code on your card for live dues & verification._`,
    `📞 Helplines: ${settings.contactPhone}`,
    `✍️ General Secretary: ${settings.secretaryName || 'Secretary'}`
  ].filter(Boolean);

  return lines.join('\n');
}

export function createMemberIdCardWhatsAppUrl(
  member: Member,
  settings: ClubSettings,
  activeYear: number,
  receipts: PaymentReceipt[] = []
): string {
  const msg = formatMemberIdCardWhatsAppMessage(member, settings, activeYear, receipts);
  return createWhatsAppChatUrl(member.phone || '', msg);
}


export function formatProgramAgreementWhatsAppMessage(
  program: Program,
  settings: ClubSettings,
  receipts: PaymentReceipt[] = []
): string {
  const programPayments = receipts.filter(r => r.programId === program.id && r.status === 'APPROVED');
  const totalApproved = programPayments.reduce((sum, r) => {
    return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
  }, 0);
  const remainingBalanceDue = Math.max(0, program.totalContractAmount - totalApproved);

  const lines = [
    `*${settings.clubName.toUpperCase()}*`,
    `📍 ${settings.villageTown}`,
    settings.tagline ? `_${settings.tagline}_` : null,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📜 *OFFICIAL PROGRAM BOOKING AGREEMENT*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📋 *Contract ID:* ${program.id}`,
    `📅 *Contract Date:* ${program.contractDate}`,
    `🎭 *Program Name:* ${program.name}`,
    `🏷️ *Category/Type:* ${program.type}`,
    `🗓️ *Event Date:* ${program.programDate}`,
    `⏰ *Timings:* ${program.startTime} - ${program.endTime}`,
    `📍 *Venue:* ${program.venue}`,
    program.venueAddress ? `📌 *Venue Address:* ${program.venueAddress}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Client / Organizer:* ${program.organizerName}`,
    program.organizerCompany ? `🏢 *Troupe / Org:* ${program.organizerCompany}` : null,
    program.organizerPhone ? `📞 *Phone:* ${program.organizerPhone}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *FINANCIAL TERMS*`,
    `• *Total Agreed Value:* ${settings.currency} ${program.totalContractAmount.toLocaleString('en-IN')}/-`,
    `• *Initial Advance Agreed:* ${settings.currency} ${program.initialAdvanceAmount.toLocaleString('en-IN')}/-`,
    `• *Confirmed Received:* ${settings.currency} ${totalApproved.toLocaleString('en-IN')}/-`,
    `• *Balance Payable:* ${settings.currency} ${remainingBalanceDue.toLocaleString('en-IN')}/-`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    program.specialInstructions ? `📝 *Special Scope / Notes:*\n${program.specialInstructions}\n━━━━━━━━━━━━━━━━━━━━━━` : null,
    `📌 *Status:* ${program.status.toUpperCase()}`,
    ``,
    `🤝 *This official agreement and booking memorandum is digitally confirmed by ${settings.clubName}. Please preserve this message and digital PDF for records.*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📞 Helplines: ${settings.contactPhone}`,
    `✍️ General Secretary: ${settings.secretaryName}`
  ].filter(Boolean);

  return lines.join('\n');
}

export function createProgramAgreementWhatsAppUrl(
  program: Program,
  settings: ClubSettings,
  receipts: PaymentReceipt[] = []
): string {
  const message = formatProgramAgreementWhatsAppMessage(program, settings, receipts);
  return createWhatsAppChatUrl(program.organizerPhone || '', message);
}

