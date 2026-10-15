import Image from "next/image";
import Link from "next/link";

type CouponBannerProps = {
  image: string;
  href?: string | null;
  ariaLabel?: string;
  imageAlt?: string;
};

export default function CouponBanner({ image, href, ariaLabel = "Ver promoción", imageAlt = "" }: CouponBannerProps) {
  if (!image) return null;
  const isVideo = /\.(mp4|mov|webm)(\?.*)?$/i.test(image);

  return (
    <Link className="home-coupon-banner" href={href?.trim() || "#"} aria-label={ariaLabel}>
      {isVideo ? (
        <video
          src={image}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
        />
      ) : (
        <Image
          className="home-coupon-image"
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          quality={95}
          loading="lazy"
        />
      )}
    </Link>
  );
}
