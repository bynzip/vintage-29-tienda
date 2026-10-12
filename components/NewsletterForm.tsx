export default function NewsletterForm() {
  return (
    <div className="newsletter-form">
      <div className="newsletter-input-row">
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          aria-label="Dirección de correo electrónico"
          placeholder="Dirección de correo electrónico *"
        />
      </div>
    </div>
  );
}
