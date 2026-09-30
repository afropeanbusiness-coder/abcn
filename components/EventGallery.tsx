"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Img from "@/components/Img";
import type { EventGalleryItem } from "@/lib/events";
import styles from "./EventGallery.module.css";

type Chapter = NonNullable<EventGalleryItem["chapter"]>;

const CHAPTERS: Chapter[] = ["stage", "rooms", "together"];
const CHAPTER_KEYS: Record<Chapter, { title: string; copy: string }> = {
  stage: { title: "galleryStageTitle", copy: "galleryStageCopy" },
  rooms: { title: "galleryRoomsTitle", copy: "galleryRoomsCopy" },
  together: { title: "galleryTogetherTitle", copy: "galleryTogetherCopy" },
};

type Group = { chapter: Chapter | null; items: EventGalleryItem[] };

/**
 * The gallery is told as chapters rather than dumped as one grid: each chapter
 * has its own heading and a sticky intro beside a masonry of the photos at
 * their natural proportions (nothing is cropped away). Items from the CMS that
 * carry no chapter are gathered into a single untitled chapter, so an editor
 * can still add photos without touching code.
 */
export default function EventGallery({ items, alt }: { items: EventGalleryItem[]; alt: string }) {
  const te = useTranslations("event");
  const [open, setOpen] = useState<number | null>(null);

  const hasChapters = items.some((i) => i.chapter);
  const groups: Group[] = hasChapters
    ? CHAPTERS.map((c) => ({ chapter: c, items: items.filter((i) => i.chapter === c) })).filter((g) => g.items.length)
    : [{ chapter: null, items }];
  if (hasChapters) {
    const rest = items.filter((i) => !i.chapter || !CHAPTERS.includes(i.chapter));
    if (rest.length) groups.push({ chapter: null, items: rest });
  }

  // The lightbox walks the photos in the order they appear on the page.
  const flat = groups.flatMap((g) => g.items);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + flat.length) % flat.length)),
    [flat.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  const current = open === null ? null : flat[open];

  return (
    <div className={styles.gallery}>
      {groups.map((g, gi) => (
        <div className={styles.chapter} key={g.chapter ?? `other-${gi}`}>
          {g.chapter && (
            <div className={styles.intro}>
              <span className={styles.num}>{String(gi + 1).padStart(2, "0")}</span>
              <h3>{te(CHAPTER_KEYS[g.chapter].title as any)}</h3>
              <p>{te(CHAPTER_KEYS[g.chapter].copy as any)}</p>
              <small>
                {g.items.length} {te("galleryPhotos")}
              </small>
            </div>
          )}
          <div className={styles.masonry} style={g.chapter ? undefined : { gridColumn: "1 / -1" }}>
            {g.items.map((item) => (
              <button
                type="button"
                key={item.url}
                className={styles.tile}
                onClick={() => setOpen(flat.indexOf(item))}
                aria-label={`${te("galleryViewPhoto")}: ${item.caption || alt}`}
              >
                <Img
                  src={item.url}
                  alt={item.alt || item.caption || alt}
                  sizes="(max-width: 900px) 50vw, 26vw"
                />
                <span className={styles.cap}>
                  {item.category && <em>{item.category}</em>}
                  {item.caption && <strong>{item.caption}</strong>}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {current && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" onClick={close}>
          <button type="button" className={styles.lbClose} onClick={close} aria-label={te("galleryClose")}>
            ×
          </button>
          <button
            type="button"
            className={`${styles.lbNav} ${styles.lbPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label={te("galleryPrev")}
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <Img src={current.url} alt={current.alt || current.caption || alt} sizes="90vw" priority />
            <figcaption>
              {current.category && <em>{current.category}</em>}
              {current.caption && <strong>{current.caption}</strong>}
              <small>
                {(open ?? 0) + 1} / {flat.length}
              </small>
            </figcaption>
          </figure>
          <button
            type="button"
            className={`${styles.lbNav} ${styles.lbNext}`}
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label={te("galleryNext")}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
