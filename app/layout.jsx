import '../src/index.css'

export const metadata = {
  title: 'CV Workspace',
  description: 'Write, version, and track your CVs',
  applicationName: 'CV Workspace',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'CV Workspace',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: {
    email: false,
    telephone: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a365d' },
    { media: '(prefers-color-scheme: dark)', color: '#181818' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
