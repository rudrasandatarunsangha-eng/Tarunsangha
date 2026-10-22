import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PaymentReceipt, ClubSettings, Program, Member } from '../types/club.ts';

// Helper to convert numbers to Indian Rupee Words
function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rem = num % 100;

  if (crore) words += inWords(crore) + ' Crore ';
  if (lakh) words += inWords(lakh) + ' Lakh ';
  if (thousand) words += inWords(thousand) + ' Thousand ';
  if (hundred) words += inWords(hundred) + ' Hundred ';
  if (rem) {
    if (words !== '') words += 'and ';
    words += inWords(rem);
  }

  return words.trim() + ' Rupees Only';
}

export function generateReceiptPdf(receipt: PaymentReceipt, settings: ClubSettings): jsPDF {
  // A5 Landscape orientation (210mm x 148mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Outer Border
  doc.setDrawColor(24, 76, 120); // Deep Club Blue
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, width - margin * 2, height - margin * 2);

  // Inner decorative thin border
  doc.setDrawColor(180, 200, 220);
  doc.setLineWidth(0.4);
  doc.rect(margin + 1.5, margin + 1.5, width - (margin + 1.5) * 2, height - (margin + 1.5) * 2);

  // Top Header Banner
  doc.setFillColor(243, 248, 255);
  doc.rect(margin + 2, margin + 2, width - (margin + 2) * 2, 28, 'F');

  // Club Logo in PDF Banner (if provided)
  if (settings.logoUrl) {
    try {
      doc.addImage(settings.logoUrl, 'PNG', margin + 5, margin + 4, 22, 22);
    } catch {
      // Graceful fallback if vector SVG is passed
    }
  }

  // Club Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 45, 90);
  doc.text(settings.clubName.toUpperCase(), width / 2, margin + 9, { align: 'center' });

  // Tagline / Reg Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(
    `${settings.villageTown} • Reg. No: ${settings.registrationNo} • Phone: ${settings.contactPhone}`,
    width / 2,
    margin + 15,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 125);
  doc.text(settings.tagline, width / 2, margin + 20, { align: 'center' });

  // Receipt Title Badge
  doc.setFillColor(15, 45, 90);
  doc.roundedRect(width / 2 - 32, margin + 22.5, 64, 7.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL MONEY RECEIPT', width / 2, margin + 27.5, { align: 'center' });

  // Metadata Row: Receipt No & Date
  const metaY = margin + 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Receipt No: ', margin + 8, metaY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red-amber for receipt number
  doc.text(receipt.receiptNo, margin + 28, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Date: ', width - margin - 40, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(receipt.date, width - margin - 28, metaY);

  // Divider Line
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.4);
  doc.line(margin + 8, metaY + 3, width - margin - 8, metaY + 3);

  // Body content table
  const contentY = metaY + 10;
  const col1 = margin + 8;
  const colVal1 = margin + 50;

  const categoryLabel = 
    receipt.memberCategory === 'village_resident' ? 'Village Resident' :
    receipt.memberCategory === 'club_member' ? 'Core Club Member' :
    receipt.memberCategory === 'patron' ? 'Honorary Patron' : 'Senior Member';

  const rows = [
    { label: 'Received with thanks from:', value: `${receipt.memberName}  (ID: ${receipt.memberId || 'N/A'})` },
    { label: 'Category & Area / Ward:', value: `${categoryLabel}  •  ${receipt.villageWard || 'Gramin Para'}` },
    { label: 'Financial Year / Account:', value: `FY ${receipt.financialYear}  •  ${receipt.purpose}` },
    { label: 'Payment Mode & Ref:', value: `${receipt.paymentMode}${receipt.transactionRef ? ` (Ref: ${receipt.transactionRef})` : ''}` },
  ];

  let currentY = contentY;
  rows.forEach(r => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(r.label, col1, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(r.value, colVal1, currentY);
    currentY += 7;
  });

  // Amount in Words
  const amountWords = numberToWordsIndian(receipt.amount);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount in Words:', col1, currentY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(amountWords, colVal1, currentY);

  // Amount Highlight Box
  const amountBoxY = currentY + 6;
  doc.setFillColor(240, 253, 244); // Soft Green
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + 8, amountBoxY, 65, 11, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(`${settings.currency} ${receipt.amount.toLocaleString('en-IN')}/-`, margin + 40, amountBoxY + 7.5, { align: 'center' });

  // Verification Seal
  doc.setDrawColor(24, 76, 120);
  doc.setLineWidth(0.4);
  doc.roundedRect(width / 2 - 18, amountBoxY, 36, 11, 1, 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(24, 76, 120);
  doc.text('OFFICIALLY VERIFIED', width / 2, amountBoxY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLUB ACCOUNTS STAMP', width / 2, amountBoxY + 8.5, { align: 'center' });

  // Signatures Section at the bottom
  const sigY = height - margin - 15;

  // Left Signature (Collector / Treasurer)
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin + 8, sigY, margin + 55, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(receipt.collectorName || settings.treasurerName, margin + 31.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Cashier / Collector', margin + 31.5, sigY + 7.5, { align: 'center' });

  // Right Signature (General Secretary)
  doc.line(width - margin - 55, sigY, width - margin - 8, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.secretaryName, width - margin - 31.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('General Secretary / President', width - margin - 31.5, sigY + 7.5, { align: 'center' });

  // Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer-generated digital receipt issued by Gramin Club Manager • Preserves village records securely', width / 2, height - margin - 3, { align: 'center' });

  return doc;
}

export function downloadReceiptPdf(receipt: PaymentReceipt, settings: ClubSettings): void {
  const doc = generateReceiptPdf(receipt, settings);
  const cleanNum = receipt.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Receipt-${cleanNum}.pdf`);
}

/**
 * Generates an official, publication-quality A4 Program Agreement & Contract PDF.
 */
export function generateProgramAgreementPdf(
  program: Program,
  settings: ClubSettings,
  receipts: PaymentReceipt[] = []
): jsPDF {
  // A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = width - margin * 2;

  // 1. Double Outer Borders
  doc.setDrawColor(24, 76, 120); // Deep Club Navy
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, contentWidth, height - margin * 2);

  doc.setDrawColor(180, 200, 220); // Inner thin accent
  doc.setLineWidth(0.4);
  doc.rect(margin + 1.5, margin + 1.5, contentWidth - 3, height - margin * 2 - 3);

  // 2. Official Club Header Banner
  doc.setFillColor(243, 248, 255);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, 30, 'F');

  // Club Logo if available
  if (settings.logoUrl) {
    try {
      doc.addImage(settings.logoUrl, 'PNG', margin + 5, margin + 4.5, 23, 23);
    } catch {
      // Fallback if vector SVG or cross-origin
    }
  }

  // Club Name & Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 45, 90);
  doc.text(settings.clubName.toUpperCase(), width / 2, margin + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(
    `${settings.villageTown}  •  Reg. No: ${settings.registrationNo}  •  Phone: ${settings.contactPhone}`,
    width / 2,
    margin + 15,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 125);
  doc.text(settings.tagline || 'Preserving village culture & community harmony', width / 2, margin + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 130, 145);
  doc.text(`Official Executive Contact: ${settings.contactEmail}  •  General Secretary: ${settings.secretaryName}`, width / 2, margin + 25, { align: 'center' });

  // 3. Document Title Ribbon
  const titleY = margin + 34;
  doc.setFillColor(15, 45, 90);
  doc.roundedRect(width / 2 - 58, titleY, 116, 8, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL PROGRAM AGREEMENT & BOOKING CONTRACT', width / 2, titleY + 5.5, { align: 'center' });

  // 4. Agreement Metadata Row
  const metaY = titleY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Contract Ref ID:', margin + 6, metaY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Highlight red
  doc.text(program.id, margin + 35, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Contract Date:', margin + 75, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(program.contractDate, margin + 98, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Booking Status:', width - margin - 52, metaY);
  
  // Status badge
  const statusColor = program.status === 'Completed' ? [22, 101, 52] :
                      program.status === 'Booked' ? [30, 64, 175] :
                      program.status === 'In Progress' ? [146, 64, 14] : [153, 27, 27];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(program.status.toUpperCase(), width - margin - 26, metaY);

  // Divider Line
  doc.setDrawColor(210, 220, 230);
  doc.setLineWidth(0.4);
  doc.line(margin + 5, metaY + 3.5, width - margin - 5, metaY + 3.5);

  // 5. Two Cards: Program Logistics & Organizer Particulars
  const cardY = metaY + 6;
  const colWidth = (contentWidth - 14) / 2;
  const leftX = margin + 5;
  const rightX = leftX + colWidth + 4;
  const cardHeight = 44;

  // Left Card: Program Logistics
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, cardY, colWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(leftX, cardY, colWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(49, 46, 129);
  doc.text('1. EVENT & VENUE SPECIFICATIONS', leftX + 4, cardY + 5);

  let py = cardY + 11.5;
  const progRows = [
    { label: 'Program Name:', value: program.name },
    { label: 'Category / Type:', value: program.type },
    { label: 'Event Date:', value: program.programDate },
    { label: 'Schedule Timings:', value: `${program.startTime}  to  ${program.endTime}` },
    { label: 'Venue Location:', value: `${program.venue}` },
    { label: 'Venue Address:', value: program.venueAddress || 'As registered in club records' }
  ];

  progRows.forEach(row => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, leftX + 4, py);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    // Truncate long value if needed
    const truncatedVal = row.value.length > 34 ? row.value.substring(0, 32) + '...' : row.value;
    doc.text(truncatedVal, leftX + 33, py);
    py += 5.2;
  });

  // Right Card: Client / Organizer Particulars
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, cardY, colWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(rightX, cardY, colWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 83, 45);
  doc.text('2. CLIENT / ORGANIZER PARTICULARS', rightX + 4, cardY + 5);

  let oy = cardY + 11.5;
  const orgRows = [
    { label: 'Organizer Name:', value: program.organizerName },
    { label: 'Troupe / Company:', value: program.organizerCompany || 'Individual Organizer' },
    { label: 'Contact Phone:', value: program.organizerPhone || 'N/A' },
    { label: 'Organizer ID / Ref:', value: program.organizerId || 'ORG-REF-N/A' },
    { label: 'Event Status:', value: program.status },
    { label: 'Record Created:', value: program.createdAt ? program.createdAt.split('T')[0] : program.contractDate }
  ];

  orgRows.forEach(row => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, rightX + 4, oy);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const truncatedVal = row.value.length > 34 ? row.value.substring(0, 32) + '...' : row.value;
    doc.text(truncatedVal, rightX + 33, oy);
    oy += 5.2;
  });

  // 6. Section 3: Financial Schedule & Payment Breakdown
  const finY = cardY + cardHeight + 4;
  const finHeight = 44;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, finY, contentWidth - 10, finHeight, 1.5, 1.5, 'FD');

  // Financial Header
  doc.setFillColor(254, 243, 199); // Soft amber header
  doc.roundedRect(leftX, finY, contentWidth - 10, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('3. FINANCIAL TERMS, ADVANCE & SETTLEMENT SCHEDULE', leftX + 4, finY + 5);

  // Financial Calculations
  const programPayments = receipts.filter(r => r.programId === program.id && r.status === 'APPROVED');
  const totalApprovedReceived = programPayments.reduce((sum, r) => {
    return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
  }, 0);
  const remainingBalanceDue = Math.max(0, program.totalContractAmount - totalApprovedReceived);

  // Financial values grid (3 columns)
  const fBoxY = finY + 9.5;
  const colFWidth = (contentWidth - 18) / 3;

  // Box 1: Total Contract Amount
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftX + 2, fBoxY, colFWidth, 16, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL CONTRACT VALUE', leftX + 4, fBoxY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${settings.currency} ${program.totalContractAmount.toLocaleString('en-IN')}/-`, leftX + 4, fBoxY + 11.5);

  // Box 2: Agreed Advance / Received
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(leftX + 2 + colFWidth + 2, fBoxY, colFWidth, 16, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('CONFIRMED RECEIVED TO DATE', leftX + 2 + colFWidth + 4, fBoxY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(`${settings.currency} ${totalApprovedReceived.toLocaleString('en-IN')}/-`, leftX + 2 + colFWidth + 4, fBoxY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(74, 222, 128);
  doc.text(`(Initial Advance: ${settings.currency} ${program.initialAdvanceAmount.toLocaleString('en-IN')})`, leftX + 2 + colFWidth + 4, fBoxY + 14.5);

  // Box 3: Balance Due
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(leftX + 2 + (colFWidth + 2) * 2, fBoxY, colFWidth, 16, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.text('OUTSTANDING BALANCE DUE', leftX + 2 + (colFWidth + 2) * 2 + 4, fBoxY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28);
  doc.text(`${settings.currency} ${remainingBalanceDue.toLocaleString('en-IN')}/-`, leftX + 2 + (colFWidth + 2) * 2 + 4, fBoxY + 11.5);

  // Amount in words
  const wordsY = fBoxY + 20.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Contract Amount in Words:', leftX + 4, wordsY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWordsIndian(program.totalContractAmount), leftX + 42, wordsY);

  // Settlement Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `* Condition: Outstanding balance of ${settings.currency} ${remainingBalanceDue.toLocaleString('en-IN')}/- must be settled with Club Cashier (${settings.treasurerName}) on or before event conclusion.`,
    leftX + 4,
    wordsY + 4.8
  );

  // 7. Special Instructions Box (if any) or Terms
  let nextY = finY + finHeight + 3.5;
  if (program.specialInstructions && program.specialInstructions.trim()) {
    const specHeight = 15;
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(196, 181, 253);
    doc.roundedRect(leftX, nextY, contentWidth - 10, specHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(109, 40, 217);
    doc.text('4. SPECIAL SCOPE / INSTRUCTIONS AGREED:', leftX + 4, nextY + 4.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const splitScope = doc.splitTextToSize(program.specialInstructions, contentWidth - 18);
    doc.text(splitScope, leftX + 4, nextY + 8.5);

    nextY += specHeight + 3.5;
  }

  // 8. Standard Legal Terms & Conditions
  const termsBoxHeight = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, nextY, contentWidth - 10, termsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftX, nextY, contentWidth - 10, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TERMS OF AGREEMENT & COMMUNITY COMPLIANCE CLAUSES', leftX + 4, nextY + 4.5);

  const clauses = [
    '1. Venue & Amenities: The Club grants the Organizer non-exclusive use of the venue, stage/ground, and agreed lighting/power for the scheduled time slot.',
    '2. Timings & Adherence: Program setup and event proceedings must commence and conclude within approved hours. Extensions require prior written consent.',
    '3. Sound & Civic Decorum: Sound amplifiers must adhere to local government noise regulations and maintain village peace during designated quiet hours.',
    '4. Cleanliness & Asset Safety: The Organizer is responsible for preventing damage to club premises and ensuring complete clearance of event waste/debris.',
    '5. Settlement & Cancellation: Dues must be cleared as agreed. Cancellation within 7 days is non-refundable. Postponement permitted under mutual agreement.'
  ];

  let ty = nextY + 10.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  clauses.forEach(clause => {
    doc.text(clause, leftX + 4, ty);
    ty += 5.2;
  });

  // 9. Signatures Section & Official Seal
  const sigY = height - margin - 22;

  // Left Signature: Organizer
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(leftX + 4, sigY, leftX + 56, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(program.organizerName, leftX + 30, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Client / Organizer Signatory', leftX + 30, sigY + 7.5, { align: 'center' });
  doc.text(`Phone: ${program.organizerPhone || 'N/A'}`, leftX + 30, sigY + 11, { align: 'center' });

  // Center Seal Stamp Box
  const sealWidth = 44;
  const sealX = width / 2 - sealWidth / 2;
  doc.setDrawColor(24, 76, 120);
  doc.setLineWidth(0.6);
  doc.roundedRect(sealX, sigY - 7, sealWidth, 18, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(24, 76, 120);
  doc.text('OFFICIAL CLUB CONTRACT', width / 2, sigY - 2, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFIED & CERTIFIED SEAL', width / 2, sigY + 2.5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Contract ID: ${program.id}`, width / 2, sigY + 7, { align: 'center' });

  // Right Signature: General Secretary
  doc.line(width - margin - 56, sigY, width - margin - 4, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.secretaryName, width - margin - 30, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('General Secretary / President', width - margin - 30, sigY + 7.5, { align: 'center' });
  doc.text(settings.clubName, width - margin - 30, sigY + 11, { align: 'center' });

  // 10. Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Computer-generated official agreement issued by Gramin Club Manager • Preserves village records securely • Helpline: ${settings.contactPhone}`,
    width / 2,
    height - margin - 3,
    { align: 'center' }
  );

  return doc;
}

/**
 * Triggers browser download of the Program Agreement PDF.
 */
export function downloadProgramAgreementPdf(
  program: Program,
  settings: ClubSettings,
  receipts: PaymentReceipt[] = []
): void {
  const doc = generateProgramAgreementPdf(program, settings, receipts);
  const cleanId = program.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (program.name || 'Program').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
  doc.save(`Agreement-${cleanId}-${cleanName}.pdf`);
}

/**
 * Creates a File object containing the Program Agreement PDF for sharing via Web Share API.
 */
export function getProgramAgreementPdfFile(
  program: Program,
  settings: ClubSettings,
  receipts: PaymentReceipt[] = []
): File {
  const doc = generateProgramAgreementPdf(program, settings, receipts);
  const pdfBlob = doc.output('blob');
  const cleanId = program.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (program.name || 'Program').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
  return new File([pdfBlob], `Agreement-${cleanId}-${cleanName}.pdf`, { type: 'application/pdf' });
}

/**
 * Generates an official, printable high-resolution Member ID Card PDF.
 * Contains both FRONT & BACK sides on standard printable page / dual ID layout.
 */
export async function generateMemberIdCardPdf(
  member: Member,
  settings: ClubSettings,
  receipts: PaymentReceipt[],
  activeYear: number
): Promise<jsPDF> {
  // A4 Landscape (297mm x 210mm) for high-res dual badge layout (Front & Back side-by-side)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Card dimensions (Standard CR80 scaled for clear print: 120mm x 76mm each)
  const cardW = 125;
  const cardH = 80;
  const gap = 14;
  const totalW = cardW * 2 + gap;
  const startX = (pageWidth - totalW) / 2;
  const startY = 40;

  // Page Header & Print Instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.clubName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Official Membership Identity Card & Badge • Valid for Year ${activeYear}`, pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Cut along the outer border lines. Front and Back sides are aligned for PVC card badge printing or lamination.', pageWidth / 2, 30, { align: 'center' });

  // Filter approved receipts
  const memberReceipts = receipts.filter(
    (r) => r.memberId === member.id && (r.status === 'APPROVED' || !r.status)
  );
  const totalPaidLifetime = memberReceipts.reduce(
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

  // Generate QR Code data URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const statementUrl = `${currentOrigin}/?tab=members&memberId=${encodeURIComponent(
    member.id
  )}&verify=${encodeURIComponent(member.id)}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(statementUrl, {
      width: 250,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR in PDF generator:', err);
  }

  // ==========================================
  // 1. FRONT SIDE CARD (startX, startY)
  // ==========================================
  const frontX = startX;
  const frontY = startY;

  // Background & Border
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(frontX, frontY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(frontX, frontY, cardW, cardH, 4, 4, 'S');

  // Top Ribbon Banner (Navy/Blue)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(frontX, frontY, cardW, 16, 'F');

  // Gold accent line under banner
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(frontX, frontY + 16, cardW, 1.2, 'F');

  // Header Title in Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.clubName.toUpperCase(), frontX + 6, frontY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(253, 230, 138); // amber-200
  doc.text((settings.villageTown || 'Community Club & Welfare').toUpperCase(), frontX + 6, frontY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`ID CARD • VALID ${activeYear}`, frontX + cardW - 6, frontY + 9, { align: 'right' });

  // Photo Frame (Left side)
  const photoW = 26;
  const photoH = 32;
  const photoX = frontX + 8;
  const photoY = frontY + 22;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'S');

  if (member.photoUrl && member.photoUrl.startsWith('data:image')) {
    try {
      doc.addImage(member.photoUrl, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('MEMBER', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 3, { align: 'center' });
  }

  // Member ID pill under photo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(photoX, photoY + photoH + 2, photoW, 6, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(photoX, photoY + photoH + 2, photoW, 6, 1.5, 1.5, 'S');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(member.id, photoX + photoW / 2, photoY + photoH + 6.2, { align: 'center' });

  // Member Info block (Right of photo)
  const infoX = frontX + 39;
  let curY = frontY + 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(member.name, infoX, curY);

  curY += 4.5;
  if (member.guardianName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`S/o: ${member.guardianName}`, infoX, curY);
    curY += 4.5;
  }

  // Category Tag
  const catLabel =
    member.category === 'club_member'
      ? 'CORE CLUB MEMBER'
      : member.category === 'village_resident'
      ? 'VILLAGE RESIDENT'
      : 'REGISTERED MEMBER';

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(infoX, curY - 3, 40, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text(catLabel, infoX + 2, curY + 0.8);

  // Status Badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(infoX + 42, curY - 3, 20, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(member.status.toUpperCase(), infoX + 52, curY + 0.8, { align: 'center' });

  curY += 6.5;

  // Address, Phone, Joined
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Ward: ${member.villageWard || 'Gramin Para'}`, infoX, curY);
  curY += 4;
  doc.text(`Phone: ${member.phone || 'N/A'}`, infoX, curY);
  curY += 4;
  doc.text(`Member Since: ${member.joinedYear}  |  Blood: ${member.bloodGroup || 'O+'}`, infoX, curY);

  // QR Mini on Front
  if (qrDataUrl) {
    const miniQrW = 16;
    const miniQrX = frontX + cardW - miniQrW - 6;
    const miniQrY = frontY + 23;
    try {
      doc.addImage(qrDataUrl, 'PNG', miniQrX, miniQrY, miniQrW, miniQrW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('SCAN VERIFY', miniQrX + miniQrW / 2, miniQrY + miniQrW + 2.5, { align: 'center' });
    } catch (e) {
      console.warn('Mini QR render fallback', e);
    }
  }

  // Front Bottom Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(frontX, frontY + cardH - 8, cardW, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Reg: ${settings.registrationNo || 'WB-ACT-1961'}`, frontX + 6, frontY + cardH - 3);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text('AUTHORIZED PASS • OFFICIAL BADGE', frontX + cardW - 6, frontY + cardH - 3, { align: 'right' });

  // ==========================================
  // 2. BACK SIDE CARD (startX + cardW + gap, startY)
  // ==========================================
  const backX = frontX + cardW + gap;
  const backY = startY;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(backX, backY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(backX, backY, cardW, cardH, 4, 4, 'S');

  // Back Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(backX, backY, cardW, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ANNUAL CONTRIBUTION & VERIFICATION', backX + 6, backY + 7);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(member.id, backX + cardW - 6, backY + 7, { align: 'right' });

  // Status Box
  const statusBoxW = 75;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(backX + 6, backY + 14, statusBoxW, 14, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(backX + 6, backY + 14, statusBoxW, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text(`${activeYear} Subscription Status:`, backX + 9, backY + 19);

  if (targetFee === 0) {
    doc.setTextColor(126, 34, 206);
    doc.text('VOLUNTARY MEMBER', backX + 9, backY + 24);
  } else if (isPaidCurrentYear) {
    doc.setTextColor(21, 128, 61);
    doc.text(`PAID FULLY (${settings.currency}${currentYearPaid})`, backX + 9, backY + 24);
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(`DUE: ${settings.currency}${currentYearDue} / ${settings.currency}${targetFee}`, backX + 9, backY + 24);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Lifetime Total Paid: ${settings.currency}${totalPaidLifetime.toLocaleString('en-IN')} (${memberReceipts.length} receipts)`, backX + 9, backY + 26);

  // Big Statement QR Code on Back Right
  if (qrDataUrl) {
    const bigQrW = 28;
    const bigQrX = backX + cardW - bigQrW - 8;
    const bigQrY = backY + 14;
    try {
      doc.addImage(qrDataUrl, 'PNG', bigQrX, bigQrY, bigQrW, bigQrW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42);
      doc.text('LIVE STATEMENT QR', bigQrX + bigQrW / 2, bigQrY + bigQrW + 3, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan with Any Smartphone', bigQrX + bigQrW / 2, bigQrY + bigQrW + 5.5, { align: 'center' });
    } catch (e) {
      console.warn('Big QR render error', e);
    }
  }

  // Terms and conditions
  let termsY = backY + 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Card Terms & Conditions:', backX + 6, termsY);

  termsY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`1. This identity badge is non-transferable and remains property of ${settings.clubName}.`, backX + 6, termsY);
  termsY += 3;
  doc.text('2. Scan the live statement QR to audit verified annual contribution history.', backX + 6, termsY);
  termsY += 3;
  doc.text(`3. If found, please return to: ${settings.villageTown || 'Club Office'} (${settings.contactPhone}).`, backX + 6, termsY);

  // Signatures on Back
  const sigY = backY + cardH - 18;
  const sigLineW = 26;

  // Secretary Sig
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(backX + 10, sigY, backX + 10 + sigLineW, sigY);
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.secretaryName || 'Secretary', backX + 10 + sigLineW / 2, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GENERAL SECRETARY', backX + 10 + sigLineW / 2, sigY + 6.5, { align: 'center' });

  // Treasurer Sig
  doc.line(backX + 45, sigY, backX + 45 + sigLineW, sigY);
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.treasurerName || 'Treasurer', backX + 45 + sigLineW / 2, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TREASURER', backX + 45 + sigLineW / 2, sigY + 6.5, { align: 'center' });

  // Back Bottom Contact Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(backX, backY + cardH - 6.5, cardW, 6.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Helpline: ${settings.contactPhone || '+91 98301 23456'}`, backX + 6, backY + cardH - 2.5);
  doc.text(`Email: ${settings.contactEmail || 'club@gramin.org'}`, backX + cardW - 6, backY + cardH - 2.5, { align: 'right' });

  // Page Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Gramin Club Management System • Secure Identity Badging • Print or save as PDF for PVC card printer', pageWidth / 2, pageHeight - 12, { align: 'center' });

  return doc;
}

/**
 * Triggers browser download of Member ID Card PDF.
 */
export async function downloadMemberIdCardPdf(
  member: Member,
  settings: ClubSettings,
  receipts: PaymentReceipt[],
  activeYear: number
): Promise<void> {
  const doc = await generateMemberIdCardPdf(member, settings, receipts, activeYear);
  const cleanId = member.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (member.name || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
  doc.save(`Member-ID-Card-${cleanId}-${cleanName}.pdf`);
}

/**
 * Creates a File object containing the Member ID Card PDF for native Web Share API.
 */
export async function getMemberIdCardPdfFile(
  member: Member,
  settings: ClubSettings,
  receipts: PaymentReceipt[],
  activeYear: number
): Promise<File> {
  const doc = await generateMemberIdCardPdf(member, settings, receipts, activeYear);
  const pdfBlob = doc.output('blob');
  const cleanId = member.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (member.name || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
  return new File([pdfBlob], `Member-ID-Card-${cleanId}-${cleanName}.pdf`, { type: 'application/pdf' });
}


