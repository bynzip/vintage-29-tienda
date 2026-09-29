"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Heart, Trash2 } from "lucide-react";
import { withWidth } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import { useStorefront } from "@/components/StorefrontLayout";
import ProductCard from "@/components/ProductCard";

export function NotFoundContent() {
  return (
    <section className="content-page">
      <span className="eyebrow">404 · PÁGINA NO ENCONTRADA</span>
      <h1>Esa página se perdió.</h1>
      <p>Puede que el enlace haya cambiado. Volvamos a lo bueno.</p>
      <Link href="/" className="dark-button">
        VOLVER AL INICIO <ArrowRight size={15} />
      </Link>
    </section>
  );
}

const pageContent: Record<string, { title: string; intro: string }> = {
  contact: {
    title: "Contáctanos",
    intro:
      "Nuestro equipo está para ayudarte. Escríbenos y te responderemos pronto.",
  },
  shipping: {
    title: "Envíos y entregas",
    intro:
      "Ofrecemos opciones de envío estándar y express. Los servicios disponibles y la fecha estimada se muestran al pagar.",
  },
  returns: {
    title: "Cambios y devoluciones",
    intro:
      "¿Cambiaste de idea? Las prendas sin uso se pueden devolver dentro de los 30 días posteriores a la entrega.",
  },
  faqs: {
    title: "Preguntas frecuentes",
    intro: "Respuestas rápidas sobre pedidos, envíos, tallas y devoluciones.",
  },
  about: {
    title: "Un poco sobre nosotros",
    intro:
      "Vintage 29 está para los grandes momentos y también para los pequeños.",
  },
  sustainability: {
    title: "Mejor, poco a poco",
    intro:
      "Creemos que las mejores decisiones se construyen paso a paso. Trabajamos para que cada parte del camino sea más consciente.",
  },
  careers: {
    title: "Trabaja con nosotros",
    intro:
      "Trae tus ideas, tu curiosidad y tu punto de vista. Siempre buscamos buena gente para el mundo Vintage 29.",
  },
  "student-discount": {
    title: "Un extra para estudiantes",
    intro:
      "Regístrate con tu correo de estudiante para enterarte de las últimas ofertas y novedades.",
  },
};

export function AccountPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="content-page account-page">
      <span className="eyebrow">BIENVENIDA DE VUELTA</span>
      <h1>Tu cuenta</h1>
      <p>Inicia sesión para ver tus pedidos y guardar tus looks favoritos.</p>
      {submitted ? (
        <p className="form-success" role="status">
          El inicio de sesión aún no está conectado en esta demo.
        </p>
      ) : (
        <form
          className="store-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label htmlFor="account-email">Correo electrónico</label>
          <input
            id="account-email"
            type="email"
            required
            placeholder="tu@ejemplo.com"
          />
          <button className="dark-button" type="submit">
            ENVIARME UN ENLACE DE ACCESO <ArrowRight size={15} />
          </button>
        </form>
      )}
    </section>
  );
}

export function FavoritesPage() {
  const { favorites } = useStorefront();
  const { data } = useCatalog();
  const savedProducts = (data?.products ?? []).filter((product) =>
    favorites.includes(product.slug),
  );
  return (
    <section className="collection-page page-gutter">
      <header className="collection-header">
        <span className="eyebrow">TU SELECCIÓN PERSONAL</span>
        <h1>Favoritos guardados</h1>
        <p>Todas las prendas que te han gustado.</p>
      </header>
      {savedProducts.length ? (
        <div className="product-grid">
          {savedProducts.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={28} strokeWidth={1.4} />
          <p>Tus prendas guardadas aparecerán aquí.</p>
          <Link href="/catalogo" className="dark-button">
            ENCUENTRA TUS FAVORITOS <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}

export function CheckoutPage() {
  const { bag, removeFromBag, clearBag } = useStorefront();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const itemCount = bag.reduce((total, line) => total + line.quantity, 0);

  if (orderPlaced)
    return (
      <section className="content-page checkout-page">
        <span className="eyebrow">PEDIDO CONFIRMADO</span>
        <h1>Gracias.</h1>
        <p>Tu pedido de demo está confirmado. No se realizó ningún cobro.</p>
        <Link href="/catalogo" className="dark-button">
          SEGUIR COMPRANDO <ArrowRight size={15} />
        </Link>
      </section>
    );
  if (!bag.length)
    return (
      <section className="content-page checkout-page">
        <span className="eyebrow">TU BOLSA</span>
        <h1>Aquí todavía no hay nada.</h1>
        <p>Encuentra algo que te encante y estará aquí esperándote.</p>
        <Link href="/catalogo" className="dark-button">
          VER CATÁLOGO <ArrowRight size={15} />
        </Link>
      </section>
    );
  return (
    <section className="checkout-page page-gutter">
      <header className="collection-header">
        <span className="eyebrow">CASI TUYO</span>
        <h1>Resumen del pedido</h1>
      </header>
      <div className="checkout-layout">
        <div className="checkout-lines">
          {bag.map((line) => (
            <article className="checkout-line" key={line.slug}>
              <img src={withWidth(line.image, 200)} alt={line.name} />
              <div>
                <h2>{line.name}</h2>
                <p>Cantidad: {line.quantity}</p>
              </div>
              <button
                aria-label={`Quitar ${line.name}`}
                onClick={() => removeFromBag(line.slug)}
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
        <div className="checkout-summary">
          <h2>Resumen</h2>
          <div>
            <span>Artículos</span>
            <strong>{itemCount}</strong>
          </div>
          <div>
            <span>Precio</span>
            <span>Por confirmar</span>
          </div>
          <div>
            <span>Envío</span>
            <span>Se calcula al pagar</span>
          </div>
          <p>Este checkout es una demo. No se recogen datos de pago.</p>
          <button
            className="dark-button"
            onClick={() => {
              clearBag();
              setOrderPlaced(true);
            }}
          >
            REALIZAR PEDIDO DEMO <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function InfoPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "contact";
  const page = pageContent[slug];
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => setSubmitted(false), [slug]);
  if (!page)
    return (
      <section className="content-page">
        <h1>No encontramos esa página.</h1>
        <Link href="/" className="dark-button">
          VOLVER AL INICIO
        </Link>
      </section>
    );
  if (slug === "faqs")
    return (
      <section className="content-page info-page">
        <span className="eyebrow">¿NECESITAS AYUDA?</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <div className="detail-accordions info-accordions">
          <details>
            <summary>¿CUÁNDO SE ENVÍA MI PEDIDO?</summary>
            <p>
              Los pedidos se procesan en días hábiles. Tu correo de confirmación
              incluye el seguimiento en cuanto tu pedido sale de nuestro
              almacén.
            </p>
          </details>
          <details>
            <summary>¿CÓMO INICIO UNA DEVOLUCIÓN?</summary>
            <p>
              Visita nuestra página de devoluciones e incluye tu número de
              pedido para ver los siguientes pasos.
            </p>
          </details>
          <details>
            <summary>¿CÓMO ENCUENTRO MI TALLA?</summary>
            <p>
              Cada página de producto incluye una guía de tallas con medidas de
              la prenda y notas de ajuste.
            </p>
          </details>
        </div>
      </section>
    );
  if (slug === "contact")
    return (
      <section className="content-page info-page">
        <span className="eyebrow">ESTAMOS AQUÍ PARA TI</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        {submitted ? (
          <p className="form-success" role="status">
            Gracias por probar el formulario. Los mensajes aún no se envían en
            esta demo.
          </p>
        ) : (
          <form
            className="store-form contact-form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            <label htmlFor="contact-name">Nombre</label>
            <input id="contact-name" required placeholder="Tu nombre" />
            <label htmlFor="contact-email">Correo</label>
            <input
              id="contact-email"
              type="email"
              required
              placeholder="tu@ejemplo.com"
            />
            <label htmlFor="contact-message">¿Cómo podemos ayudarte?</label>
            <textarea
              id="contact-message"
              required
              rows={5}
              placeholder="Cuéntanos un poco más"
            />
            <button className="dark-button" type="submit">
              ENVIAR MENSAJE <ArrowRight size={15} />
            </button>
          </form>
        )}
      </section>
    );
  return (
    <section className="content-page info-page">
      <span className="eyebrow">EL MUNDO VINTAGE 29</span>
      <h1>{page.title}</h1>
      <p>{page.intro}</p>
      {slug === "student-discount" && (
        <form
          className="store-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label htmlFor="student-email">Correo de estudiante</label>
          <input
            id="student-email"
            type="email"
            required
            placeholder="tu@correo.edu"
          />
          <button className="dark-button" type="submit">
            {submitted
              ? "YA ESTÁS EN LA LISTA"
              : "RECIBIR NOVEDADES PARA ESTUDIANTES"}{" "}
            <ArrowRight size={15} />
          </button>
        </form>
      )}
      {slug === "shipping" && (
        <div className="detail-accordions info-accordions">
          <details open>
            <summary>ENVÍO ESTÁNDAR</summary>
            <p>
              La mayoría de los pedidos llegan entre 4 y 7 días hábiles después
              del despacho.
            </p>
          </details>
          <details>
            <summary>ENVÍO EXPRESS</summary>
            <p>
              Las opciones express y los plazos actuales se muestran durante el
              pago.
            </p>
          </details>
        </div>
      )}
      {slug === "returns" && (
        <div className="detail-accordions info-accordions">
          <details open>
            <summary>PLAZO DE DEVOLUCIÓN</summary>
            <p>
              Las prendas sin uso se pueden devolver dentro de los 30 días
              posteriores a la entrega.
            </p>
          </details>
          <details>
            <summary>ESTADO DE LA PRENDA</summary>
            <p>
              Las prendas deben estar en su estado original y con las etiquetas
              puestas. No aplica a artículos en liquidación final.
            </p>
          </details>
        </div>
      )}
      {slug === "student-discount" && submitted && (
        <p className="form-success" role="status">
          ¡Gracias! La verificación del correo de estudiante aún no está
          conectada en esta demo.
        </p>
      )}
      {!["student-discount", "shipping", "returns"].includes(slug) && (
        <Link href="/pages/contact" className="text-link info-contact-link">
          CONTÁCTANOS <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
