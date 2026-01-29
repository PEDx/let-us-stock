interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox='0 0 120 32'
      className={className}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'>
      {/* Rounded book with # symbol */}
      <g strokeLinecap='round' strokeLinejoin='round'>
        <rect
          x='4'
          y='4'
          width='24'
          height='24'
          rx='6'
          className='fill-foreground'
        />
        <rect
          x='7.5'
          y='7'
          width='17'
          height='18'
          rx='3.5'
          className='stroke-background'
          fill='none'
          strokeWidth='1.4'
        />
        <g className='stroke-background' strokeWidth='1.6'>
          <path d='M12 10V22' />
          <path d='M16 10V22' />
          <path d='M10 13H18' />
          <path d='M10 17H18' />
        </g>
      </g>

      {/* Text: numbook */}
      <text
        x='36'
        y='22'
        className='fill-foreground'
        fontSize='18'
        fontWeight='600'
        letterSpacing='-0.5'>
        num
      </text>
      <text
        x='71'
        y='22'
        className='fill-foreground'
        fontSize='18'
        fontWeight='400'
        letterSpacing='-0.5'>
        book
      </text>
    </svg>
  );
}
