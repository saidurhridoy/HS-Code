import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  CornerDownLeft,
  ExternalLink,
  FileImage,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  ExtractedSourceMetadata,
  LlmConfig,
  PreferentialOrigin,
  SourceInputMode,
} from '@shared/types';

export interface SamplePresetItem {
  label: string;
  query: string;
}

interface MultimodalSourceInputProps {
  lang: AppLanguage;
  mode: SourceInputMode;
  onChangeMode: (mode: SourceInputMode) => void;
  queryInput: string;
  onChangeQueryInput: (q: string) => void;
  onSubmitText: () => void;
  onSubmitPhoto: (params: {
    imageBase64: string;
    imageMimeType: string;
    imageFileName: string;
    userHint?: string;
  }) => void;
  onSubmitLink: (params: { url: string; userHint?: string }) => void;
  loading: boolean;
  error: string | null;
  samplePresets: SamplePresetItem[];
  onSelectPreset: (index: number) => void;
  sourceMeta: ExtractedSourceMetadata | null;
  onClearSourceMeta: () => void;
  activePreferentialOrigin: PreferentialOrigin;
  onApplyPreferentialOrigin: (origin: PreferentialOrigin) => void;
  llmConfig: LlmConfig;
  onOpenAiModal: () => void;
}

const VISUAL_CATEGORY_HINTS: { labelEn: string; labelBn: string; queryHint: string }[] = [
  {
    labelEn: 'Industrial Machinery',
    labelBn: 'ইন্ডাস্ট্রিয়াল মেশিনারি',
    queryHint: 'industrial factory production machinery sewing pump machine',
  },
  {
    labelEn: 'Laptop / Computer IT',
    labelBn: 'ল্যাপটপ / কম্পিউটার',
    queryHint: 'portable laptop computer notebook data processing machine',
  },
  {
    labelEn: 'Smartphone / Electronics',
    labelBn: 'স্মার্টফোন / ইলেকট্রনিক্স',
    queryHint: 'cellular smartphone wireless electronic device',
  },
  {
    labelEn: 'Cotton Garment / Fabric',
    labelBn: 'সুতি পোশাক / ফেব্রিক',
    queryHint: '100% cotton knitted t-shirt garment textile fabric',
  },
  {
    labelEn: 'Solar Panel / Battery',
    labelBn: 'সোলার প্যানেল / ব্যাটারি',
    queryHint: 'monocrystalline solar photovoltaic panel module 550W',
  },
  {
    labelEn: 'Vehicle / Auto Parts',
    labelBn: 'গাড়ি / অটো পার্টস',
    queryHint: 'passenger motor car hybrid sedan 1500cc',
  },
  {
    labelEn: 'Milk Powder / Food',
    labelBn: 'গুঁড়া দুধ / খাদ্যপণ্য',
    queryHint: 'full cream milk powder 25kg bulk industrial bag',
  },
  {
    labelEn: 'Cosmetics / Chemical',
    labelBn: 'কসমেটিকস / কেমিক্যাল',
    queryHint: 'skin care cosmetic lotion preparation retail bottle',
  },
];

const SAMPLE_LINKS: {
  label: string;
  marketplace: string;
  url: string;
  hint: string;
}[] = [
  {
    label: 'Alibaba: 550W Solar PV Panel',
    marketplace: 'Alibaba (China · APTA)',
    url: 'https://www.alibaba.com/product-detail/550W-Monocrystalline-Solar-PV-Panel-Photovoltaic-Module_1600984215.html',
    hint: '',
  },
  {
    label: 'IndiaMART: Industrial Water Pump',
    marketplace: 'IndiaMART (India · SAFTA)',
    url: 'https://www.indiamart.com/proddetail/industrial-centrifugal-water-pump-5hp-factory-285419023.html',
    hint: '',
  },
  {
    label: 'Amazon: MacBook Air M3 Laptop',
    marketplace: 'Amazon (Global)',
    url: 'https://www.amazon.com/Apple-2024-MacBook-13-inch-Laptop-M3-chip-16GB-512GB/dp/B0CX23V2ZK',
    hint: '',
  },
  {
    label: 'Made-in-China: Cotton Knitted T-Shirt',
    marketplace: 'Made-in-China (APTA)',
    url: 'https://www.made-in-china.com/product/100-Cotton-Knitted-Mens-T-Shirt-180-GSM-Crew-Neck_1948271625.html',
    hint: '',
  },
];

const SAMPLE_PHOTO_CARDS: {
  label: string;
  fileName: string;
  badge: string;
  titleLine: string;
  specLine: string;
  originLine: string;
  accentHex: string;
  hint: string;
}[] = [
  {
    label: 'Solar 550W Spec Plate',
    fileName: '550W-Monocrystalline-Solar-PV-Panel-Made-in-China.jpg',
    badge: 'PV MODULE SPEC LABEL',
    titleLine: 'MONO PERC 550W SOLAR PV PANEL',
    specLine: 'Vmp: 41.9V | Imp: 13.13A | Eff: 21.3%',
    originLine: 'MADE IN CHINA (APTA ORIGIN)',
    accentHex: '#059669',
    hint: 'Monocrystalline 550W solar photovoltaic PV panel module Made in China',
  },
  {
    label: 'Juki Sewing Nameplate',
    fileName: 'Juki-DDL-8700-Industrial-Sewing-Machine.jpg',
    badge: 'INDUSTRIAL CAPITAL MACHINERY',
    titleLine: 'JUKI DDL-8700 LOCKSTITCH',
    specLine: '5500 SPM | Servo Motor | Industrial Factory Use',
    originLine: 'CHAPTER 8452 · IRC CAPITAL MACHINERY',
    accentHex: '#0284c7',
    hint: 'Industrial Juki DDL-8700 sewing machine for RMG garment factory manufacturing',
  },
  {
    label: '25kg Milk Powder Bag',
    fileName: 'Full-Cream-Milk-Powder-25kg-Bulk-Bag.jpg',
    badge: 'BULK INDUSTRIAL FOOD BAG',
    titleLine: 'FULL CREAM MILK POWDER',
    specLine: 'Milk Fat >= 26% | Net Wt: 25 KG Kraft Bag',
    originLine: 'INDUSTRIAL BULK PACK (> 2.5 KG)',
    accentHex: '#d97706',
    hint: 'Full cream milk powder in 25kg bulk industrial bag',
  },
  {
    label: 'Cotton T-Shirt Care Tag',
    fileName: '100pct-Cotton-Knitted-TShirt-180GSM.jpg',
    badge: 'APPAREL CARE LABEL',
    titleLine: '100% COTTON KNITTED T-SHIRT',
    specLine: 'Single Jersey 180 GSM | Men Crew Neck',
    originLine: 'RN# 94821 · MADE IN INDIA (SAFTA)',
    accentHex: '#7c3aed',
    hint: '100% cotton knitted mens t-shirt 180 GSM Made in India',
  },
];

function renderSampleSpecLabelDataUrl(card: (typeof SAMPLE_PHOTO_CARDS)[number]): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 640, 360);

  ctx.strokeStyle = card.accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 604, 324);

  ctx.fillStyle = card.accentHex;
  ctx.fillRect(36, 38, 280, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(card.badge, 48, 60);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(card.titleLine, 36, 128);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '18px monospace';
  ctx.fillText(card.specLine, 36, 178);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(card.originLine, 36, 228);

  // Barcode stripes decoration
  ctx.fillStyle = '#e2e8f0';
  for (let x = 36; x < 340; x += 9) {
    const w = (x % 18 === 0) ? 5 : 2;
    ctx.fillRect(x, 262, w, 46);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('DUTYLENS BD SAMPLE SPEC SCAN', 360, 292);

  return canvas.toDataURL('image/jpeg', 0.86);
}

async function compressImageFileToDataUrl(file: File): Promise<{
  dataUrl: string;
  mimeType: string;
  ocrHint: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image format.'));
      img.onload = async () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: String(reader.result || ''),
            mimeType: file.type || 'image/jpeg',
            ocrHint: '',
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Opportunistic native browser Shape Detection TextDetector OCR (if available in Chromium/Android)
        let ocrHint = '';
        try {
          const AnyWin = window as any;
          if (typeof AnyWin.TextDetector === 'function') {
            const detector = new AnyWin.TextDetector();
            const blocks = await detector.detect(canvas);
            if (Array.isArray(blocks) && blocks.length > 0) {
              ocrHint = blocks
                .map((b: any) => b?.rawValue || '')
                .filter(Boolean)
                .join(' ')
                .slice(0, 240);
            }
          }
        } catch {
          // ignore if unavailable
        }

        const outMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outMime, 0.84);
        resolve({ dataUrl, mimeType: outMime, ocrHint });
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const MultimodalSourceInput: React.FC<MultimodalSourceInputProps> = ({
  lang,
  mode,
  onChangeMode,
  queryInput,
  onChangeQueryInput,
  onSubmitText,
  onSubmitPhoto,
  onSubmitLink,
  loading,
  error,
  samplePresets,
  onSelectPreset,
  sourceMeta,
  onClearSourceMeta,
  activePreferentialOrigin,
  onApplyPreferentialOrigin,
  llmConfig,
  onOpenAiModal,
}) => {
  const isBn = lang === 'bn';

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg');
  const [photoHint, setPhotoHint] = useState<string>('');
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Link state
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkHint, setLinkHint] = useState<string>('');

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleOpenLiveCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native file input with capture="environment"
      mobileCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError(
        isBn
          ? 'ব্রাউজার ক্যামেরা অনুমতি পাওয়া যায়নি — নিচের "ছবি আপলোড / মোবাইল ক্যামেরা" বাটন ব্যবহার করুন।'
          : 'Live webcam access unavailable — opening device camera / photo picker instead.'
      );
      mobileCameraInputRef.current?.click();
    }
  };

  const handleSnapCameraFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 960;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1024, w);
    canvas.height = Math.round((h / w) * canvas.width);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoPreview(dataUrl);
    setPhotoFileName('camera-capture.jpg');
    setPhotoMimeType('image/jpeg');
    stopCameraStream();
  };

  const handleFileChosen = async (file?: File | null) => {
    if (!file) return;
    setCameraError(null);
    try {
      const { dataUrl, mimeType, ocrHint } = await compressImageFileToDataUrl(file);
      setPhotoPreview(dataUrl);
      setPhotoFileName(file.name || 'uploaded-product.jpg');
      setPhotoMimeType(mimeType);
      const nextHint = ocrHint && !photoHint ? ocrHint : photoHint;
      if (ocrHint && !photoHint) {
        setPhotoHint(ocrHint);
      }
      onSubmitPhoto({
        imageBase64: dataUrl,
        imageMimeType: mimeType,
        imageFileName: file.name || 'uploaded-product.jpg',
        userHint: nextHint || undefined,
      });
    } catch (err: any) {
      setCameraError(err?.message || 'Failed to process image');
    }
  };

  const handleSelectSamplePhoto = (card: (typeof SAMPLE_PHOTO_CARDS)[number]) => {
    const dataUrl = renderSampleSpecLabelDataUrl(card);
    setPhotoPreview(dataUrl);
    setPhotoFileName(card.fileName);
    setPhotoMimeType('image/jpeg');
    setPhotoHint(card.hint);
    onSubmitPhoto({
      imageBase64: dataUrl,
      imageMimeType: 'image/jpeg',
      imageFileName: card.fileName,
      userHint: card.hint,
    });
  };

  const hasVisionApiKey =
    llmConfig.provider !== 'builtin' && Boolean(llmConfig.apiKey && llmConfig.apiKey.length > 5);

  return (
    <div className="mt-3.5 space-y-3.5">
      {/* 3-Way Input Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onChangeMode('text')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'text'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isBn ? 'পণ্যের বর্ণনা লিখুন' : 'Describe Product'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('photo')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'photo'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isBn ? 'ক্যামেরা / ছবি আপলোড' : 'Camera / Photo Upload'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('link')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'link'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isBn ? 'পণ্যের লিংক দিন' : 'Submit Product Link'}</span>
          </button>
        </div>

        <div className="text-[11px] font-medium text-slate-500">
          {isBn
            ? 'স্বয়ংক্রিয়ভাবে শুল্ক, কর রেয়াত, জিরো-ট্যাক্স ও সেরা বন্দর বিশ্লেষণ করে'
            : 'Auto-analyzes Duty Tax · Rebate Scope · Zero-Tax · Best Destination'}
        </div>
      </div>

      {/* ================= MODE 1: NATURAL LANGUAGE TEXT ================= */}
      {mode === 'text' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitText();
          }}
        >
          <textarea
            rows={3}
            value={queryInput}
            onChange={(e) => onChangeQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                onSubmitText();
              }
            }}
            placeholder={
              isBn
                ? 'উদাহরণ: ১০০% সুতি নিটেড টি-শার্ট ১৮০ GSM, অথবা 550W সোলার প্যানেল, অথবা ইন্ডাস্ট্রিয়াল সুইং মেশিন...'
                : "Example: 100% cotton knitted men's t-shirt 180 GSM, or Monocrystalline 550W solar PV panel, or ইন্ডাস্ট্রিয়াল সুইং মেশিন..."
            }
            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50/40 p-3.5 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-slate-500">
                {isBn ? 'নমুনা পণ্য:' : 'Try sample:'}
              </span>
              {samplePresets.map((preset, idx) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectPreset(idx)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isBn ? 'বিশ্লেষণ হচ্ছে...' : 'Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isBn
                      ? 'HS কোড ও NBR শুল্ক হিসাব করুন'
                      : 'Classify & Calculate NBR Tax'}
                  </span>
                  <CornerDownLeft className="h-3.5 w-3.5 opacity-75" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ================= MODE 2: CAMERA / PHOTO UPLOAD ================= */}
      {mode === 'photo' && (
        <div className="space-y-3">
          {/* Hidden File & Native Mobile Camera Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFileChosen(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFileChosen(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />

          {/* Live Webcam Capture Box */}
          {cameraOpen && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 text-white">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Video className="h-4 w-4 animate-pulse" />
                  {isBn
                    ? 'পণ্য বা কার্টনের লেবেল ক্যামেরার সামনে ধরুন'
                    : 'Point camera at product, carton label, or spec plate'}
                </span>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="mx-auto max-h-64 w-full rounded-lg bg-black object-contain"
              />
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSnapCameraFrame}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <Camera className="h-4 w-4" />
                  <span>{isBn ? 'ছবি তুলুন (Snap Photo)' : 'Snap Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Upload / Camera Dropzone + Preview */}
          {!cameraOpen && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.type.startsWith('image/')) handleFileChosen(f);
              }}
              className="grid grid-cols-1 gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 transition hover:border-emerald-400 md:grid-cols-12"
            >
              {/* Left Action Area */}
              <div className="flex flex-col justify-between gap-3 md:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {isBn
                        ? 'পণ্যের ছবি, নেমপ্লেট বা ইনভয়েস লেবেল স্ক্যান করুন'
                        : 'Capture or Upload Product Photo, Spec Plate, or Carton Label'}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAiModal}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        hasVisionApiKey
                          ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/25'
                          : 'bg-amber-50 text-amber-800 ring-amber-600/25'
                      }`}
                    >
                      {hasVisionApiKey
                        ? `✓ ${llmConfig.provider.toUpperCase()} Vision Active`
                        : isBn
                        ? 'স্মার্ট লেবেল মোড (ঐচ্ছিক Vision API যোগ করুন)'
                        : 'Built-in Label Mode (+ Optional Vision API)'}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isBn
                      ? 'সরাসরি ক্যামেরা দিয়ে ছবি তুলুন অথবা গ্যালারি থেকে JPG/PNG ছবি দিন। ঐচ্ছিকভাবে নিচের ক্যাটাগরি ট্যাগ বা ২ শব্দের নোট যোগ করলে শতভাগ নিখুঁত HS কোড পাওয়া যায়।'
                      : 'Take a live camera photo or drag & drop a JPG/PNG image. Add an optional product label note or tap a visual category chip below for pinpoint HS8 accuracy.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenLiveCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{isBn ? 'লাইভ ক্যামেরা খুলুন' : 'Take Photo (Camera)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs transition hover:bg-slate-50"
                  >
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isBn ? 'ছবি আপলোড করুন' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:hidden"
                  >
                    <ImagePlus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isBn ? 'ফোন ক্যামেরা' : 'Phone Snap'}</span>
                  </button>
                </div>

                {/* Optional Label / Spec Note + Re-Analyze */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={photoHint}
                    onChange={(e) => setPhotoHint(e.target.value)}
                    placeholder={
                      isBn
                        ? 'ঐচ্ছিক নোট / মডেলের নাম (যেমন: 550W Solar Panel বা 100% Cotton T-Shirt)...'
                        : 'Optional label / model hint (e.g., 550W Solar Panel, Juki Sewing Machine)...'
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                  {photoPreview && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        onSubmitPhoto({
                          imageBase64: photoPreview,
                          imageMimeType: photoMimeType,
                          imageFileName: photoFileName || 'camera-capture.jpg',
                          userHint: photoHint || undefined,
                        })
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{isBn ? 'ছবি বিশ্লেষণ করুন' : 'Analyze Photo'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Preview Area */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 md:col-span-5">
                {photoPreview ? (
                  <div className="relative w-full text-center">
                    <img
                      src={photoPreview}
                      alt="Selected product"
                      className="mx-auto max-h-36 rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoFileName('');
                        onClearSourceMeta();
                      }}
                      className="absolute top-1 right-1 rounded-full bg-slate-900/75 p-1 text-white hover:bg-slate-900"
                      title="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="mt-1.5 truncate text-[11px] font-medium text-slate-600">
                      {photoFileName}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center py-4 text-center"
                  >
                    <FileImage className="h-8 w-8 text-slate-300" />
                    <span className="mt-1.5 text-xs font-semibold text-slate-600">
                      {isBn ? 'এখানে ছবি ড্রপ করুন বা ক্লিক করুন' : 'Drop image here or click to browse'}
                    </span>
                    <span className="text-[10px] text-slate-400">JPG · PNG · WEBP (Auto-compressed)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {cameraError && <p className="text-xs font-medium text-amber-700">{cameraError}</p>}

          {/* Quick Visual Category Chips (Instant 1-Tap Assist for Camera Snaps) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Tag className="h-3 w-3 text-emerald-600" />
              {isBn ? 'দ্রুত ভিজ্যুয়াল ক্যাটাগরি:' : 'Quick visual tag:'}
            </span>
            {VISUAL_CATEGORY_HINTS.map((chip) => (
              <button
                key={chip.labelEn}
                type="button"
                onClick={() => {
                  setPhotoHint(chip.queryHint);
                  if (photoPreview) {
                    onSubmitPhoto({
                      imageBase64: photoPreview,
                      imageMimeType: photoMimeType,
                      imageFileName: photoFileName || 'camera-capture.jpg',
                      userHint: chip.queryHint,
                    });
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {isBn ? chip.labelBn : chip.labelEn}
              </button>
            ))}
          </div>

          {/* 1-Click Sample Product Spec Photos */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
            <span className="text-[11px] font-semibold text-slate-500">
              {isBn ? 'নমুনা পণ্যের ছবি টেস্ট করুন:' : 'Test sample product photo:'}
            </span>
            {SAMPLE_PHOTO_CARDS.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => handleSelectSamplePhoto(card)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                <Camera className="h-3 w-3 text-emerald-600" />
                <span>{card.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODE 3: PRODUCT LINK SUBMIT ================= */}
      {mode === 'link' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitLink({ url: linkUrl, userHint: linkHint || undefined });
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            <div className="relative md:col-span-8">
              <Link2 className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={
                  isBn
                    ? 'Alibaba, Amazon, IndiaMART, Made-in-China, AliExpress বা Daraz পণ্যের লিংক পেস্ট করুন...'
                    : 'Paste Alibaba, Amazon, IndiaMART, Made-in-China, AliExpress, or Daraz product URL...'
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50/40 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 md:col-span-4">
              <input
                type="text"
                value={linkHint}
                onChange={(e) => setLinkHint(e.target.value)}
                placeholder={isBn ? 'ঐচ্ছিক স্পেক / উপাদান নোট...' : 'Optional spec / material note...'}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/40 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !linkUrl.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{isBn ? 'লিংক বিশ্লেষণ' : 'Analyze Link'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">
              {isBn ? 'নমুনা পণ্যের লিংক:' : 'Try sample product link:'}
            </span>
            {SAMPLE_LINKS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setLinkUrl(item.url);
                  setLinkHint(item.hint);
                  onSubmitLink({ url: item.url, userHint: item.hint || undefined });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Globe2 className="h-3 w-3 text-emerald-600" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </form>
      )}

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      {/* Extracted Photo / Product Link Intelligence Banner */}
      {sourceMeta && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  {sourceMeta.sourceType === 'link' ? (
                    <>
                      <Link2 className="h-2.5 w-2.5" />
                      <span>{sourceMeta.detectedMarketplace || 'Product Link'}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-2.5 w-2.5" />
                      <span>
                        {sourceMeta.extractionMethod === 'vision-llm'
                          ? 'AI Vision Scan'
                          : 'Photo Label Scan'}
                      </span>
                    </>
                  )}
                </span>

                {sourceMeta.suggestedOriginCountry && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                    Origin: {sourceMeta.suggestedOriginCountry}
                  </span>
                )}

                {sourceMeta.detectedPrice && sourceMeta.detectedCurrency && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                    Detected Price: {sourceMeta.detectedCurrency} {sourceMeta.detectedPrice}
                  </span>
                )}

                {sourceMeta.sourceUrl && (
                  <a
                    href={sourceMeta.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    <span>Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="font-bold text-slate-900">{sourceMeta.extractedTitle}</div>
              <p className="text-[11px] text-slate-600">{sourceMeta.confidenceNote}</p>
            </div>

            <div className="flex items-center gap-2">
              {sourceMeta.suggestedPreferentialOrigin &&
                sourceMeta.suggestedPreferentialOrigin !== activePreferentialOrigin && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreferentialOrigin(sourceMeta.suggestedPreferentialOrigin!)
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-sky-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {isBn
                        ? `${sourceMeta.suggestedPreferentialOrigin.toUpperCase()} শুল্ক ছাড় প্রয়োগ করুন`
                        : `Apply ${sourceMeta.suggestedPreferentialOrigin.toUpperCase()} Tariff Discount`}
                    </span>
                  </button>
                )}

              <button
                type="button"
                onClick={onClearSourceMeta}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
