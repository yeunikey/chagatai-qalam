"use client";

import { Keyboard, Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const services = [
  {
    href: "/",
    label: "Qalam",
    description: "клавиатура",
    icon: Keyboard,
  },
  {
    href: "/ramz",
    label: "Ramz",
    description: "нормализация",
    icon: Shuffle,
  },
];

export default function AppHeader() {
  const pathname = usePathname();
  const isRamz = pathname.startsWith("/ramz");
  const title = isRamz ? "Chagatai Ramz" : "Chagatai Qalam";
  const description = isRamz
    ? "Нормализация арабографичного чагатайского текста."
    : "Чагатайская клавиатура с быстрым вводом и подсказками.";

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
              width={40}
              height={40}
              className="h-[40px] w-[40px] object-contain"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-5">
              {title}
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">
              {description}
            </span>
          </span>
        </Link>

        <nav
          className="flex flex-none items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm"
          aria-label="Сервисы"
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
