import { useId, type JSX } from 'react'

/**
 * The product mark.
 *
 * One component for the one logo, so the gallery rail and the editor toolbar
 * can never drift into two different marks. It is always decorative: every
 * place it appears, the control or link around it carries the accessible name,
 * so the mark itself is hidden from assistive technology.
 *
 * The artwork is drawn at 48px and scales from its viewBox, so the corner
 * radius and the inner shadows stay in proportion at the 22-24px sizes the
 * chrome actually uses.
 *
 * Its ids are namespaced per instance. Two copies of a fixed id would be
 * invalid markup, and the first one on the page would win every reference -
 * which is exactly what happens when the rail and the toolbar are both mounted.
 */
export function BrandMark({ className = 'size-6' }: { className?: string }): JSX.Element {
  // React's generated id contains colons, which are awkward inside url(#…).
  const scope = useId().replace(/:/g, '')
  const id = (name: string): string => `${name}-${scope}`

  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g filter={`url(#${id('bevel')})`}>
        <g clipPath={`url(#${id('clip')})`}>
          {/* The brand fill is a token, so the mark stays part of the palette. */}
          <rect width="48" height="48" rx="12" fill="var(--brand-mark)" />
          <rect width="48" height="48" fill={`url(#${id('sheen')})`} />
          <g filter={`url(#${id('glyphShadow')})`}>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M39 24C39 32.2843 32.2843 39 24 39C16.644 39 10.5247 33.705 9.24572 26.7185C9.24186 26.6974 9.23805 26.6763 9.23428 26.6552C9.08034 25.7934 9 24.9061 9 24C9 23.2766 9.05121 22.5652 9.1502 21.8691C10.0858 15.2901 15.2901 10.0858 21.8691 9.1502C21.8801 9.14863 21.8912 9.14707 21.9022 9.14553C22.5877 9.0496 23.2881 9 24 9C24.9283 9 25.8368 9.08432 26.7185 9.24572C33.705 10.5247 39 16.644 39 24ZM35.25 24C35.25 30.2132 30.2132 35.25 24 35.25C19.3179 35.25 15.3038 32.3897 13.6098 28.3212C14.3057 28.4388 15.0207 28.5 15.75 28.5C22.7916 28.5 28.5 22.7916 28.5 15.75C28.5 15.0207 28.4388 14.3057 28.3212 13.6098C32.3897 15.3038 35.25 19.3179 35.25 24ZM24.2388 12.7525C24.5699 13.6901 24.75 14.699 24.75 15.75C24.75 20.7206 20.7206 24.75 15.75 24.75C14.699 24.75 13.6901 24.5699 12.7525 24.2388C12.7508 24.1594 12.75 24.0798 12.75 24C12.75 17.7868 17.7868 12.75 24 12.75C24.0798 12.75 24.1594 12.7508 24.2388 12.7525Z"
              fill={`url(#${id('glyph')})`}
            />
          </g>
        </g>
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="11"
          stroke={`url(#${id('rim')})`}
          strokeWidth="2"
        />
      </g>
      <defs>
        <filter
          id={id('bevel')}
          x="0"
          y="-3"
          width="48"
          height="54"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-3" />
          <feGaussianBlur stdDeviation="1.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="shape" result="innerTop" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3" />
          <feGaussianBlur stdDeviation="1.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="innerTop" result="innerBottom" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology radius="1" operator="erode" in="SourceAlpha" result="innerEdge" />
          <feOffset />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="innerBottom" result="innerEdge" />
        </filter>
        <filter
          id={id('glyphShadow')}
          x="6"
          y="5.25"
          width="36"
          height="42"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology radius="1.5" operator="erode" in="SourceAlpha" result="dropShadow" />
          <feOffset dy="2.25" />
          <feGaussianBlur stdDeviation="2.25" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="dropShadow" result="shape" />
        </filter>
        <linearGradient
          id={id('sheen')}
          x1="24"
          y1="5.96047e-07"
          x2="26"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={id('glyph')} x1="24" y1="9" x2="24" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.12" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('clip')}>
          <rect width="48" height="48" rx="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
