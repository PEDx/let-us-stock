;

import { AssetsPage } from "~/components/assets";

export function meta() {
  return [
    { title: "Assets" },
    { name: "description", content: "Manage your assets" },
  ];
}

export default function Assets() {
  return (
    <main className='page-area py-4'>
      <AssetsPage />
    </main>
  );
}
