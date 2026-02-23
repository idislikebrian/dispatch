import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./button.module.css";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const combinedClassName = `
      ${styles.button}
      ${styles[variant]}
      ${size !== "default" ? styles[size] : ""}
      ${className}
    `;

    return <Comp ref={ref} className={combinedClassName} {...props} />;
  }
);

Button.displayName = "Button";