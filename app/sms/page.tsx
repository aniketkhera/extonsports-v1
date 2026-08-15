import type { Metadata } from 'next'
import LegalPage, { type Section } from '@/app/components/LegalPage'
import { LEGAL_NAME, LEGAL_ADDRESS_LINE, CONTACT_PHONE, CONTACT_EMAIL } from '@/lib/legal'

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
    // ⚠️ THE CONSENT SENTENCE IS LOAD-BEARING. DO NOT SOFTEN IT.
    //
    // The wording here used to say contacting us "tells us you would like a reply" — an
    // intention, not consent. Twilio's pre-check refused the identical sentence on the
    // sibling SquashTigers campaign twice: "Your opt-in doesn't explicitly ask consumers
    // to consent to SMS". Carriers want the person told in plain words that they are
    // agreeing to receive text messages, and from WHICH company. Hence the named entity
    // and "agreeing to receive".
    //
    // THE REGISTERED CAMPAIGN WILL QUOTE THIS PARAGRAPH. Change it here and the filing
    // stops matching the page a reviewer opens, which is the failure mode (error 30891)
    // that rejected the Orangish registration three times.
    body: `By contacting us first. Calling or texting ${CONTACT_PHONE} is what tells us you would like a reply — and by doing so you are agreeing to receive text messages from ${LEGAL_NAME} at the number you contacted us from. A reply is all we send.\n\nThere is no sign-up form, no keyword to text in, and no box to tick. We never add a number that has not contacted us, we never buy or rent phone numbers, and we never accept numbers collected by anyone else on our behalf.\n\nMessage frequency varies. Message and data rates may apply. Reply STOP to opt out, or HELP for help.`,
  },
  {
    // ⚠️ THESE ARE THE SAMPLE MESSAGES FILED WITH THE A2P CAMPAIGN. All five go in the
    // submission verbatim, and a reviewer comparing the filing against this page is a
    // mechanical check — so edit them here and in the campaign together, or not at all.
    //
    // Each is a REPLY, because that is the whole consent model: nothing goes out to
    // anyone who did not contact us first. A sample that reads like an announcement
    // would contradict the Message Flow on the same page.
    //
    // NO APOSTROPHES ON PURPOSE. Twilio's campaign form stores them HTML-escaped and the
    // review screen renders "I&#39;ll" mid-word, which reads as a broken filing. The
    // earlier drafts of samples 2 and 3 used "I'll" and were rewritten for this reason.
    title: 'What our messages look like',
    // Only the FIRST message to a number carries the opt-out line — that is what the
    // sending code does (isFirstOutbound in orangish-app's lib/sms.ts), so it is what
    // this page says. If that behaviour changes, this wording and the filed samples
    // change with it.
    body: 'Every message we send is an answer to something you asked, so the wording varies. These are typical examples.\n\nThe first message we send to a number ends with the opt-out line; later messages in the same conversation do not repeat it.',
    samples: [
      `Hi — thanks for asking about Exton Sports Center. We open in late August with cricket, squash, badminton and indoor turf at 4 Tabas Lane. Happy to answer anything before then. Reply STOP to opt out.`,
      `Yes, we can show you around before we open. Saturday mornings work best — tell me a time that suits and I will meet you at 4 Tabas Lane.`,
      `Thanks for calling — sorry I missed you. Call back on ${CONTACT_PHONE} whenever suits, or reply here and I will pick it up.`,
      `Happy to have someone email you the membership options once they are confirmed. What is the best address for that?`,
      `We are at 4 Tabas Lane, Building 2, opposite Apna Bazar, with parking right outside. Let me know when you would like to come and see the courts.`,
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
    // Spelled out rather than deferred to the page footer. A messaging reviewer compares
    // the entity name and REGISTERED ADDRESS on this page against the Brand record, and
    // "contact details are at the foot of this page" gives them nothing to match on. Note
    // this is the company's registered address in Robbinsville, not the Exton facility —
    // see the comment on LEGAL_ADDRESS in lib/legal.ts for why they differ.
    body: `${LEGAL_NAME}\n${LEGAL_ADDRESS_LINE}\n${CONTACT_PHONE} · ${CONTACT_EMAIL}\n\nExton Sports Center is a trading name of ${LEGAL_NAME}.`,
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
