import './globals.css'

export const metadata = {
  title: 'Admin Dashboard | Dropbox Excel Generator',
  description: 'Manage users and settings',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
