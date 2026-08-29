import { motion, useReducedMotion } from "motion/react";
import type { JSX, ReactNode } from "react";

/**
 * The landing page's one entrance: fade up as the section scrolls into view,
 * once. Reduced motion keeps the fade and drops the travel, so content still
 * arrives without anything on the page moving. Everything below the hero uses
 * this wrapper rather than composing its own variants, so the page has a
 * single rhythm instead of eight.
 */
export function Reveal(props: {
  children: ReactNode;
  className?: string;
  /** Seconds of hold-back, for staggering siblings inside one section. */
  delay?: number;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={props.className}
      initial={
        prefersReducedMotion === true ? { opacity: 0 } : { opacity: 0, y: 28 }
      }
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: prefersReducedMotion === true ? 0.2 : 0.7,
        delay: props.delay ?? 0,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {props.children}
    </motion.div>
  );
}
