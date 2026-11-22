import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn-style local component: source stays owned by the monorepo.
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: {
    default: "bg-blue-500 text-white hover:bg-blue-400",
    outline: "border border-slate-700 text-slate-200 hover:bg-slate-800",
  } }, defaultVariants: { variant: "default" } },
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export function Button({ asChild = false, variant, className, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={twMerge(clsx(buttonVariants({ variant }), className))} {...props} />;
}
