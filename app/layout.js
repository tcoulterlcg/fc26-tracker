import './globals.css'

export const metadata = {
  title: 'Roster HQ',
  description: 'Franchise and career mode tracker for sports video games',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-neutral-950" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}