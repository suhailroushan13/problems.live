"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva("group/tabs-list relative inline-flex w-fit items-center justify-center rounded-md p-1 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const tabsIndicatorVariants = cva(
  "pointer-events-none absolute z-0 transition-[left,top,width,height] duration-200 ease-out",
  {
    variants: {
      variant: {
        default: "rounded-full bg-background shadow-sm",
        line: "rounded-none bg-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type IndicatorRect = { left: number; top: number; width: number; height: number }

/** Slides a background/underline behind the active trigger instead of snapping. */
function TabsIndicator({
  listRef,
  variant,
}: {
  listRef: React.RefObject<HTMLDivElement | null>
  variant: "default" | "line"
}) {
  const [rect, setRect] = React.useState<IndicatorRect | null>(null)
  const [animate, setAnimate] = React.useState(false)

  const measure = React.useCallback(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-state="active"]'
    )
    if (!active) {
      // Bail out via the functional form so React skips the render entirely
      // when nothing changed — a fresh `null` literal here would otherwise
      // still count as "new state" and re-trigger this effect forever.
      setRect((prev) => (prev === null ? prev : null))
      return
    }
    const next: IndicatorRect = {
      left: active.offsetLeft,
      top: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    }
    setRect((prev) =>
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.width === next.width &&
      prev.height === next.height
        ? prev
        : next
    )
  }, [listRef])

  React.useLayoutEffect(() => {
    measure()
  })

  React.useEffect(() => {
    // Skip the entrance transition on first paint so the indicator doesn't
    // slide in from the top-left corner.
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(list)

    return () => resizeObserver.disconnect()
  }, [listRef, measure])

  if (!rect) return null

  const style =
    variant === "line"
      ? { left: rect.left, top: rect.top + rect.height + 5, width: rect.width, height: 2 }
      : { left: rect.left, top: rect.top, width: rect.width, height: rect.height }

  return (
    <span
      aria-hidden="true"
      data-slot="tabs-indicator"
      className={cn(tabsIndicatorVariants({ variant }), !animate && "transition-none")}
      style={style}
    />
  )
}

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null)

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <TabsIndicator listRef={listRef} variant={variant ?? "default"} />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn("relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsIndicatorVariants }
