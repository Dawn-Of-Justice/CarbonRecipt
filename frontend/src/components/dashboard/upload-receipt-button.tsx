"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FolderOpen, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Phone-sized screens get the camera/files menu; desktop opens the picker. */
function isSmallScreen(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches
  );
}

/**
 * Upload action paired with hidden file inputs, shared by the header and the
 * empty state so the input wiring lives in one place.
 *
 * On desktop the button opens the file picker directly. On phones it opens a
 * small menu with two options — take a photo (rear camera via
 * `capture="environment"`) or choose from the file manager.
 */
export function UploadReceiptButton({
  uploading,
  onUpload,
  idleLabel = "Upload receipt",
  busyLabel = "Reading receipt…",
  className,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
  idleLabel?: string;
  busyLabel?: string;
  className?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on outside tap or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  function openSource(ref: React.RefObject<HTMLInputElement | null>) {
    setMenuOpen(false);
    ref.current?.click();
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a receipt image from your files"
        onChange={handleFile}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Take a photo of a receipt"
        onChange={handleFile}
      />
      <Button
        onClick={() =>
          isSmallScreen() ? setMenuOpen((o) => !o) : openSource(pickerRef)
        }
        disabled={uploading}
        className="group"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 transition-transform duration-300 ease-out-quint group-hover:-translate-y-0.5" />{" "}
            {idleLabel}
          </>
        )}
      </Button>
      {menuOpen && (
        <div
          role="menu"
          aria-label="Add a receipt"
          className="absolute right-0 top-full z-50 mt-2 w-56 animate-slide-up-fade rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => openSource(cameraRef)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <Camera className="h-4 w-4 text-primary" /> Take a photo
          </button>
          <button
            role="menuitem"
            onClick={() => openSource(pickerRef)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <FolderOpen className="h-4 w-4 text-primary" /> Choose from files
          </button>
        </div>
      )}
    </div>
  );
}
