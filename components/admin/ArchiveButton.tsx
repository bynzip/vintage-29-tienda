"use client";

import type { FormEvent } from "react";
import { Archive } from "lucide-react";

export default function ArchiveButton({
  productId,
  action,
}: {
  productId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  function confirmArchive(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("¿Archivar este producto? Se conservará en la base y dejará de mostrarse en la tienda.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmArchive} className="admin-archive-form">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="status" value="archived" />
      <button
        type="submit"
        className="admin-icon-action"
        title="Archivar producto"
        aria-label="Archivar producto"
      >
        <Archive size={14} />
      </button>
    </form>
  );
}
