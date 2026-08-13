import '../src/index.css'

export const metadata = {
  title: 'CV Workspace',
  description: 'Write, version, and track your CVs',
  applicationName: 'CV Workspace',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
