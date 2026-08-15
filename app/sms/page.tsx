import type { Metadata } from 'next'
import LegalPage, { type Section } from '@/app/components/LegalPage'
import { LEGAL_NAME, CONTACT_PHONE, CONTACT_EMAIL } from '@/lib/legal'

// SMS program disclosure for the Exton Sports Center contact line.
//
// Written for a customer deciding whether to text us, and structured for a carrier/TCR
// reviewer deciding whether the A2P campaign is what it claims to be — every element a
// reviewer looks for (program description, frequency, cost, HELP, STOP, carrier
// non-liability, no-sale-of-mobile-data, operating entity) appears in plain words.
//
// ⚠️ THE OPT-IN DESCRIBED HERE MUST STAY TRUE. This program has no web checkbox and no
// keyword opt-in: the only way a message goes out is in reply to someone who contacted us
// first. If that ever changes, this page and the registered Message Flow change with it,
// or the registration becomes false as filed.
export const metadata: Metadata = {
  title: 'SMS Terms',
  description: 'How Exton Sports Center uses text messaging: what we send, how often, and how to stop.',
  alternates: { canonical: '/sms' },
}

const SECTIONS: Section[] = [
  {
    title: 'What this program is',
    body: `Exton Sports Center replies to enquiries by text message. If you call or text our contact line on ${CONTACT_PHONE}, we may answer you by SMS at the number you contacted us from — for example to confirm a visit, answer a question about membership or court availability, or tell you our opening hours.\n\nThat is the whole programme. We do not run text marketing, we do not send promotional blasts, and we do not add you to a list.`,
  },
  {
    title: 'How you join it',
    body: `By contacting us first. Calling or texting ${CONTACT_PHONE} is what tells us you would like a reply, and a reply is all we send.\n\nThere is no sign-up form, no keyword to text in, and no box to tick. We never add a number that has not contacted us, we never buy or rent phone numbers, and we never accept numbers collected by anyone else on our behalf.`,
  },
  {
    // ⚠️ THESE THREE ARE THE SAMPLE MESSAGES FILED WITH THE A2P CAMPAIGN. A reviewer
    // compares the submission against this page, so they must stay word for word
    // identical to what was filed — edit here and the campaign has to be resubmitted to
    // match, not the other way round.
    //
    // Each is a REPLY, because that is the whole consent model: nothing goes out to
    // anyone who did not contact us first. A sample that reads like an announcement
    // would contradict the Message Flow on the same page.
    title: 'What our messages look like',
    body: 'Every message we send is an answer to something you asked. Real examples:',
    samples: [
      `Hi — thanks for asking about Exton Sports Center. We open in late August with badminton, cricket and squash at 4 Tabas Lane. Happy to answer anything before then. Reply STOP to opt out.`,
      `Yes, we can show you around before we open — Saturday mornings work best. Tell me a time that suits and I'll meet you at 4 Tabas Lane. Reply STOP to opt out.`,
      `Thanks for calling — sorry I missed you. Call back on ${CONTACT_PHONE} whenever suits, or reply here and I'll pick it up. Reply STOP to opt out.`,
    ],
  },
  {
    title: 'How often we message',
    body: 'Only in response to you. Message frequency varies and depends entirely on the conversation you started — most enquiries are answered in one or two messages.',
  },
  {
    title: 'Cost',
    body: 'Message and data rates may apply. Exton Sports Center does not charge for text messages; your mobile carrier may, according to your plan.',
  },
  {
    title: 'How to stop',
    body: 'Reply STOP to any message and we will not text you again. You will receive one confirmation that you have been unsubscribed, and nothing after that.\n\nStopping texts does not stop you being able to call us, and it does not affect any booking, membership or guest access.',
  },
  {
    title: 'How to get help',
    body: `Reply HELP to any message, email ${CONTACT_EMAIL}, or call ${CONTACT_PHONE}.`,
  },
  {
    title: 'Carriers',
    body: 'Mobile carriers are not liable for delayed or undelivered messages. Delivery depends on your carrier and your handset, and neither we nor your carrier can guarantee that any individual message arrives.',
  },
  {
    title: 'Your mobile information is not for sale',
    body: 'No mobile information is sold, rented, or shared with third parties or affiliates for their own marketing or promotional purposes.\n\nWe share your number only with the vendor that carries the message for us — Twilio Inc., our messaging provider — and only so the message can be delivered to you. See our Privacy Policy for how we handle the rest of your information.',
  },
  {
    title: 'Who operates this line',
    body: `Exton Sports Center is a trading name of ${LEGAL_NAME}. Contact details are at the foot of this page.`,
  },
]

export default function SmsTermsPage() {
  return (
    <LegalPage
      title="SMS Terms"
      intro="We only text people who have contacted us first, and only to answer them."
      updated="13 August 2026"
      sections={SECTIONS}
    />
  )
}
