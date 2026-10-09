import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// btn-mesh / btn-glass live in app/globals.css (same-colour mesh gradients, gradient borders).
// Focus uses `outline` rather than a ring: rings are box-shadows and would fight the button's own shadows.
const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold whitespace-nowrap select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
      variants: {
        variant: {
          default: "btn-mesh",
          outline: "btn-glass aria-expanded:[--btn-ring-a:85%] aria-expanded:[--btn-ring-b:60%]",
          secondary:
              "btn-mesh [--btn-c:var(--secondary)] [--btn-fg:var(--secondary-foreground)] [--btn-hi-dl:0.03] [--btn-mid-dl:0.015] [--btn-lo-dl:-0.05] [--btn-deep-dl:-0.09] [--btn-text-shadow:none]",
          ghost:
              "border border-transparent transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
          destructive:
              "btn-glass [--btn-c:var(--destructive)] [--btn-fg:color-mix(in_oklch,var(--destructive)_72%,black)] dark:[--btn-fg:var(--destructive)]",
          link: "text-primary underline-offset-4 transition-colors hover:underline",
        },
        size: {
          default:
              "h-10 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
          xs: "h-7 gap-1.5 rounded-[10px] px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
          sm: "h-9 gap-1.5 rounded-[11px] px-4 text-[0.8125rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
          lg: "h-12 gap-2 rounded-[14px] px-7 text-base has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-[1.15rem]",
          xl: "h-14 gap-2.5 rounded-2xl px-9 text-base has-data-[icon=inline-end]:pr-8 has-data-[icon=inline-start]:pl-8 [&_svg:not([class*='size-'])]:size-5",
          icon: "size-10",
          "icon-xs":
              "size-7 rounded-[10px] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
          "icon-sm": "size-9 rounded-[11px] in-data-[slot=button-group]:rounded-lg",
          "icon-lg": "size-12 rounded-[14px] [&_svg:not([class*='size-'])]:size-5",
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