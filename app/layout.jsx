import '../src/index.css'

export const metadata = {
  title: 'CV Workspace',
  description: 'Manage and edit your CVs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
