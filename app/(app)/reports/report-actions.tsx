"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Report export controls. CSV downloads from the server route (RLS-scoped);
 * "Save as PDF" uses the browser print dialog against the #print-area isolated
 * by the print stylesheet in globals.css. Hidden from the printed output.
 */
export function ReportActions({ from, to }: { from: string; to: string }) {
  const csvHref = `/api/reports/export?from=${from}&to=${to}`;
  return (
    <div className="no-print flex gap-3">
      <a href={csvHref} className={buttonVariants({ variant: "secondary" })}>
        <FileDown /> Download CSV
      </a>
      <Button onClick={() => window.print()}>
        <Printer /> Save as PDF
      </Button>
    </div>
  );
}
