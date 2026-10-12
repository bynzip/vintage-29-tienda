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

  return (
    <Link className="home-coupon-banner" href={href?.trim() || "#"} aria-label={ariaLabel}>
      <Image
        className="home-coupon-image"
        src={image}
        alt={imageAlt}
        fill
        sizes="100vw"
        quality={90}
        loading="lazy"
      />
    </Link>
  );
}
