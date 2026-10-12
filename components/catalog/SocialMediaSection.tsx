type SocialMediaSectionProps = {
  title: string;
  subtitle: string;
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
  return (
    <section className="home-social-section" aria-labelledby="home-social-title">
      <div className="page-gutter">
        <div className="home-social-heading">
          <h2 id="home-social-title">{title}</h2>
          <p>{subtitle}</p>
          {socialUrl && (
            <a className="home-social-button" href={socialUrl} target="_blank" rel="noreferrer noopener">
              {buttonLabel}
            </a>
          )}
        </div>
      </div>

      <div className="home-social-videos" aria-label="Videos de nuestra comunidad">
        {[0, 1, 2].map((index) => (
          <div className="home-social-video" key={index}>
            {videoSrc ? (
              <video
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={`Video de la comunidad ${index + 1}`}
              >
                Tu navegador no puede reproducir este video.
              </video>
            ) : (
              <div className="home-social-video-placeholder" role="img" aria-label="Video no disponible">
                VIDEO NO DISPONIBLE
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
