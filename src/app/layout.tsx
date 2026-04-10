import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MailMergeX - Bulk Email Made Easy',
  description: 'Upload contacts, create templates, and send personalized bulk emails',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster toastOptions={{
            style: { background: '#1f2937', color: '#fff' },
          }} />
        </AuthProvider>
      </body>
    </html>
  )
}
