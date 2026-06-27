"use client";

import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { extractReceipt, type ScannedExpense } from "@/modules/ai/receipt";

/**
 * "Scan receipt" — snap/upload a receipt photo, extract vendor/amount/date/
 * category via vision, and hand the fields up to prefill the expense form.
 * Nothing is saved until the user reviews and confirms (you decide).
 */
export function ScanReceiptButton({ onScanned }: { onScanned: (e: ScannedExpense) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Please choose an image file", "error");
    if (file.size > 8 * 1024 * 1024) return toast("Image too large (max 8MB)", "error");

    setBusy(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await extractReceipt({ dataBase64, mediaType: file.type });
      if (!res.ok) return toast(res.error, "error");
      toast("Receipt read — review and save", "success");
      onScanned(res.data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} isLoading={busy}>
        <ScanLine /> Scan receipt
      </Button>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1)); // strip the data: URL prefix
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
