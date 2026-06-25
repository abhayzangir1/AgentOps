import React from 'react'

// Badge
export function Badge({ className = '', variant, ...props }: { variant?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
      {...props}
    />
  )
}

// Input
export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

// Progress
export function Progress({ value = 0, className = '', ...props }: { value?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

// Tabs
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ value, onValueChange, ...props }: TabsProps) {
  return <div {...props} data-value={value} />
}

export function TabsList({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
      {...props}
    />
  )
}

export function TabsTrigger({ value, ...props }: { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      role="tab"
      data-value={value}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      {...props}
    />
  )
}

export function TabsContent({ value, ...props }: { value: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tabpanel"
      data-value={value}
      className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      {...props}
    />
  )
}

// Tooltip
interface TooltipProviderProps {
  children: React.ReactNode
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
}

export function Tooltip({ children }: TooltipProps) {
  return <div className="group relative inline-block">{children}</div>
}

export function TooltipTrigger({ asChild, ...props }: { asChild?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (asChild && props.children) {
    return (props.children as React.ReactElement)
  }
  return (
    <button
      type="button"
      className="cursor-help"
      {...props}
    />
  )
}

export function TooltipContent({ className = '', side, ...props }: { side?: string; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`absolute bottom-full left-1/2 mb-2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 w-max rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md transition-opacity ${className}`}
      {...props}
    />
  )
}
