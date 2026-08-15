'use client'

import { useEffect } from 'react'

export const PwaRegister = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return undefined
    if (!('serviceWorker' in navigator)) return undefined

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error)
      })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })

    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
