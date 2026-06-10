"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/logo";
import { UploadReceiptButton } from "@/components/dashboard/upload-receipt-button";

/** Sticky dashboard top bar: logo, back-home link, and the upload action. */
export function DashboardHeader({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
        <UploadReceiptButton uploading={uploading} onUpload={onUpload} />
      </div>
    </header>
  );
}
