import { useEffect } from "react";
// Records whether the last input was the keyboard or a pointer, so keyboard-driven actions can skip animation (see instrument.css).
export function useInputMode() {
  useEffect(() => {
    const root = document.documentElement;
    const key = () => { root.dataset.input = "keyboard"; };
    const point = () => { root.dataset.input = "pointer"; };
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", point, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", point, true);
      delete root.dataset.input;
    };
  }, []);
}
