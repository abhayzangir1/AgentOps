import Razorpay from 'razorpay'

let instance: Razorpay | null = null

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function getRazorpay(): Razorpay {
  if (!instance) {
    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_id || !key_secret) {
      throw new Error('Razorpay not configured: missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET')
    }
    instance = new Razorpay({ key_id, key_secret })
  }
  return instance
}

export const GROWTH_PLAN_ID = process.env.RAZORPAY_GROWTH_PLAN_ID
export const PUBLIC_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
