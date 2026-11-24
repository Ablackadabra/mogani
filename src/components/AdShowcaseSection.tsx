import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  Film,
  ImagePlus,
  Images,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AdVideo, Language, Product, PublicUser } from '../types';
import {
  adminUpdateAd,
  adminUpdateSettings,
  createAd,
  deleteAd,
  recordAdView,
  updateAd,
  uploadAdVideoFile,
} from '../api';
import { compressImageFile, formatRwf } from '../utils/image';
import { getCopy } from '../i18n';

interface AdEditorFormProps {
  lang: Language;
  products: Product[];
  editingAd: AdVideo | null;
  isAdmin?: boolean;
  defaultWorkshopName?: string;
  onCancel: () => void;
  onSaved: (ad: AdVideo, isNew: boolean) => void;
}

export function AdEditorForm({
  lang,
  products,
  editingAd,
  isAdmin = false,
  defaultWorkshopName = 'JOKEVE FURNITURE',
  onCancel,
  onSaved,
}: AdEditorFormProps) {
  const initialSlides =
    editingAd?.slideshowImages && editingAd.slideshowImages.length > 0
      ? editingAd.slideshowImages
      : editingAd?.posterImageUrl
      ? [editingAd.posterImageUrl]
      : [];

  const [mediaType, setMediaType] = useState<'video' | 'slideshow'>(
    editingAd?.mediaType || (editingAd?.videoUrl ? 'video' : 'slideshow')
  );
  const [displaySize, setDisplaySize] = useState<'standard' | 'big'>(
    editingAd?.displaySize || 'standard'
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>(editingAd?.videoUrl || '');
  const [durationSec, setDurationSec] = useState<number | undefined>(editingAd?.durationSec);
  const [posterImageUrl, setPosterImageUrl] = useState<string>(editingAd?.posterImageUrl || '');
  const [slideshowImages, setSlideshowImages] = useState<string[]>(initialSlides);
  const [slideIntervalMs, setSlideIntervalMs] = useState<number>(editingAd?.slideIntervalMs || 3200);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  const [title, setTitle] = useState(editingAd?.title || '');
  const [caption, setCaption] = useState(editingAd?.caption || '');
  const [workshopName, setWorkshopName] = useState(
    editingAd?.workshopName || defaultWorkshopName
  );
  const [productId, setProductId] = useState(editingAd?.productId || '');
  const [appName, setAppName] = useState(editingAd?.appName || '');
  const [appUrl, setAppUrl] = useState(editingAd?.appUrl || '');
  const [ctaLabel, setCtaLabel] = useState(
    editingAd?.ctaLabel || (lang === 'rw' ? 'Reba Igicuruzwa' : 'View Featured Item')
  );
  const [status, setStatus] = useState<'active' | 'paused'>(editingAd?.status || 'active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    if (mediaType !== 'slideshow' || slideshowImages.length <= 1) return;
    const timer = setInterval(() => {
      setPreviewSlideIdx((prev) => (prev + 1) % slideshowImages.length);
    }, slideIntervalMs);
    return () => clearInterval(timer);
  }, [mediaType, slideshowImages.length, slideIntervalMs]);

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setError(
        lang === 'rw'
          ? 'Hitamo video ya MP4, WebM cyangwa MOV gusa.'
          : 'Please choose an MP4, WebM, or MOV video file.'
      );
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      setError(
        lang === 'rw'
          ? 'Video igomba kuba munsi ya 150 MB.'
          : 'Advertisement video file must be under 150 MB (Big Video supported).'
      );
      return;
    }
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setDurationSec(undefined);
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file, 960);
      setPosterImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cover image.');
    }
  }

  async function handleSlideshowUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    try {
      const next: string[] = [];
      for (const file of files.slice(0, 10 - slideshowImages.length)) {
        const compressed = await compressImageFile(file, 960);
        next.push(compressed);
      }
      setSlideshowImages((prev) => {
        const merged = [...prev, ...next].slice(0, 10);
        if (!posterImageUrl && merged[0]) setPosterImageUrl(merged[0]);
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process one or more photos.');
    }
    e.target.value = '';
  }

  function handleAddCatalogPhoto(imgUrl: string) {
    setSlideshowImages((prev) => {
      if (prev.includes(imgUrl) || prev.length >= 10) return prev;
      const merged = [...prev, imgUrl];
      if (!posterImageUrl && merged[0]) setPosterImageUrl(merged[0]);
      return merged;
    });
  }

  function handleMoveSlide(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= slideshowImages.length) return;
    setSlideshowImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
    setPreviewSlideIdx(target);
  }

  function handleRemoveSlide(idx: number) {
    setSlideshowImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewSlideIdx(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (title.trim().length < 3) {
      setError(
        lang === 'rw'
          ? 'Andika umutwe w’ikimenyekanisha (nibura inyuguti 3).'
          : 'Please enter an advertisement title (at least 3 characters).'
      );
      return;
    }

    if (mediaType === 'video' && !videoFile && !editingAd?.videoUrl) {
      setError(
        lang === 'rw'
          ? 'Shyiramo aka video kagufi cyangwa uhitemo uburyo bw’amafoto ahindagurika (Animated Photos).'
          : 'Select a video clip (MP4/WebM/MOV) or switch to Animated Photo Slideshow.'
      );
      return;
    }

    if (mediaType === 'slideshow' && slideshowImages.length === 0 && !posterImageUrl) {
      setError(
        lang === 'rw'
          ? 'Shyiramo nibura ifoto 1 (cyangwa nyinshi) kugira ngo ikore animation.'
          : 'Add at least 1 photo (multiple photos recommended) for the animated reel.'
      );
      return;
    }

    const trimmedAppUrl = appUrl.trim();
    if (trimmedAppUrl && !/^https?:\/\/\S+/i.test(trimmedAppUrl)) {
      setError(
        lang === 'rw'
          ? 'Link ya App igomba gutangizwa na https:// cyangwa http:// (Urugero: https://play.google.com/...).'
          : 'App download URL must start with https:// or http://.'
      );
      return;
    }

    setSubmitting(true);
    try {
      let uploadedVideoUrl: string | undefined = editingAd?.videoUrl;
      if (mediaType === 'video' && videoFile) {
        const uploaded = await uploadAdVideoFile(videoFile);
        uploadedVideoUrl = uploaded.videoUrl;
      }

      const selectedLinked = productId ? products.find((p) => p.id === productId) : undefined;
      const effectiveCover =
        posterImageUrl ||
        slideshowImages[0] ||
        selectedLinked?.imageUrl ||
        editingAd?.posterImageUrl ||
        '/src/assets/images/hero_living_room_1795425660795.jpg';

      if (editingAd) {
        const payload = {
          title: title.trim(),
          caption: caption.trim() || title.trim(),
          ctaLabel:
            ctaLabel.trim() ||
            (trimmedAppUrl
              ? lang === 'rw'
                ? 'Kuramo App'
                : 'Download App'
              : lang === 'rw'
              ? 'Reba Igicuruzwa'
              : 'View Featured Item'),
          workshopName: workshopName.trim() || editingAd.workshopName,
          productId: productId || '',
          mediaType,
          displaySize,
          appName: appName.trim(),
          appUrl: trimmedAppUrl,
          posterImageUrl: effectiveCover,
          slideshowImages:
            mediaType === 'slideshow'
              ? slideshowImages.length > 0
                ? slideshowImages
                : [effectiveCover]
              : slideshowImages,
          slideIntervalMs,
          videoUrl: mediaType === 'video' ? uploadedVideoUrl : undefined,
          status,
        };
        const res = isAdmin
          ? await adminUpdateAd(editingAd.id, payload)
          : await updateAd(editingAd.id, payload);
        onSaved(res.ad, false);
      } else {
        const res = await createAd({
          title: title.trim(),
          caption: caption.trim() || title.trim(),
          ctaLabel:
            ctaLabel.trim() ||
            (trimmedAppUrl
              ? lang === 'rw'
                ? 'Kuramo App'
                : 'Download App'
              : lang === 'rw'
              ? 'Reba Igicuruzwa'
              : 'View Featured Item'),
          workshopName: workshopName.trim() || defaultWorkshopName,
          productId: productId || undefined,
          mediaType,
          displaySize,
          appName: appName.trim() || undefined,
          appUrl: trimmedAppUrl || undefined,
          videoUrl: mediaType === 'video' ? uploadedVideoUrl : undefined,
          posterImageUrl: effectiveCover,
          slideshowImages:
            mediaType === 'slideshow'
              ? slideshowImages.length > 0
                ? slideshowImages
                : [effectiveCover]
              : undefined,
          slideIntervalMs,
          durationSec:
            mediaType === 'slideshow'
              ? Math.max(8, Math.round(((slideshowImages.length || 1) * slideIntervalMs) / 1000))
              : durationSec,
          status,
        });
        onSaved(res.ad, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save advertisement.');
    } finally {
      setSubmitting(false);
    }
  }

  const activePreviewImg =
    slideshowImages[previewSlideIdx % Math.max(1, slideshowImages.length)] || posterImageUrl;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#D6D3D1] rounded-lg p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E5E4]">
        <div>
          <h3 className="text-base font-semibold text-[#1C1917]">
            {editingAd
              ? lang === 'rw'
                ? `Hindura Ikimenyekanisha: ${editingAd.title}`
                : `Edit Advertisement: ${editingAd.title}`
              : lang === 'rw'
              ? 'Shyiraho Ikimenyekanisha (Video cyangwa Amafoto Akora Animation)'
              : 'Create Advertisement (Video or Animated Photo Reel)'}
          </h3>
          <p className="text-xs text-[#57534E]">
            {lang === 'rw'
              ? 'Hitamo video ngufi (MP4/WebM) cyangwa ushyiremo amafoto menshi yisubiramo afite animation nka video, uhindure n’ibyanditse byose.'
              : 'Upload a short video or build a multi-photo animated video reel, and customize all copy and linked items.'}
          </p>
        </div>

        {/* Media Type Switch */}
        <div className="inline-flex p-1 bg-[#F2EFE9] rounded-lg border border-[#E7E5E4] shrink-0">
          <button
            type="button"
            onClick={() => setMediaType('slideshow')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              mediaType === 'slideshow'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Images className="w-3.5 h-3.5 text-[#7C4D25]" />
            <span>{lang === 'rw' ? 'Amafoto (Animation)' : 'Animated Photos'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaType('video')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              mediaType === 'video'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#7C4D25]" />
            <span>{lang === 'rw' ? 'Video (MP4/WebM)' : 'Short Video'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Media Preview & Photo/Video Controls */}
        <div className="lg:col-span-5 space-y-3">
          <div className="aspect-video w-full bg-[#141210] rounded-md overflow-hidden border border-[#292524] flex items-center justify-center relative">
            {mediaType === 'video' ? (
              videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur) && dur > 0) setDurationSec(Math.round(dur));
                  }}
                />
              ) : (
                <div className="text-center px-6 py-8 space-y-2 text-stone-300">
                  <Film className="w-8 h-8 mx-auto text-[#D4AF37]" />
                  <p className="text-xs font-medium">
                    {lang === 'rw'
                      ? 'Hitamo video (MP4 / WebM / MOV kugeza kuri 150 MB — Big Video biremewe)'
                      : 'Select a video reel (MP4 / WebM / MOV up to 150 MB · Big Video supported)'}
                  </p>
                </div>
              )
            ) : activePreviewImg ? (
              <div className="relative w-full h-full overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`${previewSlideIdx}-${activePreviewImg.slice(-18)}`}
                    src={activePreviewImg}
                    alt="Slideshow preview"
                    initial={{ opacity: 0.25, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1.09 }}
                    exit={{ opacity: 0.2 }}
                    transition={{
                      opacity: { duration: 0.45 },
                      scale: { duration: slideIntervalMs / 1000, ease: 'easeOut' },
                    }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                  <span className="truncate font-medium">
                    {title || (lang === 'rw' ? 'Umutwe w’ikimenyekanisha' : 'Ad Headline Preview')}
                  </span>
                  <span className="font-mono tabular-nums bg-black/60 px-2 py-0.5 rounded shrink-0">
                    {(previewSlideIdx % Math.max(1, slideshowImages.length)) + 1}/
                    {Math.max(1, slideshowImages.length)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center px-6 py-8 space-y-2 text-stone-300">
                <Images className="w-8 h-8 mx-auto text-[#D4AF37]" />
                <p className="text-xs font-medium">
                  {lang === 'rw'
                    ? 'Shyiramo amafoto 2 cyangwa arenga kugira ngo yikoremo animation nka video'
                    : 'Upload or pick 2+ photos to create an animated commercial reel'}
                </p>
              </div>
            )}
          </div>

          {mediaType === 'video' ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#7C4D25] text-white rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {videoFile || editingAd?.videoUrl
                    ? lang === 'rw'
                      ? 'Hindura Video'
                      : 'Replace Video'
                    : lang === 'rw'
                    ? 'Hitamo Video (MP4/WebM)'
                    : 'Select Video File'}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoFileChange}
                  className="sr-only"
                />
              </label>

              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-[#D6D3D1] bg-[#FAF9F6] text-[#1C1917] rounded-md hover:bg-stone-100 cursor-pointer whitespace-nowrap">
                <ImagePlus className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>
                  {posterImageUrl
                    ? lang === 'rw'
                      ? 'Hindura Ifoto ya Cover'
                      : 'Change Cover Photo'
                    : lang === 'rw'
                    ? 'Ifoto ya Cover'
                    : 'Cover Photo'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePosterUpload}
                  className="sr-only"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#7C4D25] text-white rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap">
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'rw'
                      ? 'Ongeraho Amafoto (Menshi)'
                      : 'Upload Slideshow Photos'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSlideshowUpload}
                    className="sr-only"
                  />
                </label>

                <select
                  aria-label="Slide transition speed"
                  value={slideIntervalMs}
                  onChange={(e) => setSlideIntervalMs(Number(e.target.value))}
                  className="px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917]"
                >
                  <option value={2400}>{lang === 'rw' ? 'Byihuta (2.4s)' : 'Fast (2.4s/frame)'}</option>
                  <option value={3200}>{lang === 'rw' ? 'Bisanzwe (3.2s)' : 'Standard (3.2s/frame)'}</option>
                  <option value={4500}>{lang === 'rw' ? 'Buhoro (4.5s)' : 'Cinematic (4.5s/frame)'}</option>
                  <option value={6000}>{lang === 'rw' ? 'Bituje (6.0s)' : 'Slow (6.0s/frame)'}</option>
                </select>
              </div>

              {/* Slideshow Frame Strip (Reorder / Delete) */}
              {slideshowImages.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {slideshowImages.map((img, idx) => (
                    <div
                      key={`${idx}-${img.slice(-12)}`}
                      className={`relative rounded overflow-hidden border bg-stone-100 aspect-[4/3] ${
                        idx === previewSlideIdx % slideshowImages.length
                          ? 'border-[#7C4D25] ring-1 ring-[#7C4D25]'
                          : 'border-[#D6D3D1]'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Slide ${idx + 1}`}
                        onClick={() => setPreviewSlideIdx(idx)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 flex items-center justify-between px-1 py-0.5 text-[10px] text-white">
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, -1)}
                          disabled={idx === 0}
                          className="disabled:opacity-30 cursor-pointer"
                          title="Move left"
                        >
                          ←
                        </button>
                        <span className="font-mono">{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, 1)}
                          disabled={idx === slideshowImages.length - 1}
                          className="disabled:opacity-30 cursor-pointer"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlide(idx)}
                        aria-label="Remove frame"
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Pick from Catalog Photos */}
              {products.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-[#57534E]">
                    {lang === 'rw'
                      ? 'Cyangwa kanda ku mafoto y’ibicuruzwa uyongere muri animation:'
                      : 'Or click catalog photos to add them to your animated reel:'}
                  </p>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {products.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddCatalogPhoto(p.imageUrl)}
                        title={lang === 'rw' ? p.titleRw : p.title}
                        className="w-12 h-10 rounded overflow-hidden border border-[#D6D3D1] hover:border-[#7C4D25] shrink-0 cursor-pointer"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Editable Text & Metadata */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Umutwe w’Ikimenyekanisha (Ad Title)' : 'Advertisement Title'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                lang === 'rw'
                  ? 'Urugero: Salon Nshya ya Mvule n’Utubati tw’Icyitegererezo'
                  : 'e.g. Custom Mvule Salon Suite — Promo Offer'
              }
              className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw'
                ? 'Ubutumwa & Ibisobanuro (Ad Text / Pitch)'
                : 'Promotional Text / Offer Description'}
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                lang === 'rw'
                  ? 'Sobanura ibiciro byagabanijwe, ubwiza bw’igiti, cyangwa aho mubarizwa...'
                  : 'Share your special offer, wood finish, or delivery timeline...'
              }
              className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Izina ry’Iduka / Atelier' : 'Workshop / Brand Name'}
            </label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Inyandiko yo kuri Buto (CTA)' : 'Action Button Label'}
            </label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Reba Igicuruzwa"
              className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Huza n’Igikoresho (Linked Item)' : 'Link to Catalog Product'}
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            >
              <option value="">
                {lang === 'rw' ? '— Nta gikoresho gifatanijwe —' : '— General Workshop Ad —'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {(lang === 'rw' ? p.titleRw : p.title)} · {formatRwf(p.priceRwf)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Ingano y’Uburyo Igaragara (Display Size)' : 'Video / Showcase Display Size'}
            </label>
            <select
              value={displaySize}
              onChange={(e) => setDisplaySize(e.target.value as 'standard' | 'big')}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            >
              <option value="standard">
                {lang === 'rw' ? 'Bisanzwe (Standard Player)' : 'Standard Showcase Card'}
              </option>
              <option value="big">
                {lang === 'rw' ? 'Video Nini Cyane (Big Cinema Full-Width)' : 'Big Video / Cinema (Full Width)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              {lang === 'rw' ? 'Imimerere (Status)' : 'Visibility Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
            >
              <option value="active">{lang === 'rw' ? 'Igaragara (Active)' : 'Active (Live)'}</option>
              <option value="paused">{lang === 'rw' ? 'Yahagaritswe (Paused)' : 'Paused (Hidden)'}</option>
            </select>
          </div>

          {/* App Promotion & Direct Download Destination */}
          <div className="sm:col-span-2 p-3.5 bg-[#FAF9F6] border border-[#E7E5E4] rounded-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
              <Smartphone className="w-4 h-4 text-[#7C4D25] shrink-0" />
              <span>
                {lang === 'rw'
                  ? 'Niba wamamaza App: Shyiramo Link Ijyana Umuntu Kuyidawunirodinga (Optional)'
                  : 'App Promotion & Download Destination (Optional)'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  {lang === 'rw' ? 'Izina rya App (App Name)' : 'App Name'}
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder={lang === 'rw' ? 'Urugero: JOKEVE Mobile App' : 'e.g. JOKEVE Mobile App'}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  {lang === 'rw' ? 'Link yo Kudawunirodinga App (URL)' : 'App Download / Store URL'}
                </label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D6D3D1] rounded-md focus:outline-none focus:border-[#7C4D25]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#57534E]">
              {lang === 'rw'
                ? 'Iyo ushyizemo iyi link, umuntu ukanda kuri buto muri video ahita ajyanwa aho iyo app iherereye akayidawunirodinga.'
                : 'When provided, viewers see a direct Download App button that opens the app page or APK download link.'}
            </p>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
            >
              {lang === 'rw' ? 'Hagarika' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C4D25] text-white text-xs sm:text-sm font-medium rounded-md hover:bg-[#633D1D] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>
                {submitting
                  ? lang === 'rw'
                    ? 'Biri gukorwa...'
                    : 'Saving...'
                  : editingAd
                  ? lang === 'rw'
                    ? 'Bika Impinduka Zose'
                    : 'Save All Changes'
                  : lang === 'rw'
                  ? 'Tangaza Ikimenyekanisha'
                  : 'Publish Advertisement'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

interface AdShowcaseSectionProps {
  lang: Language;
  ads: AdVideo[];
  products: Product[];
  user: PublicUser | null;
  adBannerTitle?: string;
  adBannerText?: string;
  onBannerUpdated?: (title: string, text: string) => void;
  onOpenAuth: () => void;
  onSelectProduct: (product: Product) => void;
  onAdCreated: (ad: AdVideo) => void;
  onAdUpdated?: (ad: AdVideo) => void;
  onAdDeleted: (id: string) => void;
  onAdViewed: (id: string, views: number) => void;
}

export function AdShowcaseSection({
  lang,
  ads,
  products,
  user,
  adBannerTitle = '',
  adBannerText = '',
  onBannerUpdated,
  onOpenAuth,
  onSelectProduct,
  onAdCreated,
  onAdUpdated,
  onAdDeleted,
  onAdViewed,
}: AdShowcaseSectionProps) {
  const t = getCopy(lang);
  const isAdmin = user?.role === 'admin';
  const [selectedAdId, setSelectedAdId] = useState<string>('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdVideo | null>(null);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [draftBannerTitle, setDraftBannerTitle] = useState(adBannerTitle);
  const [draftBannerText, setDraftBannerText] = useState(adBannerText);
  const [savingBanner, setSavingBanner] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [cinemaOverride, setCinemaOverride] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const viewedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDraftBannerTitle(adBannerTitle);
    setDraftBannerText(adBannerText);
  }, [adBannerTitle, adBannerText]);

  useEffect(() => {
    if (ads.length === 0) {
      setSelectedAdId('');
      return;
    }
    if (!ads.some((a) => a.id === selectedAdId)) {
      setSelectedAdId(ads[0].id);
    }
  }, [ads, selectedAdId]);

  const activeAd = ads.find((a) => a.id === selectedAdId) || ads[0] || null;
  const linkedProduct = activeAd?.productId
    ? products.find((p) => p.id === activeAd.productId)
    : undefined;
  const isBigDisplay = cinemaOverride !== null ? cinemaOverride : activeAd?.displaySize === 'big';

  const isVideoAd = Boolean(activeAd?.videoUrl && activeAd.mediaType !== 'slideshow');
  const activeSlides = activeAd
    ? activeAd.slideshowImages && activeAd.slideshowImages.length > 0
      ? activeAd.slideshowImages
      : [activeAd.posterImageUrl]
    : [];

  useEffect(() => {
    setSlideIndex(0);
    setSlideshowPlaying(true);
    setCinemaOverride(null);
  }, [activeAd?.id]);

  useEffect(() => {
    if (!activeAd || isVideoAd || !slideshowPlaying || activeSlides.length <= 1) return;
    const interval = activeAd.slideIntervalMs || 3200;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [activeAd?.id, activeAd?.slideIntervalMs, isVideoAd, slideshowPlaying, activeSlides.length]);

  async function handleCountView(adId: string) {
    if (viewedIdsRef.current.has(adId)) return;
    viewedIdsRef.current.add(adId);
    try {
      const res = await recordAdView(adId);
      onAdViewed(adId, res.views);
    } catch {
      // ignore non-critical view errors
    }
  }

  function handleOpenComposer() {
    if (!user) {
      onOpenAuth();
      return;
    }
    setError('');
    setNotice('');
    setEditingAd(null);
    setComposerOpen((prev) => !prev);
  }

  function handleStartEditAd(ad: AdVideo) {
    if (!user) {
      onOpenAuth();
      return;
    }
    setError('');
    setNotice('');
    setEditingAd(ad);
    setComposerOpen(true);
  }

  async function handleDeleteAd(ad: AdVideo) {
    setError('');
    try {
      await deleteAd(ad.id);
      onAdDeleted(ad.id);
      setNotice(lang === 'rw' ? 'Ikimenyekanisha cyakuweho.' : 'Advertisement removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete advertisement.');
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return '0:15';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const currentSlideSrc =
    activeSlides[slideIndex % Math.max(1, activeSlides.length)] || activeAd?.posterImageUrl || '';

  async function handleSaveBannerCopy(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSavingBanner(true);
    try {
      const res = await adminUpdateSettings({
        adBannerTitle: draftBannerTitle.trim(),
        adBannerText: draftBannerText.trim(),
      });
      onBannerUpdated?.(res.settings.adBannerTitle || '', res.settings.adBannerText || '');
      setBannerEditorOpen(false);
      setNotice(
        lang === 'rw'
          ? 'Inyandiko ya Advertisement yavuguruwe neza.'
          : 'Advertisement text updated by Administrator.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update advertisement text.');
    } finally {
      setSavingBanner(false);
    }
  }

  return (
    <section
      id="advertising-section"
      className="border-b border-[#E7E5E4] bg-[#F5F2EB]/70"
    >
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1917] tracking-tight">
              {adBannerTitle.trim() ? adBannerTitle : 'Advertisement'}
            </h2>
            {adBannerText.trim() && (
              <p className="text-xs sm:text-sm text-[#57534E] max-w-2xl leading-relaxed">
                {adBannerText}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setBannerEditorOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#D6D3D1] text-[#1C1917] text-xs font-medium rounded-md hover:bg-[#FAF9F6] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>
                  {lang === 'rw' ? 'Andika kuri Advertisement' : 'Edit Ad Section Text'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleOpenComposer}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1C1917] text-white text-xs sm:text-sm font-medium rounded-md hover:bg-[#332E2A] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {composerOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 text-[#E5B748]" />}
                <span>
                  {composerOpen
                    ? lang === 'rw'
                      ? 'Funga Ifishi'
                      : 'Close Publisher'
                    : t.adsPostBtn}
                </span>
              </button>
            </div>
          )}
        </div>

        {isAdmin && bannerEditorOpen && (
          <form
            onSubmit={handleSaveBannerCopy}
            className="bg-white border border-[#D6D3D1] rounded-lg p-4 sm:p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                {lang === 'rw'
                  ? 'Administrator: Andika Icyo Ushaka kuri Advertisement'
                  : 'Administrator: Write Custom Advertisement Heading & Text'}
              </h3>
              <button
                type="button"
                onClick={() => setBannerEditorOpen(false)}
                className="text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                {lang === 'rw' ? 'Funga' : 'Close'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  {lang === 'rw'
                    ? 'Umutwe wa Advertisement (Siba ube blank niba ushaka "Advertisement" gusa)'
                    : 'Section Title (leave empty for "Advertisement")'}
                </label>
                <input
                  type="text"
                  value={draftBannerTitle}
                  onChange={(e) => setDraftBannerTitle(e.target.value)}
                  placeholder="Advertisement"
                  className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md text-[#1C1917]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  {lang === 'rw'
                    ? 'Ubutumwa / Inyandiko ya Admin kuri Advertisement (Optional)'
                    : 'Custom Advertisement Message (Optional)'}
                </label>
                <input
                  type="text"
                  value={draftBannerText}
                  onChange={(e) => setDraftBannerText(e.target.value)}
                  placeholder={
                    lang === 'rw'
                      ? 'Andika amatangazo cyangwa ibyerekeye ibyo wamamaza...'
                      : 'Write any promotional notice you want shown under Advertisement...'
                  }
                  className="w-full px-3 py-2 text-sm border border-[#D6D3D1] rounded-md text-[#1C1917]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={savingBanner}
                className="px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 cursor-pointer"
              >
                {savingBanner
                  ? '...'
                  : lang === 'rw'
                  ? 'Bika Inyandiko ya Admin'
                  : 'Save Advertisement Text'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-emerald-700 hover:underline cursor-pointer shrink-0"
            >
              OK
            </button>
          </div>
        )}

        {composerOpen && (
          <AdEditorForm
            key={editingAd?.id || 'new-ad'}
            lang={lang}
            products={products}
            editingAd={editingAd}
            isAdmin={user?.role === 'admin'}
            defaultWorkshopName={user?.workshopName || user?.name || 'JOKEVE FURNITURE'}
            onCancel={() => {
              setComposerOpen(false);
              setEditingAd(null);
            }}
            onSaved={(saved, isNew) => {
              if (isNew) {
                onAdCreated(saved);
                setNotice(
                  lang === 'rw'
                    ? 'Ikimenyekanisha cyashyizwe ku rubuga neza.'
                    : 'Advertisement published live.'
                );
              } else {
                onAdUpdated?.(saved);
                setNotice(
                  lang === 'rw'
                    ? 'Impinduka zose ku kimenyekanisha zabitswe.'
                    : 'All advertisement updates saved.'
                );
              }
              setSelectedAdId(saved.id);
              setEditingAd(null);
              setComposerOpen(false);
            }}
          />
        )}

        {/* Main Cinema Player + Playlist Stage (switches between 7/5 split and Full-Width Big Video) */}
        {activeAd ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Active Video or Animated Photo Reel Viewport */}
            <div
              className={`${
                isBigDisplay ? 'lg:col-span-12' : 'lg:col-span-7'
              } bg-[#141210] rounded-lg overflow-hidden border border-[#292524] flex flex-col transition-all`}
            >
              <div
                className={`relative aspect-video w-full bg-black overflow-hidden ${
                  isBigDisplay ? 'max-h-[640px]' : ''
                }`}
              >
                {isVideoAd && activeAd.videoUrl ? (
                  <video
                    key={activeAd.id}
                    src={activeAd.videoUrl}
                    poster={activeAd.posterImageUrl}
                    controls
                    playsInline
                    loop
                    onPlay={() => handleCountView(activeAd.id)}
                    className={`w-full h-full bg-black ${
                      isBigDisplay ? 'object-contain' : 'object-cover'
                    }`}
                  />
                ) : (
                  <div
                    onClick={() => handleCountView(activeAd.id)}
                    className="relative w-full h-full overflow-hidden cursor-pointer select-none"
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={`${activeAd.id}-${slideIndex}`}
                        src={currentSlideSrc}
                        alt={activeAd.title}
                        referrerPolicy="no-referrer"
                        initial={{ opacity: 0.25, scale: 1.02, x: slideIndex % 2 === 0 ? -8 : 8 }}
                        animate={{ opacity: 1, scale: 1.09, x: 0 }}
                        exit={{ opacity: 0.15 }}
                        transition={{
                          opacity: { duration: 0.55 },
                          scale: {
                            duration: (activeAd.slideIntervalMs || 3200) / 1000,
                            ease: 'easeInOut',
                          },
                          x: {
                            duration: (activeAd.slideIntervalMs || 3200) / 1000,
                            ease: 'easeOut',
                          },
                        }}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none" />

                    {/* Slide Progress Bar Strip */}
                    {activeSlides.length > 1 && (
                      <div className="absolute top-3 left-4 right-4 flex items-center gap-1.5 z-10">
                        {activeSlides.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            aria-label={`Show slide ${idx + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSlideIndex(idx);
                            }}
                            className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden cursor-pointer"
                          >
                            <span
                              className={`block h-full transition-all duration-300 ${
                                idx === slideIndex % activeSlides.length
                                  ? 'w-full bg-[#E5B748]'
                                  : idx < slideIndex % activeSlides.length
                                  ? 'w-full bg-white/80'
                                  : 'w-0'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bottom Overlay Caption & Playback Controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 z-10">
                      <div className="space-y-1 max-w-lg">
                        <p className="text-xs font-medium text-[#E5B748]">
                          {activeAd.workshopName}
                        </p>
                        <h3 className="font-display text-xl sm:text-2xl font-medium text-white leading-snug">
                          {activeAd.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeSlides.length > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Previous slide"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSlideIndex(
                                  (prev) => (prev - 1 + activeSlides.length) % activeSlides.length
                                );
                              }}
                              className="p-1.5 rounded-full bg-black/65 text-white hover:bg-black/85 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={slideshowPlaying ? 'Pause animation' : 'Play animation'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSlideshowPlaying((p) => !p);
                              }}
                              className="p-1.5 rounded-full bg-black/65 text-white hover:bg-black/85 cursor-pointer"
                            >
                              {slideshowPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label="Next slide"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSlideIndex((prev) => (prev + 1) % activeSlides.length);
                              }}
                              className="p-1.5 rounded-full bg-black/65 text-white hover:bg-black/85 cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Ad Caption & Action Footer */}
              <div className="p-4 sm:p-5 bg-[#181512] text-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#292524]">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                    <span className="font-medium text-[#E5B748]">{activeAd.workshopName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Eye className="w-3.5 h-3.5" />
                      {activeAd.views} {lang === 'rw' ? 'barebye' : 'views'}
                    </span>
                    {isVideoAd && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatDuration(activeAd.durationSec)}
                        </span>
                      </>
                    )}
                    {activeAd.appUrl && activeAd.appName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <Smartphone className="w-3 h-3" />
                          <span>{activeAd.appName}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-medium text-white truncate">{activeAd.title}</h3>
                  <p className="text-xs text-stone-300 line-clamp-2">{activeAd.caption}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeAd.appUrl && (
                    <a
                      href={activeAd.appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCountView(activeAd.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#E5B748] text-[#1C1917] text-xs font-semibold rounded-md hover:bg-[#D4A437] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {activeAd.appName
                          ? lang === 'rw'
                            ? `Kuramo ${activeAd.appName}`
                            : `Download ${activeAd.appName}`
                          : activeAd.ctaLabel || (lang === 'rw' ? 'Kuramo App' : 'Download App')}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  )}
                  {linkedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCountView(activeAd.id);
                        onSelectProduct(linkedProduct);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C4D25] text-white text-xs font-medium rounded-md hover:bg-[#935C2E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{activeAd.ctaLabel || t.viewAndChat}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCinemaOverride(!isBigDisplay)}
                    title={
                      isBigDisplay
                        ? lang === 'rw'
                          ? 'Subiza mu ngano isanzwe'
                          : 'Switch to standard size'
                        : lang === 'rw'
                        ? 'Agura video ibe nini cyane'
                        : 'Expand to Big Screen'
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-200 border border-stone-700 bg-stone-800/80 rounded-md hover:bg-stone-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isBigDisplay ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>{lang === 'rw' ? 'Ntoya' : 'Standard'}</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-[#E5B748]" />
                        <span>{lang === 'rw' ? 'Video Nini' : 'Big Screen'}</span>
                      </>
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleStartEditAd(activeAd)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-stone-200 border border-stone-700 bg-stone-800/80 rounded-md hover:bg-stone-700 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{lang === 'rw' ? 'Hindura Inyandiko' : 'Edit'}</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAd(activeAd)}
                      title={lang === 'rw' ? 'Siba' : 'Delete Ad'}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-300 border border-red-900/60 bg-red-950/40 rounded-md hover:bg-red-900/50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'rw' ? 'Siba' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Playlist Queue (right column in Standard view, horizontal multi-card grid in Big Screen view) */}
            <div
              className={`${
                isBigDisplay ? 'lg:col-span-12' : 'lg:col-span-5'
              } bg-white border border-[#E7E5E4] rounded-lg flex flex-col overflow-hidden`}
            >
              <div className="px-4 py-3.5 border-b border-[#E7E5E4] flex items-center justify-between gap-2 bg-[#FAF9F6]">
                <h3 className="text-sm font-medium text-[#1C1917]">
                  {lang === 'rw' ? 'Urutonde rw’Ibyamamaza' : 'Advertising Queue'}
                </h3>
                <span className="text-xs font-mono tabular-nums text-[#57534E]">
                  {ads.length} {lang === 'rw' ? 'byamamaza' : 'reels'}
                </span>
              </div>

              <div
                className={
                  isBigDisplay
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E7E5E4]'
                    : 'flex-1 divide-y divide-[#E7E5E4] max-h-[380px] overflow-y-auto'
                }
              >
                {ads.map((ad) => {
                  const isSelected = ad.id === activeAd.id;
                  return (
                    <div
                      key={ad.id}
                      onClick={() => {
                        setSelectedAdId(ad.id);
                        handleCountView(ad.id);
                      }}
                      className={`p-3.5 flex items-start gap-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#F5F2EB] ring-1 ring-inset ring-[#7C4D25]'
                          : 'bg-white hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="relative w-28 h-16 rounded overflow-hidden bg-stone-900 shrink-0">
                        <img
                          src={ad.posterImageUrl}
                          alt={ad.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-mono tabular-nums bg-black/75 text-white rounded inline-flex items-center gap-1">
                          {ad.videoUrl && ad.mediaType !== 'slideshow' ? (
                            formatDuration(ad.durationSec)
                          ) : (
                            <Images className="w-3 h-3" />
                          )}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-[#1C1917] line-clamp-1">{ad.title}</p>
                        <p className="text-xs text-[#57534E] line-clamp-1">{ad.caption}</p>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#78716C]">
                          <span className="truncate">
                            {ad.workshopName} · <span className="tabular-nums">{ad.views}</span> views
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-2.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditAd(ad);
                                }}
                                className="text-[#7C4D25] font-medium hover:underline cursor-pointer"
                              >
                                {lang === 'rw' ? 'Hindura' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAd(ad);
                                }}
                                className="text-red-600 hover:underline cursor-pointer"
                              >
                                {lang === 'rw' ? 'Siba' : 'Remove'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white border border-[#E7E5E4] rounded-lg text-center space-y-3">
            <Film className="w-7 h-7 mx-auto text-[#7C4D25]" />
            <p className="text-sm text-[#57534E]">
              {lang === 'rw'
                ? 'Nta kimenyekanisha kirahari. Kanda "Shyiraho Video / Amafoto Yamamaza" utangire!'
                : 'No advertisements active yet. Click Post Ad to publish a video or animated photo reel!'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
