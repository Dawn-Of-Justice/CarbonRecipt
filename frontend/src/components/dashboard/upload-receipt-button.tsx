"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Button paired with a hidden file input. Every place a receipt can be
 * uploaded (header, empty state) shares this so the input wiring — accept
 * filter, value reset, accessible label — lives in one place.
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
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload a receipt image"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn("group", className)}
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
    </>
  );
}
