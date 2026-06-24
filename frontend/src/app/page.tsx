import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Download,
  FileText,
  Keyboard,
  Languages,
  Sparkles,
  TextCursorInput,
  Wand2,
} from "lucide-react";

const categories = [
  "All",
  "Input",
  "Translation",
  "Normalization",
  "Files",
  "AI assistance",
  "Saved text",
];

const services = [
  {
    title: "Qalam Keyboard",
    description:
      "Type Chagatai Arabic-script text with the on-screen keyboard, final-letter variants, spacing and backspace controls.",
    href: "/qalam",
    status: "Ready",
    category: "Input",
    icon: Keyboard,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Word Suggestions",
    description:
      "Get live next-word suggestions from the prediction service while composing text in Qalam.",
    href: "/qalam",
    status: "Ready in Qalam",
    category: "AI assistance",
    icon: Sparkles,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Bookmarks",
    description:
      "Save reusable words or phrases locally, insert them back into the editor, copy them, or remove them later.",
    href: "/qalam",
    status: "Ready in Qalam",
    category: "Saved text",
    icon: Bookmark,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Chagatai Translate",
    description:
      "Translate text with selectable CPU Hugging Face models: TranslateGemma dLoRA v5 or NLLB200 SmartInit v5.",
    href: "/translate",
    status: "Ready",
    category: "Translation",
    icon: Languages,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Ramz Text Normalizer",
    description:
      "Normalize pasted Chagatai text, compare changes, tune options, and keep the normalized result in view.",
    href: "/ramz",
    status: "Ready",
    category: "Normalization",
    icon: Languages,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "File Normalization",
    description:
      "Upload a text file for Ramz normalization and process the content through the same rules as pasted text.",
    href: "/ramz",
    status: "Ready in Ramz",
    category: "Files",
    icon: FileText,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Download Result",
    description:
      "Export the normalized Ramz output after checking the detected changes and final text.",
    href: "/ramz",
    status: "Ready in Ramz",
    category: "Files",
    icon: Download,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Final Letter Variants",
    description:
      "Click highlighted final forms in Qalam to switch between supported Kaf and Ng variants without retyping.",
    href: "/qalam",
    status: "Ready in Qalam",
    category: "Input",
    icon: Wand2,
    tone: "bg-[#eef5ff] text-primary",
  },
  {
    title: "Text Composer",
    description:
      "Use the large right-to-left editor with font-size controls, copy, clear, and direct insertion from the keyboard.",
    href: "/qalam",
    status: "Ready in Qalam",
    category: "Input",
    icon: TextCursorInput,
    tone: "bg-[#eef5ff] text-primary",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-500">
            Current ready services
          </span>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-900 md:text-3xl">
            Every Chagatai text tool in one place
          </h1>
          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-500 md:text-base">
            Qalam brings together the tools that are already working: Arabic-script input, predictive suggestions, saved snippets, Ramz normalization, file processing, and result export.
          </p>
        </section>

        <nav
          className="flex flex-wrap gap-2"
          aria-label="Service categories"
        >
          {categories.map((category, index) => (
            <span
              key={category}
              className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-semibold shadow-sm ${
                index === 0
                  ? "bg-primary text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              {category}
            </span>
          ))}
        </nav>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                className="group flex min-h-56 flex-col justify-between rounded-2xl bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
              >
                <div>
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl ${service.tone}`}
                    >
                      <Icon size={22} strokeWidth={2.2} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      {service.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold tracking-normal text-slate-900">
                    {service.title}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CheckCircle2 size={15} className="text-[#4f9b67]" />
                    {service.status}
                  </span>
                  <ArrowRight
                    size={18}
                    className="text-slate-400 transition-colors group-hover:text-slate-700"
                  />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
