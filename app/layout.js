import './globals.css'

export const metadata = {
  title: 'Roster HQ',
  description: 'Franchise and career mode tracker for sports video games',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950">
        {children}
      </body>
    </html>
  )
}