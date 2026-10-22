import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  MessageCircle, 
  CheckCircle, 
  Share2, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { PaymentReceipt, ClubSettings } from '../types/club.ts';
import { createWhatsAppChatUrl, formatReceiptWhatsAppMessage } from '../utils/whatsapp.ts';
import { downloadReceiptPdf } from '../utils/pdfGenerator.ts';

interface ReceiptViewModalProps {
  receipt: PaymentReceipt | null;
  settings: ClubSettings;
  onClose: () => void;
}

export const ReceiptViewModal: React.FC<ReceiptViewModalProps> = ({
  receipt,
  settings,
  onClose,
}) => {
  const isBn = false;
  const [isDownloading, setIsDownloading] = useState(false);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    try {
      downloadReceiptPdf(receipt, settings);
    } catch (e) {
      console.error('Receipt PDF export error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const whatsappMessage = formatReceiptWhatsAppMessage(receipt, settings);
  const whatsappUrl = createWhatsAppChatUrl(receipt.phone, whatsappMessage);

  const categoryLabel = 
    receipt.memberCategory === 'village_resident' ? (isBn ? 'গ্রামবাসী' : 'Village Resident') :
    receipt.memberCategory === 'club_member' ? (isBn ? 'ক্লাব সদস্য' : 'Core Club Member') :
    receipt.memberCategory === 'patron' ? (isBn ? 'সম্মানিত পৃষ্ঠপোষক' : 'Honorary Patron') : (isBn ? 'প্রবীণ সদস্য' : 'Senior Member');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base sm:text-lg">
              {isBn ? 'আদায়ের রশিদ তৈরি হয়েছে' : 'Payment Receipt Generated'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 sm:p-8 bg-amber-50/20 print:p-4 print:bg-white font-bengali printable-document" id="printable-receipt">
          {/* Decorative Receipt Border */}
          <div className="border-2 border-slate-800 rounded-xl p-5 sm:p-6 bg-white shadow-sm relative">
            {/* Watermark / Seal Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Watermark"
                  referrerPolicy="no-referrer"
                  className="w-56 h-56 object-contain grayscale"
                />
              ) : (
                <div className="w-64 h-64 rounded-full border-8 border-slate-900 flex items-center justify-center">
                  <span className="text-4xl font-black">SEAL</span>
                </div>
              )}
            </div>

            {/* Header with Logo */}
            <div className="pb-4 border-b-2 border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.clubName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-contain border border-slate-300 p-1 bg-white shadow-sm flex-shrink-0"
                />
              )}
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {settings.clubName}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                  {settings.villageTown} • {isBn ? 'রেজিস্ট্রেশন নং' : 'Reg. No'}: {settings.registrationNo}
                </p>
                <p className="text-xs text-slate-500 italic mt-0.5">
                  {settings.tagline} • {isBn ? 'ফোন' : 'Phone'}: {settings.contactPhone}
                </p>
              </div>
            </div>

            <div className="text-center -mt-3.5 mb-2">
              <div className="inline-block px-5 py-1 bg-slate-900 text-white rounded font-bold text-xs tracking-wider uppercase shadow-sm">
                {isBn ? 'অফিসিয়াল মানি রশিদ' : 'Official Money Receipt'}
              </div>
            </div>

            {/* Meta Row: Receipt Number & Date */}
            <div className="flex items-center justify-between py-3 border-b border-slate-200 text-sm">
              <div>
                <span className="font-semibold text-slate-500 text-xs">
                  {isBn ? 'রশিদ নম্বর:' : 'RECEIPT NO:'}
                </span>
                <span className="ml-1.5 font-mono font-bold text-red-700">{receipt.receiptNo}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-xs">
                  {isBn ? 'তারিখ:' : 'DATE:'}
                </span>
                <span className="ml-1.5 font-medium text-slate-800">{receipt.date}</span>
              </div>
            </div>

            {/* Receipt Body Details */}
            <div className="py-4 space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500 text-xs font-semibold">
                  {isBn ? 'ধন্যবাদ সহ গৃহীত হইল:' : 'RECEIVED WITH THANKS FROM:'}
                </span>
                <span className="font-bold text-slate-900 sm:text-right">
                  {receipt.memberName} <span className="text-xs font-normal text-slate-500">({receipt.memberId || (isBn ? 'আইডি: সরাসরি' : 'ID: Direct')})</span>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500 text-xs font-semibold">
                  {isBn ? 'সদস্যের ধরন ও পাড়া:' : 'MEMBER CATEGORY & WARD:'}
                </span>
                <span className="font-medium text-slate-800 sm:text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 font-semibold mr-1.5">
                    {categoryLabel}
                  </span>
                  {receipt.villageWard || (isBn ? 'গ্রামীন পাড়া' : 'Gramin Para')}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500 text-xs font-semibold">
                  {isBn ? 'অর্থের খাত / উদ্দেশ্য:' : 'ACCOUNT HEAD / PURPOSE:'}
                </span>
                <span className="font-bold text-indigo-900 sm:text-right">
                  {receipt.purpose} (FY {receipt.financialYear})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500 text-xs font-semibold">
                  {isBn ? 'পরিশোধের মাধ্যম:' : 'PAYMENT MODE:'}
                </span>
                <span className="font-medium text-slate-800 sm:text-right">
                  {receipt.paymentMode}
                  {receipt.transactionRef && (
                    <span className="text-xs text-slate-500 font-mono ml-1.5">
                      (Ref: {receipt.transactionRef})
                    </span>
                  )}
                </span>
              </div>

              {receipt.remarks && (
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 text-xs font-semibold">
                    {isBn ? 'মন্তব্য:' : 'REMARKS / NOTES:'}
                  </span>
                  <span className="text-xs text-slate-600 italic sm:text-right">{receipt.remarks}</span>
                </div>
              )}

              {/* Amount Highlight Box */}
              <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 block">
                    {isBn ? 'মোট প্রাপ্ত টাকার পরিমাণ' : 'TOTAL AMOUNT RECEIVED'}
                  </span>
                  <span className="text-xs text-emerald-700 italic">
                    {isBn ? 'ক্লাবের তহবিলে যথাযথভাবে জমা গৃহীত হইল' : 'Confirmed and credited to club accounts'}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  {settings.currency} {receipt.amount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="h-8 flex items-end justify-center font-bold text-slate-700 text-xs">
                  {receipt.collectorName || settings.treasurerName}
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="text-xs font-bold text-slate-800">
                    {receipt.collectorName || settings.treasurerName}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {isBn ? 'আদায়কারী / কোষাধ্যক্ষ' : 'Authorized Cashier / Collector'}
                  </p>
                </div>
              </div>

              <div>
                <div className="h-8 flex items-end justify-center font-bold text-slate-700 text-xs">
                  {settings.secretaryName}
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="text-xs font-bold text-slate-800">{settings.secretaryName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {isBn ? 'সাধারণ সম্পাদক / সভাপতি' : 'General Secretary / President'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer stamp */}
            <div className="mt-5 text-center text-[10px] text-slate-400 italic">
              {isBn 
                ? 'গ্রামীন ক্লাব ম্যানেজার ডিজিটাল সিস্টেম কর্তৃক অনুমোদিত রসিদ • ডাটাবেজে সংরক্ষিত'
                : 'Digital receipt generated via Gramin Club Manager • Stored in persistent club database'}
            </div>
          </div>
        </div>

        {/* WhatsApp & Export Notification Box */}
        <div className="bg-emerald-50/60 border-t border-b border-emerald-100 px-6 py-3 text-xs text-emerald-950 flex items-start space-x-2.5 print:hidden">
          <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {isBn ? 'হোয়াটসঅ্যাপ মেসেজ শেয়ার:' : 'WhatsApp Click-to-Chat Instructions:'}
            </span>
            <p className="text-emerald-800 text-[11px] mt-0.5">
              {isBn 
                ? `${receipt.phone || 'সদস্যের'} নম্বরে প্রাক-পূরণকৃত রসিদ পাঠাতে নিচের বাটনে ট্যাপ করুন।`
                : `Clicking "Share on WhatsApp" will open WhatsApp with this official receipt pre-filled for ${receipt.phone || 'the member'}. You must press Send in WhatsApp to deliver it.`}
            </p>
          </div>
        </div>

        {/* Action Buttons Bar (Hidden in Print) */}
        <div className="p-4 sm:p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? (isBn ? 'ডাউনলোড হচ্ছে...' : 'Saving...') : (isBn ? 'পিডিএফ ডাউনলোড' : 'Download PDF')}</span>
            </button>

            {/* Print Receipt */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{isBn ? 'রশিদ প্রিন্ট' : 'Print Receipt'}</span>
            </button>

            {/* WhatsApp Share */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isBn ? 'হোয়াটসঅ্যাপে পাঠান' : 'Open in WhatsApp'}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
