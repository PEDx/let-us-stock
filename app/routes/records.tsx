"use client";

import { useI18n } from "~/lib/i18n";
import { Construction } from "lucide-react";

export function meta() {
  return [
    { title: "Records" },
    { name: "description", content: "View your records" },
  ];
}

export default function Records() {
  const { t } = useI18n();

  return (
    <main className='page-area py-4'>
      <div className='flex h-60 flex-col items-center justify-center text-muted-foreground'>
        <Construction className='mb-4 size-12 opacity-50' />
        <h2 className='text-lg font-medium'>{t.nav.records}</h2>
        <p className='text-sm'>Coming soon...</p>
      </div>
    </main>
  );
}
