import '../src/index.css'

export const metadata = {
  title: 'Vellum',
  description: 'Write, version, and track your CVs',
  applicationName: 'Vellum',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
