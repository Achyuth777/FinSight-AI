import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
const variantClass = { default: "primary", outline: "outline", ghost: "ghost" };
const sizeClass = { default: "", sm: "small" };
export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof variantClass;
  size?: keyof typeof sizeClass;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={["button", variantClass[variant], sizeClass[size], className].filter(Boolean).join(" ")} {...props} />;
}
