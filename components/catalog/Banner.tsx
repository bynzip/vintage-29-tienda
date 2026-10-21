import Link from "next/link";

type BannerProps = {
  image: string;
  title: string;
  subtitle?: string | null;
  buttonLabel: string;
  href: string;
};

export default function Banner({ image, title, subtitle, buttonLabel, href }: BannerProps) {
  if (!image) return null;
  const isVideo = /\.(mp4|mov|webm)(\?.*)?$/i.test(image);

  return (
    <section className="home-banner" aria-label={title}>
      <div className="home-banner-media">
        {isVideo ? (
          <video
            src={image}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="home-banner-asset"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt=""
            loading="lazy"
            className="home-banner-asset"
          />
        )}
      </div>
      <div className="home-banner-shade" aria-hidden="true" />
      <div className="home-banner-content">
        <h2>{title}</h2>
        {subtitle && <p className="home-banner-subtitle">{subtitle}</p>}
        <Link className="home-banner-button" href={href}>
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
