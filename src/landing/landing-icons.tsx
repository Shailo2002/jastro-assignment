import {
  ArrowRight,
  Check,
  Code,
  History,
  Lock,
  MonitorSmartphone,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { JSX } from "react";

/**
 * The landing page's icon set, in the same shape as the editor's `Icon`:
 * components ask for a ROLE, the vendor stays behind this file, every glyph is
 * decorative (`aria-hidden`) because the text beside it carries the meaning.
 * It is a separate map rather than additions to the editor's, so marketing
 * glyphs can never leak into the shell's carefully small vocabulary.
 */

export type LandingIconName =
  | "arrow-right"
  | "check"
  | "code"
  | "history"
  | "lock"
  | "pointer"
  | "shield"
  | "sparkle"
  | "viewports";

const GLYPHS: Readonly<Record<LandingIconName, LucideIcon>> = {
  "arrow-right": ArrowRight,
  check: Check,
  code: Code,
  history: History,
  lock: Lock,
  pointer: MousePointerClick,
  shield: ShieldCheck,
  sparkle: Sparkles,
  viewports: MonitorSmartphone,
};

const ICON_CLASS = "size-5 shrink-0";

export function LandingIcon(props: {
  name: LandingIconName;
  className?: string;
}): JSX.Element {
  const Glyph = GLYPHS[props.name];
  return (
    <Glyph
      className={
        props.className === undefined
          ? ICON_CLASS
          : `${ICON_CLASS} ${props.className}`
      }
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
      data-icon={props.name}
    />
  );
}
