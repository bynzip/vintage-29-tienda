import Image from "next/image";
import Link from "next/link";

export type CampaignMosaicItem = {
  image: string;
  imageAlt?: string;
  buttonLabel: string;
  href: string;
};

type CampaignMosaicProps = {
  items: CampaignMosaicItem[];
  label?: string;
};

export default function CampaignMosaic({ items, label = "Explora nuestras colecciones" }: CampaignMosaicProps) {
  const tiles = items.slice(0, 4);
  if (tiles.length !== 4 || tiles.some((tile) => !tile.image)) return null;

  return (
    <section className="home-campaign-mosaic" aria-label={label}>
      {tiles.map((tile, index) => (
        <article className="home-campaign-tile" key={`${tile.image}-${index}`}>
          <Image
            className="home-campaign-image"
            src={tile.image}
            alt={tile.imageAlt ?? ""}
            fill
            sizes="50vw"
            quality={90}
            loading="lazy"
          />
          <Link className="home-campaign-button" href={tile.href}>
            {tile.buttonLabel}
            <span aria-hidden="true">›</span>
          </Link>
        </article>
      ))}
    </section>
  );
}
