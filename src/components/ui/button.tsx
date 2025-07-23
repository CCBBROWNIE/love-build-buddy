import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-warm hover:scale-105",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105",
        outline:
          "border border-input bg-background hover:bg-secondary/50 hover:text-foreground hover:scale-105 hover:shadow-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105",
        ghost: "hover:bg-secondary/50 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        spark: "bg-gradient-to-r from-spark to-coral text-midnight hover:from-spark/90 hover:to-coral/90 shadow-warm hover:shadow-glow hover:scale-105 font-semibold",
        elegant: "bg-gradient-to-r from-lavender to-spark-glow text-lavender-dark hover:shadow-elegant hover:scale-105 font-medium",
        coral: "bg-gradient-to-r from-coral to-coral-light text-white hover:shadow-warm hover:scale-105 font-medium",
        minimal: "bg-background text-foreground border border-border hover:bg-secondary/30 hover:border-spark/50 hover:scale-105",
        midnight: "bg-midnight text-cream hover:bg-midnight/90 font-medium hover:scale-105",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-8 text-base font-medium",
        icon: "h-10 w-10",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
