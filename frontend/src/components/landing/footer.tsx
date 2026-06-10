/** Site footer with data-source attribution (ODbL requires crediting OFF). */
export function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>Carbon Receipt — PromptWars Virtual hackathon.</p>
        <p>
          Data: Open Food Facts (ODbL) · Climatiq · DEFRA / Agribalyse · Gemini.
        </p>
      </div>
    </footer>
  );
}
