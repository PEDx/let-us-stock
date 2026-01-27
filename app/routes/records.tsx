;

import { RecordsPage } from "~/components/records";

export function meta() {
  return [
    { title: "Records" },
    { name: "description", content: "View your records" },
  ];
}

export default function Records() {
  return (
    <main className='page-area py-4'>
      <RecordsPage />
    </main>
  );
}
