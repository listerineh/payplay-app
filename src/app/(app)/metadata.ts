import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PayPlan App',
  description: 'Manage your finances and savings with this free-to-use app.',
  keywords: ['Pay', 'Plan', 'Saving', 'Budget', 'Expense', 'Finance', 'Budgeting', 'Saving'],
  generator: "Next.js",
  manifest: '/manifest.json',
  referrer: "origin",
  publisher: "Vercel",
  authors: [
    {
      name: 'Listerineh',
      url: 'https://listerineh.dev',
    },
  ],
  openGraph: {
    title: 'PayPlan App',
    description: 'Manage your finances and savings with this free-to-use app.',
    url: 'https://payplan-app.vercel.app',
    siteName: 'PayPlan App',
    images: [
      {
        url: '/images/website_screenshot.webp',
        width: 1200,
        height: 620,
        alt: 'PayPlan App Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title: 'PayPlan App',
    description: 'Manage your finances and savings with this free-to-use app.',
    images: [
      {
        url: '/images/website_screenshot.webp',
        width: 1200,
        height: 620,
        alt: 'PayPlan App Preview',
      },
    ],
    card: 'summary_large_image',
  },
}