import { useEffect, useRef } from 'react'

// Lets a dialog close on Escape wherever focus currently is.
export const useEscapeKey = (active, onEscape) => {
  const handlerRef = useRef(onEscape)
  handlerRef.current = onEscape

  useEffect(() => {
    if (!active) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handlerRef.current?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active])
}
