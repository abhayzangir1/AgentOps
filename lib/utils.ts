import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Copy text to the clipboard with a graceful fallback.
 *
 * The async Clipboard API (navigator.clipboard.writeText) is blocked by
 * permissions policy in many embedded/iframe contexts (e.g. the preview
 * sandbox), which throws a NotAllowedError. We try it first, then fall back
 * to a hidden <textarea> + document.execCommand('copy'), which works without
 * the clipboard-write permission. Returns true if the copy succeeded.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred path: async Clipboard API (requires permission + secure context)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy method below
    }
  }

  // Fallback: hidden textarea + execCommand (works inside restricted iframes)
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }

  return false
}
