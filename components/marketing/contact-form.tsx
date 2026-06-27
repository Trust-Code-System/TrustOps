"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_GRADIENT, GLASS_CARD } from "./brand";

/**
 * Marketing contact form. Self-contained: it validates client-side and shows a
 * success state, then hands off to the user's mail client as a reliable
 * fallback (no backend wiring needed for the public site). Swap the submit
 * handler for a server action when a ticketing backend is available.
 */
const TOPICS = ["Sales enquiry", "Technical support", "Billing", "Partnership", "Other"];
const SUPPORT_EMAIL = "support@trustops.ai";

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-small text-white placeholder:text-white/30 outline-none transition-colors focus:border-fuchsia-400/60 focus:bg-white/[0.06]";

export function ContactForm() {
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    topic: TOPICS[0],
    message: "",
  });

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${form.topic}] from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    // Hand off to the visitor's mail client as the delivery channel.
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div className={cn(GLASS_CARD, "flex flex-col items-center p-10 text-center")}>
        <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white", BRAND_GRADIENT)}>
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-h3 text-white">Message ready to send</h3>
        <p className="mt-2 max-w-sm text-small text-white/55">
          We&apos;ve opened your email app with the details filled in. If it
          didn&apos;t open, reach us directly at{" "}
          <a className="text-fuchsia-300 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-small font-[600] text-white/60 hover:text-white"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn(GLASS_CARD, "flex flex-col gap-4 p-7")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-[600] uppercase tracking-[0.06em] text-white/50">Name</span>
          <input required value={form.name} onChange={onChange("name")} className={field} placeholder="Amara Okafor" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-[600] uppercase tracking-[0.06em] text-white/50">Email</span>
          <input required type="email" value={form.email} onChange={onChange("email")} className={field} placeholder="you@business.com" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-[600] uppercase tracking-[0.06em] text-white/50">Topic</span>
        <select value={form.topic} onChange={onChange("topic")} className={cn(field, "appearance-none")}>
          {TOPICS.map((t) => (
            <option key={t} value={t} className="bg-[#15121d] text-white">
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-[600] uppercase tracking-[0.06em] text-white/50">Message</span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={onChange("message")}
          className={cn(field, "resize-none")}
          placeholder="How can we help?"
        />
      </label>
      <button
        type="submit"
        className={cn("mt-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-small font-[700] text-white transition-transform hover:-translate-y-0.5", BRAND_GRADIENT)}
      >
        Send message
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
