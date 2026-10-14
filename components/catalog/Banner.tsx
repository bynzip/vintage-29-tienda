import Link from "next/link";
import Image from "next/image";

type BannerProps = {
  image: string;
  title: string;
  buttonLabel: string;
  href: string;
};

export default function Banner({ image, title, buttonLabel, href }: BannerProps) {
  if (!image) return null;

  return (
    <section className="home-banner" aria-label={title}>
      <div className="home-banner-image">
        <Image src={image} alt="" fill sizes="100vw" quality={95} loading="lazy" />
      </div>
      <div className="home-banner-shade" aria-hidden="true" />
      <div className="home-banner-content">
        <h2>{title}</h2>
        <Link className="home-banner-button" href={href}>
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
