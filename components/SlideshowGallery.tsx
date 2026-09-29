"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import Img from "@/components/Img";
import styles from "./SlideshowGallery.module.css";

export interface GallerySlide {
  id: string;
  image: string;
  width: number;
  height: number;
  kickerKey: string;
  locationKey: string;
  tagKey: string;
  titleKey: string;
  descKey: string;
}

const SLIDES: GallerySlide[] = [
  {
    id: "cohort",
    image: "/assets/abcn/real/abcn-flagship-cohort.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.cohort.kicker",
    locationKey: "slides.cohort.location",
    tagKey: "slides.cohort.tag",
    titleKey: "slides.cohort.title",
    descKey: "slides.cohort.desc",
  },
  {
    id: "keynote",
    image: "/assets/abcn/real/executive-keynote-session.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.keynote.kicker",
    locationKey: "slides.keynote.location",
    tagKey: "slides.keynote.tag",
    titleKey: "slides.keynote.title",
    descKey: "slides.keynote.desc",
  },
  {
    id: "pitch",
    image: "/assets/abcn/real/startup-pitch-showcase.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.pitch.kicker",
    locationKey: "slides.pitch.location",
    tagKey: "slides.pitch.tag",
    titleKey: "slides.pitch.title",
    descKey: "slides.pitch.desc",
  },
  {
    id: "rooftop",
    image: "/assets/abcn/real/frankfurt-rooftop-cohort.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.rooftop.kicker",
    locationKey: "slides.rooftop.location",
    tagKey: "slides.rooftop.tag",
    titleKey: "slides.rooftop.title",
    descKey: "slides.rooftop.desc",
  },
  {
    id: "femaleLeaders",
    image: "/assets/abcn/real/female-founders-summit-lineup.jpg",
    width: 1536,
    height: 2048,
    kickerKey: "slides.femaleLeaders.kicker",
    locationKey: "slides.femaleLeaders.location",
    tagKey: "slides.femaleLeaders.tag",
    titleKey: "slides.femaleLeaders.title",
    descKey: "slides.femaleLeaders.desc",
  },
  {
    id: "workshop",
    image: "/assets/abcn/real/interactive-workshop-session.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.workshop.kicker",
    locationKey: "slides.workshop.location",
    tagKey: "slides.workshop.tag",
    titleKey: "slides.workshop.title",
    descKey: "slides.workshop.desc",
  },
  {
    id: "reception",
    image: "/assets/abcn/real/strategic-networking-reception.jpg",
    width: 2304,
    height: 1536,
    kickerKey: "slides.reception.kicker",
    locationKey: "slides.reception.location",
    tagKey: "slides.reception.tag",
    titleKey: "slides.reception.title",
    descKey: "slides.reception.desc",
  },
  {
    id: "policy",
    image: "/assets/abcn/real/frankfurt-policy-roundtable.jpg",
    width: 1536,
    height: 2048,
    kickerKey: "slides.policy.kicker",
    locationKey: "slides.policy.location",
    tagKey: "slides.policy.tag",
    titleKey: "slides.policy.title",
    descKey: "slides.policy.desc",
  },
];

const AUTOPLAY_INTERVAL = 6500; // 6.5s per slide

export default function SlideshowGallery() {
  const t = useTranslations("gallery");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const totalSlides = SLIDES.length;
  const currentSlide = SLIDES[currentIndex];

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex((index + totalSlides) % totalSlides);
    setProgress(0);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  // Autoplay and progress timer
  useEffect(() => {
    if (!isPlaying || isLightboxOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const startTime = Date.now();
    setProgress(0);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / AUTOPLAY_INTERVAL) * 100);
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPlaying, isLightboxOpen, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape" && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isLightboxOpen]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <section className={styles.gallerySection} id="gallery" aria-label={t("title")}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.pill}>
            <span className={styles.pillDot} />
            <span>{t("pill")}</span>
          </div>
          <h2>{t("title")}</h2>
          <p>{t("lead")}</p>
        </div>

        {/* Showcase Frame */}
        <div
          className={styles.showcaseContainer}
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Visual Stage */}
          <div
            className={styles.mainStage}
            onClick={() => setIsLightboxOpen(true)}
            role="button"
            tabIndex={0}
            aria-label={`${t("slides." + currentSlide.id + ".title")} - ${t("enlarge")}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsLightboxOpen(true);
              }
            }}
          >
            {/* Top Atmosphere Shadow */}
            <div className={styles.overlayTop} />

            {/* Top Badges & Actions */}
            <div className={styles.topMetaBar}>
              <div className={styles.topBadges}>
                <span className={styles.categoryBadge}>
                  {t(currentSlide.kickerKey as any)}
                </span>
                <span className={styles.locationBadge}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {t(currentSlide.locationKey as any)}
                </span>
              </div>

              <div className={styles.topActions}>
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  aria-label={t("enlarge")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>{t("enlarge")}</span>
                </button>
              </div>
            </div>

            {/* Slide Image */}
            <div className={styles.slideImageWrapper} key={currentSlide.id}>
              <Img
                src={currentSlide.image}
                alt={t(currentSlide.titleKey as any)}
                className={styles.slideImage}
                fill
                priority={currentIndex === 0}
                sizes="(max-width: 900px) 100vw, 1240px"
              />
            </div>

            {/* Bottom Atmospheric Vignette */}
            <div className={styles.overlayBottom} />

            {/* Text Overlay */}
            <div className={styles.slideContent}>
              <div className={styles.slideText}>
                <span className={styles.tagPill}>{t(currentSlide.tagKey as any)}</span>
                <h3 className={styles.slideTitle}>{t(currentSlide.titleKey as any)}</h3>
                <p className={styles.slideDesc}>{t(currentSlide.descKey as any)}</p>
              </div>
            </div>

            {/* Progress Timer Line */}
            <div className={styles.progressBarTrack} aria-hidden="true">
              <div
                className={styles.progressBarFill}
                style={{ width: `${isPlaying ? progress : 100}%` }}
              />
            </div>
          </div>

          {/* Interactive Navigation & Quick Jump Bar */}
          <div className={styles.controlBar}>
            <div className={styles.controlsLeft}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={handlePrev}
                aria-label={t("prev")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>

              <button
                type="button"
                className={styles.playPauseBtn}
                onClick={() => setIsPlaying((prev) => !prev)}
                aria-label={isPlaying ? t("pause") : t("play")}
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={styles.navBtn}
                onClick={handleNext}
                aria-label={t("next")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              <span className={styles.counter}>
                <strong>{String(currentIndex + 1).padStart(2, "0")}</strong> / {String(totalSlides).padStart(2, "0")}
              </span>
            </div>

            {/* Quick-Jump Mini Pills / Thumbnails */}
            <div className={styles.thumbnailTrack} role="tablist" aria-label="Slide Selector">
              {SLIDES.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    className={`${styles.thumbBtn} ${isActive ? styles.thumbBtnActive : ""}`}
                    onClick={() => goToSlide(idx)}
                    title={t(slide.titleKey as any)}
                  >
                    <Img
                      src={slide.image}
                      alt=""
                      aria-hidden="true"
                      className={styles.thumbMini}
                      sizes="24px"
                    />
                    <span>{t(slide.kickerKey as any)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Modal */}
      {isLightboxOpen && (
        <div
          className={styles.lightboxBackdrop}
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t(currentSlide.titleKey as any)}
        >
          {/* Lightbox Header */}
          <div className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
            <div className={styles.topBadges}>
              <span className={styles.categoryBadge}>{t(currentSlide.kickerKey as any)}</span>
              <span className={styles.locationBadge}>{t(currentSlide.locationKey as any)}</span>
            </div>

            <button
              type="button"
              className={styles.lightboxCloseBtn}
              onClick={() => setIsLightboxOpen(false)}
              aria-label={t("close")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Lightbox Main Content Frame */}
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`${styles.lightboxNavBtn} ${styles.lightboxPrev}`}
              onClick={handlePrev}
              aria-label={t("prev")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div className={styles.lightboxImageFrame}>
              <Img
                src={currentSlide.image}
                alt={t(currentSlide.titleKey as any)}
                className={styles.lightboxImg}
                sizes="(max-width: 1400px) 95vw, 1300px"
                priority
              />
            </div>

            <button
              type="button"
              className={`${styles.lightboxNavBtn} ${styles.lightboxNext}`}
              onClick={handleNext}
              aria-label={t("next")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Lightbox Footer Caption */}
          <div className={styles.lightboxFooter} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.lightboxTitle}>{t(currentSlide.titleKey as any)}</h4>
            <p className={styles.lightboxDesc}>{t(currentSlide.descKey as any)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
