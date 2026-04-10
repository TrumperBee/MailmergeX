import Link from 'next/link'
import { Send, Mail, Users, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MailMergeX</span>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Bulk Email Made{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
              Effortless
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Upload your contacts, create personalized templates, and send bulk
            emails that actually feel personal. No coding required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors text-lg"
            >
              Start for Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors text-lg"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything you need for email marketing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                CSV Import
              </h3>
              <p className="text-gray-400">
                Upload your contact list in seconds. We automatically detect
                columns and validate emails.
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Smart Templates
              </h3>
              <p className="text-gray-400">
                Use placeholders like {'{{name}}'} and {'{{company}}'} to
                personalize every email automatically.
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Fast Delivery
              </h3>
              <p className="text-gray-400">
                Send to thousands with smart rate limiting. Track sent, failed,
                and opened emails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to supercharge your email marketing?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of businesses using MailMergeX to connect with their
            audience.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors text-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-500" />
            <span className="text-gray-400">MailMergeX</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 MailMergeX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
