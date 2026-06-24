"use client";

import { Grid3X3, Keyboard, Languages, Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const services = [
  {
    href: "/",
    label: "Services",
    description: "catalog",
    icon: Grid3X3,
  },
  {
    href: "/qalam",
    label: "Qalam",
    description: "keyboard",
    icon: Keyboard,
  },
  {
    href: "/ramz",
    label: "Ramz",
    description: "normalizer",
    icon: Shuffle,
  },
  {
    href: "/translate",
    label: "Translate",
    description: "models",
    icon: Languages,
  },
];

const pageMeta = {
  "/": {
    title: "Chagatai Tools",
    description: "Ready services for Chagatai text work.",
  },
  "/qalam": {
    title: "Chagatai Qalam",
    description: "Chagatai keyboard with fast input and suggestions.",
  },
  "/ramz": {
    title: "Chagatai Ramz",
    description: "Normalization for Arabic-script Chagatai text.",
  },
  "/translate": {
    title: "Chagatai Translate",
    description: "Translation with selectable models.",
  },
};

export default function AppHeader() {
  const pathname = usePathname();
  const currentMeta = pathname.startsWith("/ramz")
    ? pageMeta["/ramz"]
    : pathname.startsWith("/translate")
      ? pageMeta["/translate"]
    : pathname.startsWith("/qalam")
      ? pageMeta["/qalam"]
      : pageMeta["/"];

  return (
    <header className="sticky top-0 z-40 bg-background/95 px-4 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 text-slate-900"
          aria-label="Chagatai workbench"
        >
          <span className="flex items-center justify-center text-white">
            <Image
              src="/logo2.png"
              alt=""
              width={34}
              height={40}
              className="object-contain"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-5">
              {currentMeta.title}
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">
              {currentMeta.description}
            </span>
          </span>
        </Link>

        <nav
          className="flex flex-none items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm"
          aria-label="Services"
        >
          {services.map((service) => {
            const Icon = service.icon;
            const isActive =
              service.href === "/"
                ? pathname === "/"
                : pathname.startsWith(service.href);

            return (
              <Link
                key={service.href}
                href={service.href}
                className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{service.label}</span>
                <span
                  className={`hidden text-xs font-medium md:inline ${
                    isActive ? "text-slate-200" : "text-slate-400"
                  }`}
                >
                  {service.description}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
