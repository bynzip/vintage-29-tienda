import Link from "next/link";
import Image from "next/image";

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
      <div className="home-banner-image">
        {isVideo ? (
          <video
            src={image}
            autoPlay
            loop
            muted
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Image src={image} alt="" fill sizes="100vw" quality={95} loading="lazy" />
        )}
      </div>
      <div className="home-banner-shade" aria-hidden="true" />
      <div className="home-banner-content">
        <h2>{title}</h2>
        {subtitle && <p style={{ margin: 0, fontSize: "clamp(12px, 1.4vw, 16px)", opacity: 0.9 }}>{subtitle}</p>}
        <Link className="home-banner-button" href={href}>
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
