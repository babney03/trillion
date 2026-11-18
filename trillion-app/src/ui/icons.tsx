import type { ReactNode, SVGProps } from 'react'

/** One icon family: 24px grid, 1.6 stroke, round joins. */
function Icon({ children, size = 20, ...rest }: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}
type P = { size?: number }

export const Mark = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
    <path d="M6.5 8h11M12 8v9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)
export const IconCommand = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5M12 20.5A8.5 8.5 0 0 1 3.5 12" />
  </Icon>
)
export const IconMarkets = (p: P) => (
  <Icon {...p}>
    <path d="M6 4v4M6 14v6M12 3v6M12 16v5M18 6v3M18 15v4" />
    <rect x="4.2" y="8" width="3.6" height="6" rx="1" />
    <rect x="10.2" y="9" width="3.6" height="7" rx="1" />
    <rect x="16.2" y="9" width="3.6" height="6" rx="1" />
  </Icon>
)
export const IconIntel = (p: P) => (
  <Icon {...p}>
    <path d="M5 5h11a3 3 0 0 1 3 3v11H8a3 3 0 0 1-3-3z" />
    <path d="M9 9.5h6M9 13h6M9 16.5h3" />
  </Icon>
)
export const IconTrends = (p: P) => (
  <Icon {...p}>
    <path d="M12 3c.6 3.4 4.5 5 4.5 9.2A4.5 4.5 0 0 1 12 17a4.500 4.500 0 0 1-4.500-4.800C7.500 10.400 9 9.700 9.500 8c1.200.800 2 1.800 2.500 3" />
    <path d="M7 20.500h10" />
  </Icon>
)
export const IconBot = (p: P) => (
  <Icon {...p}>
    <rect x="4.500" y="8" width="15" height="11" rx="3" />
    <path d="M12 8V4.500M9.500 13v1.500M14.500 13v1.500M2.500 13v2M21.500 13v2" />
  </Icon>
)
export const IconBacktest = (p: P) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.400-5.700" />
    <path d="M4 4.500v4h4M12 8v4.300l2.800 1.700" />
  </Icon>
)
export const IconMic = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="3.500" width="6" height="10.500" rx="3" />
    <path d="M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v2.500" />
  </Icon>
)
export const IconSend = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h13M13 6.500l5.500 5.500-5.500 5.500" />
  </Icon>
)
export const IconAlert = (p: P) => (
  <Icon {...p}>
    <path d="M12 4.500 3.500 19h17z" />
    <path d="M12 10.500v4M12 16.800v.2" />
  </Icon>
)
export const IconCheck = (p: P) => (
  <Icon {...p}>
    <path d="m5.500 12.500 4 4 9-9.500" />
  </Icon>
)
export const IconChevron = (p: P) => (
  <Icon {...p}>
    <path d="m9.500 6 6 6-6 6" />
  </Icon>
)
export const IconExternal = (p: P) => (
  <Icon {...p}>
    <path d="M10 6H6.500A1.500 1.500 0 0 0 5 7.500v10A1.500 1.500 0 0 0 6.500 19h10a1.500 1.500 0 0 0 1.500-1.500V14M14 5h5v5M19 5l-8 8" />
  </Icon>
)
export const IconPlay = (p: P) => (
  <Icon {...p}>
    <path d="M8 5.500v13l10.500-6.500z" />
  </Icon>
)
export const IconJournal = (p: P) => (
  <Icon {...p}>
    <rect x="4.500" y="5" width="15" height="14.500" rx="2.500" />
    <path d="M4.500 9.500h15M9 3v4M15 3v4M8.500 13.500h2M13.500 13.500h2M8.500 16.500h2" />
  </Icon>
)
