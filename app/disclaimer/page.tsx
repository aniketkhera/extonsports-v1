import type { Metadata } from 'next'
import LegalPage, { type Section } from '@/app/components/LegalPage'
import { CONTACT_EMAIL } from '@/lib/legal'

// ⚠️ DRAFT — reviewed by no lawyer. This page existed as a dead footer link (/disclaimer
// returned 404 to every visitor) until 2026-08-13.
//
// Deliberately narrow. A disclaimer page cannot do the work of the waiver a member signs,
// and writing one that sounds like it can is worse than useless — it invites someone to
// believe the risk position is settled by a web page. This says what the site is not, and
// points at the documents that actually govern physical use of the facility.
export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'What the Exton Sports Center website does and does not tell you.',
  alternates: { canonical: '/disclaimer' },
}

const SECTIONS: Section[] = [
  {
    title: 'General information only',
    body: 'Everything on this website is general information about the club. It is not professional, medical, coaching, or legal advice, and it is not a substitute for speaking to us.',
  },
  {
    title: 'Sport carries risk',
    body: 'Squash, badminton, cricket, indoor turf and fitness training all carry a risk of injury. Nothing on this website reduces that risk or implies that any activity is suitable for you.\n\nIf you have a medical condition, an injury, or you are returning to sport after time away, speak to a doctor before playing. If you are unsure whether a session or programme suits your level, ask us and we will tell you honestly.',
  },
  {
    title: 'The waiver governs, not this page',
    body: 'Physical use of the facility is governed by the waiver and membership agreement you sign, not by this website. Where anything here differs from those documents, those documents apply.',
  },
  {
    title: 'Availability and accuracy',
    body: 'Facilities, opening arrangements, sports offered, coaching staff and pricing change. We update this site as things change, but it can be out of date. Confirm anything you intend to rely on before travelling.',
  },
  {
    title: 'Third-party services',
    body: 'Booking, membership management and coaching scheduling are delivered through Orangish, a separate platform. We are not responsible for the content or availability of external sites and services this site links to.',
  },
  {
    title: 'Questions',
    body: `Email ${CONTACT_EMAIL} and we will answer.`,
  },
]

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      updated="13 August 2026"
      sections={SECTIONS}
    />
  )
}
