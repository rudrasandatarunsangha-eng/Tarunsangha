import React, { useState } from 'react';
import { 
  X, 
  Download, 
  MessageCircle, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  Calendar, 
  MapPin, 
  Phone, 
  ExternalLink,
  ShieldCheck, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { Program, ClubSettings, PaymentReceipt } from '../types/club.ts';
import { downloadProgramAgreementPdf, getProgramAgreementPdfFile } from '../utils/pdfGenerator.ts';
import { 
  formatProgramAgreementWhatsAppMessage, 
  createWhatsAppChatUrl, 
  cleanPhoneNumber 
} from '../utils/whatsapp.ts';

interface ProgramAgreementModalProps {
  program: Program | null;
  settings: ClubSettings;
  receipts: PaymentReceipt[];
  onClose: () => void;
}

export const ProgramAgreementModal: React.FC<ProgramAgreementModalProps> = ({
  program,
  settings,
  receipts,
  onClose,
}) => {
  const [recipientPhone, setRecipientPhone] = useState(program?.organizerPhone || '');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');
  const [activePreviewTab, setActivePreviewTab] = useState<'message' | 'details'>('message');

  if (!program) return null;

  // Payments & Balance
  const programPayments = receipts.filter(r => r.programId === program.id && r.status === 'APPROVED');
  const totalApprovedReceived = programPayments.reduce((sum, r) => {
    return r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount;
  }, 0);
  const remainingBalanceDue = Math.max(0, program.totalContractAmount - totalApprovedReceived);

  // Formatted WhatsApp message with current recipient phone
  const whatsappMessage = formatProgramAgreementWhatsAppMessage(program, settings, receipts);
  const whatsappUrl = createWhatsAppChatUrl(recipientPhone || program.organizerPhone || '', whatsappMessage);

  const handleDownloadPdf = () => {
    try {
      downloadProgramAgreementPdf(program, settings, receipts);
      setShareFeedback('Agreement PDF downloaded successfully!');
      setTimeout(() => setShareFeedback(''), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setShareFeedback('Failed to generate PDF. Please try again.');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      setShareFeedback('Agreement summary copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback('');
      }, 3000);
    } catch {
      // Fallback
      setShareFeedback('Could not copy to clipboard automatically.');
    }
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    setShareFeedback('');

    try {
      const pdfFile = getProgramAgreementPdfFile(program, settings, receipts);

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Program Agreement - ${program.name}`,
          text: `Official Program Agreement & Contract for ${program.name} (${program.id}) from ${settings.clubName}.`,
        });
        setShareFeedback('Agreement shared successfully!');
      } else if (navigator.share) {
        await navigator.share({
          title: `Program Agreement - ${program.name}`,
          text: whatsappMessage,
        });
        setShareFeedback('Agreement text shared!');
      } else {
        // Fallback to opening WhatsApp directly
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share error:', err);
        // Fallback to WhatsApp
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg">Program Agreement & Contract</h3>
                <span className="font-mono text-xs bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700">
                  {program.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Download official PDF document & send booking contract to client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert (if any) */}
        {shareFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center space-x-2 text-xs font-semibold text-emerald-800 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* Program Overview Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                  {program.type}
                </span>
                <h4 className="text-base font-bold text-slate-900">{program.name}</h4>
              </div>
              <span className={`self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${
                program.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                program.status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {program.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs text-slate-600">
              <div className="space-y-1.5">
                <p className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <span>Date: <strong>{program.programDate}</strong> ({program.startTime} - {program.endTime})</span>
                </p>
                <p className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Venue: <strong>{program.venue}</strong></span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center">
                  <span className="font-semibold text-slate-500 mr-1.5">Client:</span>
                  <strong>{program.organizerName}</strong>
                  {program.organizerCompany && <span className="text-slate-400 ml-1">({program.organizerCompany})</span>}
                </p>
                <p className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <span>Phone: {recipientPhone || 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Agreed</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {settings.currency} {program.totalContractAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Received</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-700">
                  {settings.currency} {totalApprovedReceived.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-rose-200">
                <span className="text-[10px] text-rose-700 font-semibold uppercase block">Balance Due</span>
                <span className="text-xs sm:text-sm font-bold text-rose-700">
                  {settings.currency} {remainingBalanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Configuration / Recipient Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Client WhatsApp / Mobile Number for Dispatch
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +919876543210"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              {recipientPhone && cleanPhoneNumber(recipientPhone) !== cleanPhoneNumber(program.organizerPhone || '') && (
                <button
                  type="button"
                  onClick={() => setRecipientPhone(program.organizerPhone || '')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline flex-shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              The contract link and message will be addressed to this number on WhatsApp.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Download Agreement PDF</span>
            </button>

            {/* WhatsApp Send Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </a>

            {/* Share via Web Share API */}
            <button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSharing ? 'Sharing...' : 'Share PDF / Message'}</span>
            </button>

            {/* Copy Message Text */}
            <button
              onClick={handleCopyText}
              className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Agreement Text'}</span>
            </button>
          </div>

          {/* Preview Tabs: WhatsApp Message vs Details */}
          <div className="pt-2">
            <div className="flex border-b border-slate-200 space-x-4 mb-3">
              <button
                type="button"
                onClick={() => setActivePreviewTab('message')}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors ${
                  activePreviewTab === 'message'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                WhatsApp Message Preview
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('details')}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors ${
                  activePreviewTab === 'details'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Standard Contract Clauses
              </button>
            </div>

            {activePreviewTab === 'message' ? (
              <div className="bg-emerald-950/5 border border-emerald-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {whatsappMessage}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2 max-h-48 overflow-y-auto">
                <p className="font-semibold text-slate-800">Clauses included in official PDF document:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li><strong>Venue Access:</strong> Grants non-exclusive access to stage/premises & basic amenities.</li>
                  <li><strong>Time Adherence:</strong> Setup and proceedings strictly within designated time slots.</li>
                  <li><strong>Civic Peace & Sound:</strong> Amplifiers must adhere to government sound limits & quiet hours.</li>
                  <li><strong>Premises Protection:</strong> Organizer is responsible for waste cleanup & preventing property damage.</li>
                  <li><strong>Balance Settlement:</strong> Outstanding dues to be settled on or before event conclusion.</li>
                </ol>
                {program.specialInstructions && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-indigo-800">Special Scope:</span>
                    <p className="italic text-slate-700 mt-0.5">{program.specialInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Official Contract Guarantee:</strong> The generated PDF is an authenticated document featuring official club seals, signature blocks for both the client and General Secretary (<strong>{settings.secretaryName}</strong>), and complete payment terms.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Preserves village records securely • {settings.clubName}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
