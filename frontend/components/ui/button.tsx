import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// btn-mesh / btn-plain live in app/globals.css: filled buttons keep the same-colour mesh gradient,
// everything else is a flat fill with one plain border. No bevels, glows or shadows.
const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-xs text-sm font-medium whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
      variants: {
        variant: {
          default: "btn-mesh",
          success: "btn-mesh [--btn-c:var(--success)] [--btn-fg:var(--success-foreground)]",
          destructive: "btn-mesh [--btn-c:var(--destructive)] [--btn-fg:var(--destructive-foreground)]",
          secondary: "btn-plain [--btn-bg:var(--secondary)] [--btn-fg:var(--secondary-foreground)]",
          outline: "btn-plain [--btn-bg:color-mix(in_oklch,var(--background)_55%,transparent)]",
          "outline-destructive":
              "btn-plain [--btn-bg:color-mix(in_oklch,var(--background)_55%,transparent)] [--btn-fg:var(--destructive)] [--btn-border-hover:var(--destructive)]",
          ghost:
              "border border-transparent transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
          link: "text-primary underline-offset-4 transition-colors hover:underline",
        },
        size: {
          default:
              "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
          xs: "h-7 gap-1.5 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
          sm: "h-8 gap-1.5 px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
          lg: "h-11 gap-2 px-6 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 [&_svg:not([class*='size-'])]:size-[1.05rem]",
          xl: "h-12 gap-2.5 px-8 text-base has-data-[icon=inline-end]:pr-7 has-data-[icon=inline-start]:pl-7 [&_svg:not([class*='size-'])]:size-5",
          icon: "size-9",
          "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
          "icon-sm": "size-8",
          "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-5",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
)

function Button({
                  className,
                  variant = "default",
                  size = "default",
                  ...props
                }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
      <ButtonPrimitive
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
      />
  )
}

export { Button, buttonVariants }