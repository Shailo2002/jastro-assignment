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
              d="M33 25.5C33 29.6421 29.6421 33 25.5 33C21.3579 33 18 29.6421 18 25.5H12C12 32.9558 18.0442 39 25.5 39C32.9558 39 39 32.9558 39 25.5C39 18.0442 32.9558 12 25.5 12V18C29.6421 18 33 21.3579 33 25.5Z"
              fill={`url(#${id('glyph')})`}
            />
            <path
              opacity="0.5"
              d="M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5V22.5C16.4558 22.5 22.5 16.4558 22.5 9H16.5Z"
              fill={`url(#${id('glyphSmall')})`}
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
        <linearGradient
          id={id('glyph')}
          x1="25.5"
          y1="12"
          x2="25.5"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient
          id={id('glyphSmall')}
          x1="15.75"
          y1="9"
          x2="15.75"
          y2="22.5"
          gradientUnits="userSpaceOnUse"
        >
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
