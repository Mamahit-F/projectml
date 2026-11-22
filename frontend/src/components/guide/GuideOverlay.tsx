import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  Map,
  Search,
  Sparkles,
  ArrowRight,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { useGuide } from '../../contexts/GuideContext';
import { GLOSSARY_ITEMS, GUIDE_STEPS, QUICK_WORKFLOW, type TooltipPlacement } from '../../data/guideContent';
import { Badge, Button } from '../ui';

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PAD = 8;
const POPOVER_GAP = 16;
const VIEWPORT_MARGIN = 16;

/* ===================== 1. FIRST-TIME WELCOME HINT BANNER ===================== */
export const GuideWelcomeBanner: React.FC = () => {
  const { showFirstTimeBanner, isGuideActive, openGuide, dismissFirstTimeBanner } = useGuide();

  if (!showFirstTimeBanner || isGuideActive) return null;

  return (
    <div className="mb-5 bg-obsidian text-white rounded-3xl p-4 sm:p-5 shadow-soft border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-coral-gradient opacity-20 blur-2xl pointer-events-none" />
      <div className="relative z-10 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-coral-gradient text-white flex items-center justify-center shrink-0 shadow-coral">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-coral-200">
            Baru Menggunakan StudentInsight?
          </span>
          <h2 className="text-sm sm:text-base font-extrabold mt-1">
            Mulai Panduan Interaktif langsung di setiap tombol & menu layar Anda
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Layar akan menyorot elemen penting satu per satu beserta penjelasan praktisnya. Anda bisa membatalkan kapan saja dengan tombol Batal atau Esc.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
        <Button
          variant="coral"
          size="sm"
          icon={<Compass className="w-3.5 h-3.5" />}
          onClick={() => openGuide('tour', 0)}
        >
          Mulai Panduan Interaktif
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<BookOpen className="w-3.5 h-3.5" />}
          onClick={() => openGuide('handbook')}
        >
          Buku Panduan
        </Button>
        <button
          type="button"
          onClick={dismissFirstTimeBanner}
          className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
        >
          Nanti Saja
        </button>
      </div>
    </div>
  );
};

/* ===================== 2. FLOATING QUICK ACCESS BUTTON ===================== */
export const GuideFloatingButton: React.FC = () => {
  const { isGuideActive, openGuideForCurrentPage, openGuide } = useGuide();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isGuideActive) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {menuOpen && (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-2xl p-2 w-64 space-y-1">
          <div className="px-3 py-2 border-b border-[#F0F1F4]">
            <p className="text-xs font-extrabold text-obsidian">Akses Bebas Mode Panduan</p>
            <p className="text-[10px] text-slate-400">Sorot & pelajari fitur secara langsung</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openGuideForCurrentPage();
            }}
            className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#F4F5F7] transition flex items-start gap-2.5"
          >
            <Compass className="w-4 h-4 text-coral-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-obsidian">Pandu Halaman Ini</p>
              <p className="text-[10px] text-slate-400">Sorot fitur pada halaman yang sedang dibuka</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openGuide('tour', 0);
            }}
            className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#F4F5F7] transition flex items-start gap-2.5"
          >
            <Sparkles className="w-4 h-4 text-obsidian shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-obsidian">Tur Lengkap ({GUIDE_STEPS.length} Langkah)</p>
              <p className="text-[10px] text-slate-400">Sorot semua menu & tombol penting dari awal</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openGuide('handbook');
            }}
            className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#F4F5F7] transition flex items-start gap-2.5"
          >
            <BookOpen className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-obsidian">Buku Panduan & Glosarium</p>
              <p className="text-[10px] text-slate-400">Alur kerja 4 langkah + kamus istilah ML</p>
            </div>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-obsidian text-white hover:bg-obsidian-hover shadow-soft border border-white/10 text-xs font-bold transition"
      >
        <span className="w-5 h-5 rounded-full bg-coral-gradient flex items-center justify-center">
          <HelpCircle className="w-3.5 h-3.5 text-white" />
        </span>
        <span>Mode Panduan</span>
      </button>
    </div>
  );
};

/* ===================== 3. SPOTLIGHT + ANCHORED POPOVER ENGINE ===================== */
export const GuideOverlay: React.FC = () => {
  const {
    isGuideActive,
    viewMode,
    currentStepIndex,
    currentStep,
    totalSteps,
    setViewMode,
    cancelGuide,
    nextStep,
    prevStep,
    goToStep,
  } = useGuide();

  const [handbookTab, setHandbookTab] = useState<'workflow' | 'modules' | 'glossary'>('workflow');
  const [glossarySearch, setGlossarySearch] = useState('');

  // Live measured spotlight bounding box & tooltip layout
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverSize, setPopoverSize] = useState({ w: 380, h: 320 });
  const scrolledStepRef = useRef<string>('');

  // Locate and track the target element in real DOM (retries briefly after route transitions / async loads)
  useEffect(() => {
    if (!isGuideActive || viewMode !== 'tour') {
      setTargetBox(null);
      return;
    }

    let rafId = 0;
    let pollTimer: number | undefined;
    let attempts = 0;

    const findElement = (): HTMLElement | null => {
      const primary = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (primary && primary.getBoundingClientRect().width > 0 && primary.getBoundingClientRect().height > 0) {
        return primary;
      }
      // Fallback to matching sidebar nav item when page content is still loading
      const fallbackNav = document.querySelector(`[data-guide-id="${currentStep.route}"]`) as HTMLElement | null;
      if (fallbackNav && fallbackNav.getBoundingClientRect().width > 0) {
        return fallbackNav;
      }
      return null;
    };

    const measure = (shouldScroll = false) => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const el = findElement();
      if (!el) {
        setTargetBox(null);
        return false;
      }

      if (shouldScroll && scrolledStepRef.current !== currentStep.id) {
        scrolledStepRef.current = currentStep.id;
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }

      const r = el.getBoundingClientRect();
      // Clamp oversized targets gently so popover still has breathing space
      const clampedH = Math.min(r.height, window.innerHeight - 160);
      setTargetBox({
        top: Math.max(8, r.top - SPOTLIGHT_PAD),
        left: Math.max(8, r.left - SPOTLIGHT_PAD),
        width: Math.min(window.innerWidth - 16, r.width + SPOTLIGHT_PAD * 2),
        height: Math.max(36, clampedH + SPOTLIGHT_PAD * 2),
      });
      return true;
    };

    // Initial locate + short polling while route/data finishes rendering
    scrolledStepRef.current = '';
    const tickLocate = () => {
      const found = measure(true);
      attempts += 1;
      // Keep refreshing for ~1.5s to follow smooth scrolling and async API render
      if (attempts < 15 || !found) {
        pollTimer = window.setTimeout(tickLocate, 120);
      }
    };
    tickLocate();

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => measure(false));
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isGuideActive, viewMode, currentStep]);

  // Measure actual rendered popover size for exact caret alignment
  useLayoutEffect(() => {
    if (popoverRef.current) {
      const r = popoverRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setPopoverSize({ w: r.width, h: r.height });
      }
    }
  }, [currentStepIndex, isGuideActive, viewMode, targetBox]);

  if (!isGuideActive) return null;

  const nextStepObj = currentStepIndex + 1 < totalSteps ? GUIDE_STEPS[currentStepIndex + 1] : null;

  // Compute smart anchored popover position + triangular pointer placement
  const computePopoverLayout = (): {
    style: React.CSSProperties;
    placement: TooltipPlacement | 'center';
    arrowStyle?: React.CSSProperties;
  } => {
    const pw = Math.min(390, viewport.w - VIEWPORT_MARGIN * 2);
    const ph = popoverSize.h || 300;
    const topBarReserve = 66;

    if (!targetBox || viewport.w < 640) {
      // Mobile or fallback when element not found: clean centered/bottom anchored card
      return {
        placement: 'center',
        style: {
          width: pw,
          left: Math.max(VIEWPORT_MARGIN, (viewport.w - pw) / 2),
          bottom: VIEWPORT_MARGIN,
        },
      };
    }

    const spaceRight = viewport.w - (targetBox.left + targetBox.width) - VIEWPORT_MARGIN;
    const spaceLeft = targetBox.left - VIEWPORT_MARGIN;
    const spaceBottom = viewport.h - (targetBox.top + targetBox.height) - VIEWPORT_MARGIN;
    const spaceTop = targetBox.top - topBarReserve;

    const fits: Record<TooltipPlacement, boolean> = {
      right: spaceRight >= pw + POPOVER_GAP,
      left: spaceLeft >= pw + POPOVER_GAP,
      bottom: spaceBottom >= ph + POPOVER_GAP,
      top: spaceTop >= ph + POPOVER_GAP,
    };

    const prefOrder: TooltipPlacement[] = [
      currentStep.preferredPlacement || 'bottom',
      'bottom',
      'right',
      'top',
      'left',
    ];
    const chosen: TooltipPlacement =
      prefOrder.find((p) => fits[p]) ||
      (spaceBottom >= spaceTop ? (spaceRight >= pw + 8 ? 'right' : 'bottom') : 'top');

    const targetCenterX = targetBox.left + targetBox.width / 2;
    const targetCenterY = targetBox.top + targetBox.height / 2;

    if (chosen === 'bottom') {
      const left = Math.min(
        viewport.w - pw - VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, targetCenterX - pw / 2)
      );
      const top = Math.min(viewport.h - ph - VIEWPORT_MARGIN, targetBox.top + targetBox.height + POPOVER_GAP);
      const arrowLeft = Math.min(pw - 28, Math.max(20, targetCenterX - left - 8));
      return {
        placement: 'bottom',
        style: { width: pw, top, left },
        arrowStyle: { left: arrowLeft, top: -8 },
      };
    }

    if (chosen === 'top') {
      const left = Math.min(
        viewport.w - pw - VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, targetCenterX - pw / 2)
      );
      const top = Math.max(topBarReserve, targetBox.top - ph - POPOVER_GAP);
      const arrowLeft = Math.min(pw - 28, Math.max(20, targetCenterX - left - 8));
      return {
        placement: 'top',
        style: { width: pw, top, left },
        arrowStyle: { left: arrowLeft, bottom: -8 },
      };
    }

    if (chosen === 'right') {
      const left = Math.min(viewport.w - pw - VIEWPORT_MARGIN, targetBox.left + targetBox.width + POPOVER_GAP);
      const top = Math.min(
        viewport.h - ph - VIEWPORT_MARGIN,
        Math.max(topBarReserve, targetCenterY - ph / 2)
      );
      const arrowTop = Math.min(ph - 32, Math.max(22, targetCenterY - top - 8));
      return {
        placement: 'right',
        style: { width: pw, top, left },
        arrowStyle: { top: arrowTop, left: -8 },
      };
    }

    // left
    const left = Math.max(VIEWPORT_MARGIN, targetBox.left - pw - POPOVER_GAP);
    const top = Math.min(
      viewport.h - ph - VIEWPORT_MARGIN,
      Math.max(topBarReserve, targetCenterY - ph / 2)
    );
    const arrowTop = Math.min(ph - 32, Math.max(22, targetCenterY - top - 8));
    return {
      placement: 'left',
      style: { width: pw, top, left },
      arrowStyle: { top: arrowTop, right: -8 },
    };
  };

  const popLayout = computePopoverLayout();

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    if (!glossarySearch.trim()) return true;
    const q = glossarySearch.toLowerCase();
    return (
      item.term.toLowerCase().includes(q) ||
      item.explanation.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Compact Top Floating Control Bar — always provides free mode switch & instant Cancel */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-2xl">
        <div className="bg-obsidian/95 backdrop-blur-md text-white rounded-full px-3 py-1.5 shadow-2xl border border-white/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-6 h-6 rounded-full bg-coral-gradient flex items-center justify-center shrink-0">
              <Compass className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="text-xs font-extrabold">Mode Panduan</span>
            {viewMode === 'tour' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-coral-200 tabular-nums">
                {currentStepIndex + 1} dari {totalSteps}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 rounded-full p-0.5 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('tour')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  viewMode === 'tour' ? 'bg-white text-obsidian' : 'text-slate-200 hover:text-white'
                }`}
              >
                Tur Sorot
              </button>
              <button
                type="button"
                onClick={() => setViewMode('handbook')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  viewMode === 'handbook' ? 'bg-white text-obsidian' : 'text-slate-200 hover:text-white'
                }`}
              >
                Semua Bab & Glosarium
              </button>
            </div>

            <button
              type="button"
              onClick={cancelGuide}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Batalkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MODE A: TRUE SPOTLIGHT CUTOUT + ANCHORED TOOLTIP ==================== */}
      {viewMode === 'tour' && (
        <>
          {/* Dimmed Full-Screen SVG Mask with Crisp Cutout Hole around Target Element */}
          <div className="fixed inset-0 z-[55] pointer-events-auto" onClick={cancelGuide} aria-hidden="true">
            <svg className="w-full h-full block" width={viewport.w} height={viewport.h}>
              <defs>
                <mask id="si-guide-spotlight-mask">
                  <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
                  {targetBox && (
                    <rect
                      x={targetBox.left}
                      y={targetBox.top}
                      width={targetBox.width}
                      height={targetBox.height}
                      rx="18"
                      ry="18"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width={viewport.w}
                height={viewport.h}
                fill="rgba(15, 23, 42, 0.56)"
                mask="url(#si-guide-spotlight-mask)"
              />
            </svg>
          </div>

          {/* Crisp Glowing Spotlight Frame Ring around Target Element (UserGuiding / Supademo style) */}
          {targetBox && (
            <div
              className="fixed z-[58] pointer-events-none rounded-[18px] transition-all duration-300 ease-out"
              style={{
                top: targetBox.top,
                left: targetBox.left,
                width: targetBox.width,
                height: targetBox.height,
                border: '2.5px solid #F55B2A',
                boxShadow: '0 0 0 5px rgba(245, 91, 42, 0.22), 0 10px 30px -6px rgba(245, 91, 42, 0.35)',
              }}
            />
          )}

          {/* Anchored Tooltip Popover with Triangular Arrow Caret */}
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={currentStep.title}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[65] bg-white rounded-2xl shadow-2xl border border-[#E6E8EE] transition-all duration-300 ease-out"
            style={popLayout.style}
          >
            {/* Triangular Caret Arrow Pointing Directly at Highlighted Element */}
            {popLayout.placement !== 'center' && popLayout.arrowStyle && (
              <div
                className="w-4 h-4 rotate-45 absolute pointer-events-none"
                style={{
                  ...popLayout.arrowStyle,
                  backgroundColor: popLayout.placement === 'bottom' ? '#161618' : '#FFFFFF',
                  borderLeft: popLayout.placement === 'right' ? '1px solid #E6E8EE' : undefined,
                  borderBottom:
                    popLayout.placement === 'right' || popLayout.placement === 'top'
                      ? '1px solid #E6E8EE'
                      : undefined,
                  borderRight:
                    popLayout.placement === 'left' || popLayout.placement === 'top'
                      ? '1px solid #E6E8EE'
                      : undefined,
                  borderTop: popLayout.placement === 'left' ? '1px solid #E6E8EE' : undefined,
                }}
              />
            )}

            {/* Colored Header Bar (Exact UserGuiding / HubSpot style: Title + X Cancel Button) */}
            <div className="bg-obsidian text-white px-4 py-3 rounded-t-2xl flex items-center justify-between gap-3 relative z-10">
              <div className="min-w-0">
                <h3 className="text-[13px] font-extrabold leading-snug truncate">{currentStep.title}</h3>
              </div>
              <button
                type="button"
                onClick={cancelGuide}
                title="Batalkan Mode Panduan (Esc)"
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center shrink-0 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-xs relative z-10 bg-white rounded-b-2xl">
              {/* Step Counter + Quick Jump Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-coral-600 tabular-nums">
                  {currentStepIndex + 1} dari {totalSteps}
                </span>
                <select
                  value={currentStepIndex}
                  onChange={(e) => goToStep(Number(e.target.value))}
                  aria-label="Lompat ke bab panduan"
                  className="text-[11px] font-semibold text-slate-600 bg-[#F4F5F7] hover:bg-[#ECEEF2] rounded-full px-2.5 py-1 focus:outline-none max-w-[210px] truncate cursor-pointer"
                >
                  {GUIDE_STEPS.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {idx + 1}. {s.shortTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concise Explanation */}
              <p className="text-slate-600 leading-relaxed">{currentStep.summary}</p>

              {/* Bold Action Instruction (UserGuiding style bold cue) */}
              <p className="text-obsidian font-bold leading-relaxed">{currentStep.callToAction}</p>

              {/* Compact Practical Bullet Tips */}
              {currentStep.actionSteps.length > 0 && (
                <ul className="space-y-1.5 bg-[#F8F9FB] rounded-xl p-2.5 border border-[#EEF0F4] text-[11px] text-slate-600">
                  {currentStep.actionSteps.map((st, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-coral-500 shrink-0 mt-1.5" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Subtle Tip */}
              <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-xl px-2.5 py-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{currentStep.proTip}</span>
              </div>

              {/* Footer Controls: Cancel + Prev/Next (Supademo arrows + UserGuiding "Lanjut: ...") */}
              <div className="pt-2 border-t border-[#F0F1F4] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={cancelGuide}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition px-1.5 py-1"
                >
                  Batalkan
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentStepIndex === 0}
                    onClick={prevStep}
                    title="Langkah Sebelumnya"
                    className="w-8 h-8 rounded-xl bg-[#F4F5F7] hover:bg-[#E6E8EE] disabled:opacity-35 disabled:cursor-not-allowed text-obsidian flex items-center justify-center transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-coral-gradient hover:opacity-95 text-white text-[11px] font-bold shadow-coral transition max-w-[210px]"
                  >
                    <span className="truncate">
                      {nextStepObj ? `Lanjut: ${nextStepObj.shortTitle}` : 'Selesai Panduan'}
                    </span>
                    {nextStepObj ? (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== MODE B: COMPLETE HANDBOOK MODAL ==================== */}
      {viewMode === 'handbook' && (
        <div
          className="fixed inset-0 z-[60] bg-obsidian/50 backdrop-blur-xs flex items-center justify-center p-4 pt-20"
          onClick={cancelGuide}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-4xl max-h-[82vh] rounded-3xl shadow-2xl border border-[#ECEEF2] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#F0F1F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-obsidian flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-coral-500" />
                  Buku Panduan Lengkap StudentInsight
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih langkah mana saja untuk langsung menyorot tombol & menu aslinya di layar.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-[#F4F5F7] rounded-full p-1 self-start">
                {[
                  { key: 'workflow', label: 'Mulai Cepat', icon: Map },
                  { key: 'modules', label: `Semua Langkah (${GUIDE_STEPS.length})`, icon: Compass },
                  { key: 'glossary', label: 'Glosarium', icon: HelpCircle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setHandbookTab(tab.key as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        handbookTab === tab.key
                          ? 'bg-obsidian text-white shadow-sm'
                          : 'text-slate-600 hover:text-obsidian'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {handbookTab === 'workflow' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {QUICK_WORKFLOW.map((item) => (
                    <div
                      key={item.order}
                      className="rounded-3xl border border-[#ECEEF2] bg-white p-5 shadow-card flex flex-col justify-between gap-4 hover:border-coral-300 transition"
                    >
                      <div>
                        <Badge color="coral">{item.order}</Badge>
                        <h3 className="text-sm font-extrabold text-obsidian mt-2.5">{item.title}</h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.description}</p>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => goToStep(item.stepIndex)}
                        >
                          Sorot & Pandu Langkah Ini
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {handbookTab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {GUIDE_STEPS.map((s, idx) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-[#ECEEF2] bg-[#FAFBFD] p-4 flex flex-col justify-between gap-3 hover:border-coral-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge color="slate">Langkah {idx + 1}</Badge>
                          <span className="text-[10px] font-bold text-coral-600">{s.badge}</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-obsidian mt-2">{s.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{s.summary}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#EEF0F4]">
                        <span className="text-[10px] font-mono text-slate-400">{s.route}</span>
                        <button
                          type="button"
                          onClick={() => goToStep(idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-coral-600 hover:text-coral-700"
                        >
                          <span>Sorot di Layar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {handbookTab === 'glossary' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={glossarySearch}
                      onChange={(e) => setGlossarySearch(e.target.value)}
                      placeholder="Cari istilah (mis. Poin Sabat, Macro F1, Silhouette, Kontinuitas)..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredGlossary.map((g) => (
                      <div key={g.term} className="rounded-2xl border border-[#ECEEF2] bg-[#FAFBFD] p-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-extrabold text-obsidian">{g.term}</h4>
                          <Badge
                            color={
                              g.category === 'Machine Learning'
                                ? 'coral'
                                : g.category === 'Data & Kontinuitas'
                                ? 'blue'
                                : 'slate'
                            }
                          >
                            {g.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{g.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-[#FAFBFD] border-t border-[#F0F1F4] flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="coral"
                icon={<Compass className="w-3.5 h-3.5" />}
                onClick={() => goToStep(0)}
              >
                Mulai Tur Sorot dari Langkah 1
              </Button>
              <Button size="sm" variant="secondary" onClick={cancelGuide}>
                Batalkan & Keluar Panduan
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
