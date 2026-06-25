'use client'

import React, { useState } from 'react'
import { Info, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/simple-ui'

interface HelpTooltipProps {
  title: string
  content: string | React.ReactNode
  variant?: 'info' | 'warning' | 'success' | 'help'
  className?: string
}

export function HelpTooltip({
  title,
  content,
  variant = 'info',
  className = '',
}: HelpTooltipProps) {
  const iconVariants = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    help: <HelpCircle className="w-4 h-4 text-purple-500" />,
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity ${className}`}
            aria-label={`Help: ${title}`}
            type="button"
          >
            {iconVariants[variant]}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline help section for detailed explanations
interface InlineHelpProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function InlineHelp({ title, children, className = '' }: InlineHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        type="button"
      >
        <HelpCircle className="w-4 h-4" />
        {title}
        <span className="text-xs text-muted-foreground">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="pl-6 py-2 border-l-2 border-blue-200 text-sm text-muted-foreground space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

// Help drawer for complex explanations
export function HelpDrawer() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="rounded-full bg-blue-500 text-white p-3 shadow-lg hover:bg-blue-600 transition-colors"
              aria-label="Help"
              type="button"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="w-64">
            <div className="space-y-2">
              <p className="font-semibold">Need help?</p>
              <ul className="text-sm space-y-1">
                <li>• Click info icons (i) for quick tips</li>
                <li>• Read our How-To Guide in the menu</li>
                <li>• Check Terms & Conditions for policies</li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
