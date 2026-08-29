import { useEffect, useState } from "react";

/**
 * Whether the viewport is wide enough for the editor's two-column layout.
 *
 * 900px is the editor shell's own breakpoint: below it the shell stacks and
 * grows to its content, which a fixed-height landing frame cannot contain. The
 * landing page uses this to decide between the live embedded editor and an
 * inert real render of the same template - a decision the editor must not
 * make itself, because as a route it owns the whole viewport either way.
 */
const DESKTOP_QUERY = "(min-width: 900px)";

export function useDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(DESKTOP_QUERY);
    const update = (): void => {
      setIsDesktop(list.matches);
    };
    // The first render read a list this effect did not create; read again so a
    // resize between render and subscription is never missed.
    update();
    list.addEventListener("change", update);
    return () => {
      list.removeEventListener("change", update);
    };
  }, []);

  return isDesktop;
}
