type SocialMediaSectionProps = {
  title: string;
  subtitle?: string | null;
  socialUrl?: string | null;
  buttonLabel?: string;
  videoSrc?: string | null;
};

export default function SocialMediaSection({
  title,
  subtitle,
  socialUrl,
  buttonLabel = "VER TIKTOK",
  videoSrc,
}: SocialMediaSectionProps) {
  const videoMedia = videoSrc ? (
    <video
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-label={title}
    >
      Tu navegador no puede reproducir este video.
    </video>
  ) : (
    <div className="home-social-video-placeholder" role="img" aria-label="Video no disponible">
      VIDEO NO DISPONIBLE
    </div>
  );

  return (
    <section className="home-social-section" aria-labelledby="home-social-title">
      <div className="page-gutter">
        <div className="home-social-heading">
          <div className="home-social-copy">
            <h2 id="home-social-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {socialUrl && buttonLabel && (
            <a
              className="home-social-button"
              href={socialUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {buttonLabel}
            </a>
          )}
        </div>
      </div>

      <div className="home-social-banner">
        {videoMedia}
      </div>
    </section>
  );
}
