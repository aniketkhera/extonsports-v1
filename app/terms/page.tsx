import type { Metadata } from 'next'
import LegalPage, { type Section } from '@/app/components/LegalPage'
import { CONTACT_EMAIL } from '@/lib/legal'

// ⚠️ DRAFT — reviewed by no lawyer. This page existed as a dead footer link (/terms
// returned 404 to every visitor) until 2026-08-13. It states what this site actually does
// today and deliberately does NOT invent membership terms, cancellation rules or fees —
// those are set in the membership agreement, not here, and inventing them would be worse
// than the 404 it replaces.
export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for use of the Exton Sports Center website.',
  alternates: { canonical: '/terms' },
}

const SECTIONS: Section[] = [
  {
    title: 'What these terms cover',
    body: 'These terms apply to your use of the extonsports.com website. They do not set the terms of membership, guest access, or coaching — those are set out in the membership agreement and the waiver you sign, and those documents take precedence over anything on this website.',
  },
  {
    title: 'Information on this site',
    body: 'We keep the information here as accurate as we can, but facilities, opening arrangements, sports offered and pricing can change. Nothing on this website is an offer or a guarantee of availability. Confirm anything you intend to rely on with us directly before travelling.',
  },
  {
    title: 'Enquiries and the waitlist',
    body: 'Joining the waitlist or sending an enquiry does not create a membership, reserve a place, or guarantee access. It tells us you are interested and lets us contact you about it.',
  },
  {
    title: 'Contacting you',
    body: 'If you give us your phone number or email address, we may use it to reply to you. Text messaging is covered by our SMS Terms, and how we handle your information generally is covered by our Privacy Policy.',
  },
  {
    title: 'Acceptable use',
    body: 'Please do not attempt to disrupt this website, access areas of it you have not been given access to, or use it to send anything unlawful. Job applications and enquiries should be genuine.',
  },
  {
    title: 'Intellectual property',
    body: 'The Exton Sports Center name, logo, site design, text and images belong to us or our licensors, and may not be reproduced without permission.',
  },
  {
    title: 'Other sites and services',
    body: 'This site links to services we do not operate, including Orangish for booking and membership management, and mapping and messaging services. Their own terms apply to what you do there.',
  },
  {
    title: 'Liability',
    body: 'This website is provided as-is. We are not liable for loss arising from reliance on information on it, to the extent the law allows. Nothing here limits liability that cannot lawfully be limited — including liability for death or personal injury caused by negligence.\n\nPhysical use of the facility is governed by the waiver and membership agreement, not by this page.',
  },
  {
    title: 'Governing law',
    body: 'These terms are governed by the laws of the Commonwealth of Pennsylvania, where the facility is located.',
  },
  {
    title: 'Questions',
    body: `Email ${CONTACT_EMAIL}.`,
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="13 August 2026"
      sections={SECTIONS}
    />
  )
}
