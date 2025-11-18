import { ArrowUp } from "lucide-react";

export function Footer() {
  return (
    <footer className='page-area'>
      <div className='flex items-center justify-between py-1'>
        <p className='text-xs text-muted-foreground '>
          &copy; {new Date().getFullYear()} Let Us Stock. All rights reserved.
        </p>

        <a
          href='#'
          className='got-to-top text-xs text-muted-foreground flex items-center gap-2'>
          <ArrowUp className='size-4' />
          Go to top
        </a>
      </div>
    </footer>
  );
}
