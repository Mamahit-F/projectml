import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GUIDE_STEPS, type GuideStep } from '../data/guideContent';

export type GuideViewMode = 'tour' | 'handbook';

interface GuideContextValue {
  isGuideActive: boolean;
  viewMode: GuideViewMode;
  currentStepIndex: number;
  currentStep: GuideStep;
  totalSteps: number;
  showFirstTimeBanner: boolean;
  openGuide: (mode?: GuideViewMode, stepIndex?: number) => void;
  openGuideForCurrentPage: () => void;
  cancelGuide: () => void;
  setViewMode: (mode: GuideViewMode) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  dismissFirstTimeBanner: () => void;
}

const STORAGE_SEEN_KEY = 'si_guide_welcome_seen_v1';

const GuideContext = createContext<GuideContextValue | null>(null);

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isGuideActive, setIsGuideActive] = useState(false);
  const [viewMode, setViewMode] = useState<GuideViewMode>('tour');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showFirstTimeBanner, setShowFirstTimeBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_SEEN_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const markSeen = useCallback(() => {
    setShowFirstTimeBanner(false);
    try {
      localStorage.setItem(STORAGE_SEEN_KEY, 'true');
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const navigateForStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(GUIDE_STEPS.length - 1, index));
      const target = GUIDE_STEPS[clamped];
      if (target && location.pathname !== target.route) {
        navigate(target.route);
      }
      setCurrentStepIndex(clamped);
    },
    [location.pathname, navigate]
  );

  const openGuide = useCallback(
    (mode: GuideViewMode = 'tour', stepIndex?: number) => {
      markSeen();
      setViewMode(mode);
      setIsGuideActive(true);
      if (typeof stepIndex === 'number') {
        navigateForStep(stepIndex);
      } else if (mode === 'tour') {
        navigateForStep(0);
      }
    },
    [markSeen, navigateForStep]
  );

  const openGuideForCurrentPage = useCallback(() => {
    markSeen();
    const matchedIdx = GUIDE_STEPS.findIndex(
      (s, i) => i > 0 && (location.pathname === s.route || location.pathname.startsWith(s.route + '/'))
    );
    const targetIdx = matchedIdx >= 0 ? matchedIdx : 0;
    setViewMode('tour');
    setIsGuideActive(true);
    setCurrentStepIndex(targetIdx);
  }, [location.pathname, markSeen]);

  const cancelGuide = useCallback(() => {
    markSeen();
    setIsGuideActive(false);
  }, [markSeen]);

  const goToStep = useCallback(
    (index: number) => {
      setViewMode('tour');
      setIsGuideActive(true);
      navigateForStep(index);
    },
    [navigateForStep]
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex + 1 >= GUIDE_STEPS.length) {
      cancelGuide();
      return;
    }
    navigateForStep(currentStepIndex + 1);
  }, [cancelGuide, currentStepIndex, navigateForStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      navigateForStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, navigateForStep]);

  // Allow instant exit via Escape key whenever Guide Mode is active
  useEffect(() => {
    if (!isGuideActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelGuide();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelGuide, isGuideActive]);

  const value = useMemo<GuideContextValue>(
    () => ({
      isGuideActive,
      viewMode,
      currentStepIndex,
      currentStep: GUIDE_STEPS[currentStepIndex] || GUIDE_STEPS[0],
      totalSteps: GUIDE_STEPS.length,
      showFirstTimeBanner,
      openGuide,
      openGuideForCurrentPage,
      cancelGuide,
      setViewMode,
      nextStep,
      prevStep,
      goToStep,
      dismissFirstTimeBanner: markSeen,
    }),
    [
      isGuideActive,
      viewMode,
      currentStepIndex,
      showFirstTimeBanner,
      openGuide,
      openGuideForCurrentPage,
      cancelGuide,
      nextStep,
      prevStep,
      goToStep,
      markSeen,
    ]
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
};

export const useGuide = (): GuideContextValue => {
  const ctx = useContext(GuideContext);
  if (!ctx) {
    throw new Error('useGuide must be used inside GuideProvider');
  }
  return ctx;
};
