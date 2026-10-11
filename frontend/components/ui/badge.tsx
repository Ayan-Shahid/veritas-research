import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Tags are solid fills with a plain border (the `tag` utility in app/globals.css derives the border
// from the fill, darker in light mode and lighter in dark mode).
const badgeVariants = cva(
  "group/badge tag inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.06em] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "[--tag-c:var(--primary)] [--tag-fg:var(--primary-foreground)]",
        secondary: "[--tag-c:var(--secondary)] [--tag-fg:var(--secondary-foreground)]",
        success: "[--tag-c:var(--success)] [--tag-fg:var(--success-foreground)]",
        warning: "[--tag-c:var(--warning)] [--tag-fg:var(--warning-foreground)]",
        destructive: "[--tag-c:var(--destructive)] [--tag-fg:var(--destructive-foreground)]",
        outline: "[--tag-c:var(--background)] [--tag-fg:var(--foreground)] border-border!",
        // Ticker symbol: opaque pale-cobalt fill, cobalt rule and text (as in the coverage table).
        ticker: "[--tag-c:var(--ticker)] [--tag-fg:var(--ticker-foreground)] border-primary! font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
