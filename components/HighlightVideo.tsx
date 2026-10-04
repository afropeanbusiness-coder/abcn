import { useTranslations } from "next-intl";
import styles from "./HighlightVideo.module.css";

/**
 * Highlights video. The file is not downloaded until a visitor presses play
 * (preload="metadata" fetches only the first frame and duration), so the
 * 14 MB clip costs nothing on first load.
 */
export default function HighlightVideo() {
  const t = useTranslations("video");
  return (
    <section className={styles.section} id="video" aria-labelledby="video-title">
      <div className={styles.head}>
        <span className={styles.pill}>{t("pill")}</span>
        <h2 id="video-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </div>
      <figure className={styles.frame}>
        <video
          className={styles.video}
          controls
          playsInline
          preload="metadata"
          aria-label={t("title")}
        >
          <source src="/assets/abcn/video/abcn-highlights.mp4#t=0.1" type="video/mp4" />
          {t("unsupported")}
        </video>
      </figure>
    </section>
  );
}
