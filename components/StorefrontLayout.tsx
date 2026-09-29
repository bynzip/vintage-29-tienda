"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  productImage,
  searchProducts,
  withWidth,
  type CatalogProduct,
} from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";

export type BagLine = {
  slug: string;
  name: string;
  image: string;
  quantity: number;
};

type StorefrontContextValue = {
  bag: BagLine[];
  favorites: string[];
  addToBag: (product: CatalogProduct) => void;
  removeFromBag: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clearBag: () => void;
  toggleFavorite: (slug: string) => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront() {
  const value = useContext(StorefrontContext);
  if (!value)
    throw new Error("useStorefront must be used inside StorefrontLayout");
  return value;
}

const BAG_KEY = "v29:bag";
const FAVORITES_KEY = "v29:favorites";

const helpLinks = [
  ["Contáctanos", "/pages/contact"],
  ["Envíos y entregas", "/pages/shipping"],
  ["Cambios y devoluciones", "/pages/returns"],
  ["Preguntas frecuentes", "/pages/faqs"],
] as const;

function Header() {
  const { bag, favorites, removeFromBag, setQuantity } = useStorefront();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { data } = useCatalog();
  const catalog = data?.products ?? [];
  const searchResults = searchTerm.trim()
    ? searchProducts(catalog, searchTerm).slice(0, 6)
    : [];
  const itemCount = bag.reduce((total, line) => total + line.quantity, 0);

  const closeMenus = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setBagOpen(false);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (query) router.push(`/search/${encodeURIComponent(query)}`);
    setSearchOpen(false);
  };

  return (
    <>
      <div className="announcement-bar">
        <span>LA REBAJA DEL FINDE LARGO</span>
        <span className="announcement-divider">—</span>
        <span>HASTA 50% DE DESCUENTO</span>
        <Link href="/collections/sale">
          VER REBAJAS <ArrowRight size={12} strokeWidth={1.8} />
        </Link>
      </div>
      <header className="site-header">
        <div className="header-left">
          <button
            className="icon-button mobile-menu-trigger"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setSearchOpen(false);
              setBagOpen(false);
            }}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <Link href="/catalogo">CATÁLOGO</Link>
            <Link href="/collections/new-arrivals">NOVEDADES</Link>
            <Link href="/collections/clothing">ROPA</Link>
            <Link href="/collections/dresses">VESTIDOS</Link>
            <Link className="sale-link" href="/collections/sale">
              REBAJAS
            </Link>
          </nav>
        </div>
        <Link href="/" className="wordmark" aria-label="Vintage 29 inicio">
          vintage 29<span>®</span>
        </Link>
        <div className="header-actions">
          <button
            className="header-search"
            aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              setMenuOpen(false);
              setBagOpen(false);
            }}
          >
            <Search size={19} strokeWidth={1.6} />
            <span>BUSCAR</span>
          </button>
          <Link
            className="icon-button favorites-header-button"
            href="/favorites"
            aria-label={`Favoritos guardados, ${favorites.length} artículos`}
          >
            <Heart size={19} strokeWidth={1.6} />
          </Link>
          <Link
            className="icon-button account-button"
            href="/account"
            aria-label="Tu cuenta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5.4 20c.5-3.2 3.1-5.2 6.6-5.2s6.1 2 6.6 5.2" />
            </svg>
          </Link>
          <button
            className="icon-button bag-button"
            aria-label={`Bolsa de compras con ${itemCount} artículos`}
            aria-expanded={bagOpen}
            onClick={() => {
              setBagOpen((open) => !open);
              setMenuOpen(false);
              setSearchOpen(false);
            }}
          >
            <ShoppingBag size={20} strokeWidth={1.6} />
            <span className="bag-count">{itemCount}</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel-wrap">
          <form className="search-panel" onSubmit={submitSearch}>
            <Search size={19} strokeWidth={1.6} />
            <input
              autoFocus
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="¿Qué estás buscando?"
              aria-label="Buscar productos"
            />
            <button type="submit" aria-label="Buscar">
              <ArrowRight size={19} />
            </button>
            <button
              type="button"
              aria-label="Cerrar búsqueda"
              onClick={() => setSearchOpen(false)}
            >
              <X size={19} />
            </button>
          </form>
          {searchTerm.trim() && (
            <div className="search-suggestions">
              {searchResults.length ? (
                searchResults.map((product) => (
                  <Link
                    href={`/products/${product.slug}`}
                    key={product.slug}
                    onClick={() => setSearchOpen(false)}
                  >
                    <img src={withWidth(productImage(product), 120)} alt="" />
                    <span>{product.name}</span>
                    <strong>{product.images.length} fotos</strong>
                  </Link>
                ))
              ) : (
                <p>No encontramos productos. Prueba “pant” o “vestido”.</p>
              )}
            </div>
          )}
        </div>
      )}

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          <Link href="/catalogo" onClick={closeMenus}>
            Catálogo <ArrowUpRight size={16} />
          </Link>
          <Link href="/collections/new-arrivals" onClick={closeMenus}>
            Novedades <ArrowUpRight size={16} />
          </Link>
          <Link href="/collections/clothing" onClick={closeMenus}>
            Ropa <ArrowUpRight size={16} />
          </Link>
          <Link href="/collections/dresses" onClick={closeMenus}>
            Vestidos <ArrowUpRight size={16} />
          </Link>
          <Link href="/collections/sale" onClick={closeMenus}>
            Rebajas <ArrowUpRight size={16} />
          </Link>
          <Link href="/account" onClick={closeMenus}>
            Mi cuenta <ArrowUpRight size={16} />
          </Link>
          <p>Encuentra tu próximo favorito.</p>
        </nav>
      )}

      {bagOpen && (
        <div className="bag-scrim" onClick={() => setBagOpen(false)}>
          <aside
            className="bag-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Bolsa de compras"
            role="dialog"
            aria-modal="true"
          >
            <div className="bag-drawer-header">
              <span>TU BOLSA ({itemCount})</span>
              <button
                className="icon-button"
                aria-label="Cerrar bolsa"
                onClick={() => setBagOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {bag.length ? (
              <>
                <div className="bag-lines">
                  {bag.map((line) => (
                    <div className="bag-line" key={line.slug}>
                      <img src={withWidth(line.image, 160)} alt={line.name} />
                      <div>
                        <strong>{line.name}</strong>
                        <span className="bag-qty">
                          <button
                            aria-label={`Quitar una unidad de ${line.name}`}
                            onClick={() =>
                              setQuantity(line.slug, line.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            aria-label={`Añadir una unidad de ${line.name}`}
                            onClick={() =>
                              setQuantity(line.slug, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </span>
                      </div>
                      <button
                        aria-label={`Quitar ${line.name}`}
                        onClick={() => removeFromBag(line.slug)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bag-summary">
                  <div>
                    <span>Artículos</span>
                    <strong>{itemCount}</strong>
                  </div>
                  <p>El precio y el envío se calculan al pagar.</p>
                  <Link
                    className="dark-button"
                    href="/checkout"
                    onClick={() => setBagOpen(false)}
                  >
                    IR A PAGAR <ArrowRight size={15} />
                  </Link>
                  <button
                    className="bag-continue"
                    onClick={() => setBagOpen(false)}
                  >
                    SEGUIR COMPRANDO
                  </button>
                </div>
              </>
            ) : (
              <div className="bag-empty">
                <ShoppingBag size={27} strokeWidth={1.3} />
                <p>Tu bolsa está un poco vacía.</p>
                <span>Encontremos algo que te encante.</span>
                <Link
                  className="dark-button"
                  href="/collections/new-arrivals"
                  onClick={() => setBagOpen(false)}
                >
                  SEGUIR EXPLORANDO
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main page-gutter">
        <div className="footer-brand">
          <Link href="/" className="wordmark">
            vintage 29<span>®</span>
          </Link>
          <p>
            Para los grandes momentos
            <br />
            y también para los pequeños.
          </p>
          <div className="social-links">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
            >
              INSTAGRAM
            </a>
            <a href="https://www.tiktok.com/" target="_blank" rel="noreferrer">
              TIKTOK
            </a>
          </div>
        </div>
        <div className="footer-column">
          <span>¿NECESITAS AYUDA?</span>
          {helpLinks.map(([label, path]) => (
            <Link href={path} key={path}>
              {label}
            </Link>
          ))}
        </div>
        <div className="footer-column">
          <span>EL MUNDO VINTAGE 29</span>
          <Link href="/pages/about">Nosotros</Link>
          <Link href="/pages/sustainability">Sostenibilidad</Link>
          <Link href="/pages/careers">Trabaja con nosotros</Link>
          <Link href="/pages/student-discount">Descuento estudiante</Link>
        </div>
        <div className="footer-column footer-help">
          <span>AQUÍ PARA TI</span>
          <p>¿Tienes dudas? Nuestro equipo siempre está feliz de ayudarte.</p>
          <Link className="footer-contact-link" href="/pages/contact">
            CONTÁCTANOS <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom page-gutter">
        <span>© 2026 VINTAGE 29</span>
        <span>PERÚ · PEN S/</span>
        <span>HECHO PARA TU MOMENTO.</span>
      </div>
    </footer>
  );
}

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bag, setBag] = useState<BagLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedBag = localStorage.getItem(BAG_KEY);
      if (storedBag) setBag(JSON.parse(storedBag) as BagLine[]);
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites) as string[]);
    } catch {
      // localStorage no disponible: seguimos con estado en memoria.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(bag));
    } catch {
      // Ignorar.
    }
  }, [bag, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Ignorar.
    }
  }, [favorites, hydrated]);

  const addToBag = (product: CatalogProduct) =>
    setBag((current) => {
      const existing = current.find((line) => line.slug === product.slug);
      if (existing) {
        return current.map((line) =>
          line.slug === product.slug
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          slug: product.slug,
          name: product.name,
          image: productImage(product),
          quantity: 1,
        },
      ];
    });

  const removeFromBag = (slug: string) =>
    setBag((current) => current.filter((line) => line.slug !== slug));

  const setQuantity = (slug: string, quantity: number) =>
    setBag((current) =>
      quantity <= 0
        ? current.filter((line) => line.slug !== slug)
        : current.map((line) =>
            line.slug === slug ? { ...line, quantity } : line,
          ),
    );

  const clearBag = () => setBag([]);

  const toggleFavorite = (slug: string) =>
    setFavorites((current) =>
      current.includes(slug)
        ? current.filter((favorite) => favorite !== slug)
        : [...current, slug],
    );

  const value = {
    bag,
    favorites,
    addToBag,
    removeFromBag,
    setQuantity,
    clearBag,
    toggleFavorite,
  };

  return (
    <StorefrontContext.Provider value={value}>
      <div className="storefront">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </StorefrontContext.Provider>
  );
}
