"use client";

import { useRef } from "react";
import { Camera, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Upload actions paired with hidden file inputs. Every place a receipt can be
 * added (header, empty state) shares this so the input wiring — accept filter,
 * value reset, accessible labels — lives in one place.
 *
 * On phones a second camera button opens the rear camera directly
 * (`capture="environment"`); on desktop only the file picker is shown.
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload a receipt image"
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
        onClick={() => pickerRef.current?.click()}
        disabled={uploading}
        className="group"
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
      <Button
        variant="outline"
        size="icon"
        className="sm:hidden"
        onClick={() => cameraRef.current?.click()}
        disabled={uploading}
        aria-label="Take a photo of a receipt"
      >
        <Camera className="h-4 w-4" />
      </Button>
    </div>
  );
}
