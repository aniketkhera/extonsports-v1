import type { Metadata } from 'next'
import LegalPage, { type Section } from '@/app/components/LegalPage'
import { CONTACT_EMAIL, FACILITY_ADDRESS_LINE } from '@/lib/legal'

// ⚠️ DRAFT — reviewed by no lawyer. This page existed as a dead footer link (/privacy
// returned 404 to every visitor) until 2026-08-13. It is modelled on the equivalent page
// on squashtigers.com, which is operated by the same owner, and states what this site
// actually does today. Have it reviewed before relying on it.
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Exton Sports Center collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
}

const SECTIONS: Section[] = [
  {
    title: 'Our commitment',
    body: 'We only use the information we collect about you lawfully, and only for the purposes described here: answering your enquiries, managing membership and guest access, and running the club. We do not sell your personal information for money, and we share it only as described below.',
  },
  {
    title: 'What we collect',
    body: 'Information you give us — your name, email address, phone number, and anything else you choose to tell us when you join the waitlist, apply for a job, enquire about membership, or contact us.\n\nInformation collected automatically — basic analytics about how the site is used, including pages visited and approximate location derived from your IP address.',
  },
  {
    title: 'Text messages (SMS)',
    body: 'If you call or text our contact line, we may reply by text message at the number you contacted us from. We only text people who contacted us first — there is no sign-up list and no marketing messages. Reply STOP to any message to stop receiving them, or HELP for help; message and data rates may apply.\n\nTo deliver those messages we share your mobile number with Twilio Inc., our messaging provider, solely so the message reaches you. No mobile information is sold, rented, or shared with third parties or affiliates for their own marketing or promotional purposes. Full details are in our SMS Terms.',
  },
  {
    title: 'Who we share it with',
    body: 'Service providers who help us run the club and this website, and only so they can do that job: Twilio Inc. (text messages), our email delivery provider, our website host, and analytics providers. Coaching and court booking are delivered through Orangish, our club-management platform, which handles booking and membership data under its own privacy policy.\n\nWe do not sell your personal information.',
  },
  {
    title: 'Cookies and analytics',
    body: 'A cookie is a small file placed on your device to make a website work. We use analytics cookies to understand which pages are visited and how the site performs. You can disable cookies in your browser settings, though parts of the site may not work as intended.',
  },
  {
    title: 'Data security and retention',
    body: 'Personal data is stored according to our internal security practices and applicable law. We keep information for as long as it is needed for the purpose it was collected for, and then delete it.',
  },
  {
    title: 'Your choices',
    body: `You can ask us what information we hold about you, ask us to correct it, or ask us to delete it. Email ${CONTACT_EMAIL} and we will respond. To stop text messages, reply STOP to any message. To stop marketing email, use the unsubscribe link in any message we send.`,
  },
  {
    title: 'Children',
    body: 'The club welcomes junior members, and information about a child is provided by a parent or guardian. We do not knowingly collect information directly from children through this website.',
  },
  {
    title: 'Where we are',
    body: `The club is at ${FACILITY_ADDRESS_LINE}. The company operating it is named at the foot of this page.`,
  },
  {
    title: 'Changes to this policy',
    body: 'Changes will be posted on this page with an updated date at the top.',
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="13 August 2026"
      sections={SECTIONS}
    />
  )
}
