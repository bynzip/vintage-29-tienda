"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="product-missing">
      <h1>No pudimos cargar esta página.</h1>
      <p>Inténtalo de nuevo en unos momentos.</p>
      <button className="dark-button" onClick={reset}>
        REINTENTAR
      </button>
    </main>
  );
}
