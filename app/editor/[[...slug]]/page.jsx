'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[var(--app-canvas)]" />,
})

export default function EditorPage() {
  return <App />
}
