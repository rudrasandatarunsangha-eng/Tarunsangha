import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CreditCard, 
  MapPin, 
  Phone, 
  Calendar, 
  QrCode as QrCodeIcon, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle, 
  Upload, 
  Camera, 
  FileText,
  User,
  Share2,
  RefreshCw,
  Eye,
  Award,
  MessageCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { Member, ClubSettings, PaymentReceipt } from '../types/club.ts';
import { DEFAULT_CLUB_LOGO } from '../utils/clubLogo.ts';
import { downloadMemberIdCardPdf, getMemberIdCardPdfFile } from '../utils/pdfGenerator.ts';
import { createMemberIdCardWhatsAppUrl, formatMemberIdCardWhatsAppMessage, createWhatsAppChatUrl } from '../utils/whatsapp.ts';

interface MemberIdCardProps {
  member: Member;
  settings: ClubSettings;
  receipts: PaymentReceipt[];
  activeYear: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMemberPhoto?: (memberId: string, photoUrl: string) => Promise<void>;
  onViewStatement?: (member: Member) => void;
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({
  member,
  settings,
  receipts,
  activeYear,
  isOpen,
  onClose,
  onUpdateMemberPhoto,
  onViewStatement,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isFrontSide, setIsFrontSide] = useState<boolean>(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string>(member.photoUrl || '');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter approved receipts for member
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
      : member.category === 'village_resident'
      ? settings.defaultAnnualVillageFee
      : 0;

  const currentYearPaid = memberReceipts
    .filter((r) => r.financialYear === activeYear)
    .reduce((sum, r) => sum + r.amount, 0);

  const currentYearDue = Math.max(0, targetFee - currentYearPaid);
  const isPaidCurrentYear = targetFee > 0 ? currentYearDue === 0 : true;

  // Construct verification / statement URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const statementUrl = `${currentOrigin}/?tab=members&memberId=${encodeURIComponent(
    member.id
  )}&verify=${encodeURIComponent(member.id)}`;

  // Generate QR code for member's contribution statement & identity verification
  useEffect(() => {
    async function genQr() {
      try {
        const qrContent = JSON.stringify({
          app: settings.clubName,
          id: member.id,
          name: member.name,
          category: member.category,
          joined: member.joinedYear,
          status: member.status,
          statementUrl,
        });

        const url = await QRCode.toDataURL(statementUrl || qrContent, {
          width: 280,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    }
    genQr();
  }, [member.id, member.name, statementUrl, settings.clubName]);

  useEffect(() => {
    setPhotoPreview(member.photoUrl || '');
  }, [member.photoUrl]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file is too large. Please upload an image under 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      // Resize to compact avatar
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoPreview(compressed);
          if (onUpdateMemberPhoto) {
            try {
              await onUpdateMemberPhoto(member.id, compressed);
            } catch (err) {
              console.error('Failed to persist photo:', err);
            }
          }
        }
        setIsUploadingPhoto(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const isBn = false;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadMemberIdCardPdf(member, settings, receipts, activeYear);
      setShareSuccess('PDF Downloaded!');
      setTimeout(() => setShareSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to download ID card PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const url = createMemberIdCardWhatsAppUrl(member, settings, activeYear, receipts);
    window.open(url, '_blank');
  };

  const handleShareFile = async () => {
    try {
      setIsDownloadingPdf(true);
      const pdfFile = await getMemberIdCardPdfFile(member, settings, receipts, activeYear);
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${member.name} - Member ID Card`,
          text: `Official Member ID Card for ${member.name} (${member.id}) - ${settings.clubName}`,
          files: [pdfFile],
        });
        setShareSuccess('ID Card shared successfully!');
      } else {
        // Fallback: download the file and open WhatsApp with message
        await downloadMemberIdCardPdf(member, settings, receipts, activeYear);
        const url = createMemberIdCardWhatsAppUrl(member, settings, activeYear, receipts);
        window.open(url, '_blank');
        setShareSuccess('PDF saved! Opening WhatsApp...');
      }
      setTimeout(() => setShareSuccess(''), 3500);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        // Fallback to direct download
        await downloadMemberIdCardPdf(member, settings, receipts, activeYear);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(statementUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Category Badge Label & Colors
  const categoryConfig: Record<string, { label: string; badgeBg: string; ribbonBg: string }> = {
    club_member: {
      label: 'Core Club Member',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      ribbonBg: 'from-emerald-600 to-teal-700',
    },
    village_resident: {
      label: 'Village Resident',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      ribbonBg: 'from-indigo-600 to-blue-700',
    },
    patron: {
      label: 'Honorary Patron',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      ribbonBg: 'from-amber-600 to-orange-700',
    },
    senior: {
      label: 'Senior Citizen',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
      ribbonBg: 'from-purple-600 to-violet-700',
    },
  };

  const categoryMeta = categoryConfig[member.category] || {
    label: 'Registered Member',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    ribbonBg: 'from-slate-700 to-slate-900',
  };

  const logoSrc = settings.logoUrl || DEFAULT_CLUB_LOGO;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-id-card-sheet, #printable-id-card-sheet * {
            visibility: visible;
          }
          #printable-id-card-sheet {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            padding: 20px;
            display: flex !important;
            flex-direction: row !important;
            gap: 20px !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <CreditCard className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight">Official Member ID Card</h3>
                <span className="text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  CR80 Card Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Printable, verified identity badge with real-time contribution statement QR code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFrontSide(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isFrontSide
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => setIsFrontSide(false)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isFrontSide
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Back Side
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">|</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              title="Upload Member Photo"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shareSuccess && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>{shareSuccess}</span>
              </span>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Download high-resolution printable ID card PDF (Front & Back)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
              title="Send Member ID Card details & verification link to member's WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={handleShareFile}
              disabled={isDownloadingPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              title="Share PDF file to external apps (WhatsApp, Drive, Email, etc.)"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Share File</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              title="Copy public verification statement link"
            >
              {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            {onViewStatement && (
              <button
                onClick={() => onViewStatement(member)}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Statement</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95"
              title="Print standard double-sided layout"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>

        {/* Card Canvas Container */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 flex flex-col items-center justify-center">
          {/* Printable Sheet (Visible in normal view and print) */}
          <div
            id="printable-id-card-sheet"
            className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-3xl"
          >
            {/* ============================================================ */}
            {/* FRONT SIDE CARD (Standard ID-1 / CR-80 Aspect Ratio: 85.6mm x 53.98mm) */}
            {/* ============================================================ */}
            <div
              className={`w-full max-w-[390px] h-[245px] sm:h-[248px] rounded-2xl shadow-xl overflow-hidden border border-slate-300 relative flex flex-col justify-between bg-white select-none transition-all ${
                !isFrontSide ? 'hidden lg:flex opacity-90' : 'ring-4 ring-emerald-500/20'
              }`}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #eff6ff 100%)',
              }}
            >
              {/* Decorative Header Banner */}
              <div
                className={`bg-gradient-to-r ${categoryMeta.ribbonBg} text-white px-3.5 py-2 relative flex items-center justify-between border-b-2 border-amber-400 shadow-sm`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

                <div className="flex items-center space-x-2 relative z-10">
                  <img
                    src={logoSrc}
                    alt="Logo"
                    className="w-8 h-8 rounded-full bg-white p-0.5 object-contain shadow-sm border border-amber-300"
                  />
                  <div className="leading-tight">
                    <h4 className="font-extrabold text-xs tracking-wide uppercase line-clamp-1">
                      {settings.clubName}
                    </h4>
                    <p className="text-[9px] text-amber-200 font-medium tracking-wider uppercase">
                      {settings.villageTown || 'Community Club & Welfare'}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 text-right">
                  <span className="text-[8px] uppercase tracking-widest font-bold bg-black/20 text-white px-2 py-0.5 rounded-full border border-white/20">
                    ID CARD
                  </span>
                  <div className="text-[8px] font-mono text-emerald-200 mt-0.5 font-bold">
                    VALID {activeYear}
                  </div>
                </div>
              </div>

              {/* Card Body: Member Photo, Details & Micro QR */}
              <div className="px-3.5 py-2.5 flex-1 flex items-center justify-between gap-3">
                {/* Left: Photo Frame */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-[82px] h-[98px] rounded-xl overflow-hidden border-2 border-slate-800 shadow-md bg-slate-100 relative flex items-center justify-center group">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 p-2 text-center">
                        <User className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="text-[8px] font-bold text-slate-400 leading-tight">
                          NO PHOTO
                        </span>
                      </div>
                    )}
                    {/* Hover to quick upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="no-print absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer"
                      title="Upload photo"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {/* Blood Group or ID */}
                  <div className="mt-1 flex items-center space-x-1">
                    <span className="text-[9px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      {member.id}
                    </span>
                    {member.bloodGroup && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {member.bloodGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center / Right: Information Block */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                      {member.name}
                    </h3>

                    {member.guardianName && (
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        <span className="text-slate-400">S/o:</span> {member.guardianName}
                      </p>
                    )}

                    {/* Member Category Badge */}
                    <div className="mt-1 flex items-center space-x-1.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${categoryMeta.badgeBg}`}
                      >
                        {categoryMeta.label}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {member.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="mt-2 space-y-1 text-[10px] text-slate-700">
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-3 h-3 text-rose-500 mr-1 flex-shrink-0" />
                        <span className="truncate font-medium">{member.villageWard || 'Gramin Para'}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400 mr-1 flex-shrink-0" />
                        <span className="font-mono">{member.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-3 h-3 text-indigo-500 mr-1 flex-shrink-0" />
                        <span>Member Since: <strong>{member.joinedYear}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Micro Footer on Front */}
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400">
                    <span className="truncate">Reg: {settings.registrationNo || 'WB-ACT-1961'}</span>
                    <span className="font-semibold text-slate-500">Authorized Badge</span>
                  </div>
                </div>

                {/* Right: Small QR Code on Front for Instant Scan */}
                <div className="flex flex-col items-center justify-center flex-shrink-0 pl-1 border-l border-slate-200">
                  <div className="w-[52px] h-[52px] bg-white p-0.5 rounded-lg border border-slate-300 shadow-sm flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCodeIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                    SCAN VERIFY
                  </span>
                </div>
              </div>

              {/* Bottom Decorative Bar with Hologram Seal */}
              <div className="bg-slate-900 text-white px-3 py-1 flex items-center justify-between text-[9px] relative overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span className="font-semibold tracking-wide">
                    {settings.clubName} • Official Pass
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[8px] text-amber-300 font-bold">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>SECURE IDENTITY</span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* BACK SIDE CARD (Terms, Signatures, Large Statement QR Code) */}
            {/* ============================================================ */}
            <div
              className={`w-full max-w-[390px] h-[245px] sm:h-[248px] rounded-2xl shadow-xl overflow-hidden border border-slate-300 relative flex flex-col justify-between bg-white select-none transition-all ${
                isFrontSide ? 'hidden lg:flex opacity-90' : 'ring-4 ring-emerald-500/20'
              }`}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
              }}
            >
              {/* Top Banner on Back */}
              <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center space-x-1.5">
                  <QrCodeIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ANNUAL CONTRIBUTION & VERIFICATION</span>
                </div>
                <span className="text-[9px] font-mono text-slate-300">{member.id}</span>
              </div>

              {/* Back Content */}
              <div className="p-3 flex-1 flex items-center justify-between gap-3 text-[9px]">
                {/* Left: Statement & Terms */}
                <div className="flex-1 flex flex-col justify-between h-full space-y-1">
                  {/* Contribution Statement Box */}
                  <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-800 mb-0.5">
                      <span>{activeYear} Subscription Status:</span>
                      {targetFee === 0 ? (
                        <span className="text-purple-700">Voluntary</span>
                      ) : isPaidCurrentYear ? (
                        <span className="text-emerald-700 font-extrabold flex items-center">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          PAID
                        </span>
                      ) : (
                        <span className="text-rose-600 font-extrabold">
                          DUE ({settings.currency}{currentYearDue})
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] text-slate-600">
                      Lifetime Contributed: <strong className="text-emerald-800">{settings.currency}{totalPaidLifetime.toLocaleString()}</strong> ({memberReceipts.length} receipts issued)
                    </div>
                  </div>

                  {/* Emergency & Terms */}
                  <div className="space-y-0.5 text-slate-600 text-[8px] leading-tight">
                    <p className="font-semibold text-slate-800">Card Terms & Conditions:</p>
                    <p>1. This card is non-transferable and remains property of {settings.clubName}.</p>
                    <p>2. Scan the QR code to verify live membership status & all payment receipts.</p>
                    <p>3. If found, please return to: {settings.villageTown || 'Club Office'}.</p>
                  </div>

                  {/* Signatures */}
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-center">
                      <div className="h-5 flex items-end justify-center font-serif italic text-[10px] text-slate-600 font-bold border-b border-slate-400 px-3">
                        {settings.secretaryName || 'Secretary'}
                      </div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        General Secretary
                      </span>
                    </div>

                    <div className="text-center">
                      <div className="h-5 flex items-end justify-center font-serif italic text-[10px] text-slate-600 font-bold border-b border-slate-400 px-3">
                        {settings.treasurerName || 'Treasurer'}
                      </div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        Treasurer
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Large Statement QR Code */}
                <div className="flex flex-col items-center justify-center flex-shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="w-[84px] h-[84px] flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCodeIcon className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <span className="text-[8px] font-black text-slate-800 uppercase tracking-tight mt-1">
                    LIVE STATEMENT
                  </span>
                  <span className="text-[7px] text-slate-400 font-mono">
                    Scan With Any Phone
                  </span>
                </div>
              </div>

              {/* Bottom Footer on Back */}
              <div className="bg-slate-100 border-t border-slate-200 px-3 py-1 flex items-center justify-between text-[8px] text-slate-500">
                <span>Helpline: {settings.contactPhone || '+91 98301 23456'}</span>
                <span>Email: {settings.contactEmail || 'club@gramin.org'}</span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="mt-6 text-center text-xs text-slate-500 max-w-md no-print">
            <p>
              💡 <strong>Pro Tip:</strong> Click <strong>"Print Both Sides"</strong> to print directly onto standard card stock or PVC plastic badge cards. Both front and back cards fit side-by-side.
            </p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 no-print">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Member Record: <strong>{member.name}</strong> ({member.id})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center space-x-1.5"
              title="Send to Member WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send to WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
              title="Download print-ready PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
