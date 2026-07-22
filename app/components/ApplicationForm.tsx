"use client";

import { useRef, useState } from "react";

const INPUT_CLASS =
  "w-full bg-[var(--color-ink-2)] border border-[var(--color-line-2)] focus:border-[var(--color-ember)] text-white placeholder:text-white/30 px-3.5 py-2.5 text-[0.9rem] outline-none transition-colors";
const LABEL_CLASS = "block text-mono text-[0.6rem] text-white/50 mb-1.5";

export default function ApplicationForm({ role }: { role: string }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    fd.set("role", role);

    // Client-side guardrails (server re-validates)
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please attach your résumé.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Résumé must be under 4 MB.");
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit.");
      setState("ok");
      formEl.reset();
      setFileName("");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "ok") {
    return (
      <div className="border border-[var(--color-ember)]/50 bg-[var(--color-ember)]/[0.06] p-6 sm:p-8">
        <div className="text-cond text-[1.5rem] text-white mb-1.5">
          Application received 🎉
        </div>
        <p className="text-white/65 text-[0.9rem] leading-[1.6]">
          Thanks for applying for the {role} role — we&apos;ll review your
          submission and be in touch. Applications are reviewed on a rolling
          basis.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-[var(--color-line)] bg-[var(--color-ink)] p-6 sm:p-8"
      noValidate
    >
      {/* Honeypot — hidden from humans, catches bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="af-name" className={LABEL_CLASS}>
            Full name *
          </label>
          <input
            id="af-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="af-email" className={LABEL_CLASS}>
            Email *
          </label>
          <input
            id="af-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="af-phone" className={LABEL_CLASS}>
          Phone <span className="text-white/25">(optional)</span>
        </label>
        <input
          id="af-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="(000) 000-0000"
          className={`${INPUT_CLASS} sm:max-w-[280px]`}
        />
      </div>

      {/* Résumé upload */}
      <div className="mt-4">
        <label htmlFor="af-resume" className={LABEL_CLASS}>
          Résumé / CV *
        </label>
        <input
          ref={fileRef}
          id="af-resume"
          name="resume"
          type="file"
          required
          accept=".pdf,.doc,.docx,.rtf,.txt,.odt,.pages"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="hidden"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 border border-[var(--color-line-2)] hover:border-[var(--color-ember)] text-white/80 hover:text-white text-cond-md text-[0.72rem] px-4 py-2.5 transition-colors"
          >
            ↑ Choose file
          </button>
          <span className="text-[0.82rem] text-white/55 truncate max-w-[220px]">
            {fileName || "PDF, Word or text · max 4 MB"}
          </span>
        </div>
      </div>

      {/* Cover letter */}
      <div className="mt-4">
        <label htmlFor="af-cover" className={LABEL_CLASS}>
          Cover letter <span className="text-white/25">(optional)</span>
        </label>
        <textarea
          id="af-cover"
          name="coverLetter"
          rows={5}
          placeholder="A few lines on your coaching philosophy and why this role…"
          className={`${INPUT_CLASS} resize-y leading-[1.6]`}
        />
      </div>

      {/* Work authorization */}
      <label
        htmlFor="af-workauth"
        className="mt-5 flex items-start gap-3 cursor-pointer select-none"
      >
        <input
          id="af-workauth"
          name="workAuthorized"
          type="checkbox"
          value="yes"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ember)] cursor-pointer"
        />
        <span className="text-white/70 text-[0.88rem] leading-[1.5]">
          I am authorized to work in the United States.
          <span className="block text-white/40 text-[0.78rem] mt-0.5">
            Leave unchecked if not — visa sponsorship is available for this role.
          </span>
        </span>
      </label>

      {error && (
        <p className="mt-5 border border-red-500/40 bg-red-500/10 text-red-200 text-[0.82rem] px-3.5 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-6 inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] disabled:opacity-60 text-black text-cond text-[1rem] px-8 py-3.5 transition-colors"
        style={{ letterSpacing: "0.02em" }}
      >
        {state === "sending" ? "Sending…" : "Submit application →"}
      </button>
    </form>
  );
}
