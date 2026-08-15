// The registered identity behind extonsports.com.
//
// ONE definition, imported everywhere it is rendered. The Orangish A2P registration was
// rejected three times for "unverifiable website" (error 30891) because its site never
// named its operating company, and part of the remediation was correcting the legal name
// in ten separate places. One constant means a correction is one edit.
//
// ⚠️ LEGAL_NAME MUST MATCH THE IRS RECORD EXACTLY — TCR matches the string, and a Brand
// cannot be edited after registration.
//
// NO COMMA, NO TRAILING PERIOD. Read off the CP 575 EIN confirmation letter on
// 2026-08-15, which prints it as a single line: SQUASH TIGERS EXTON LLC.
//
// The comma form was here first and was wrong. Twilio's own field help is the rule to
// follow — "enter the exact Legal Company Name as shown on your CP 575" — so check the
// letter rather than the sibling site or this comment before changing it. The related
// entity behind squashtigers.com had the identical mistake, in the identical place, and
// its letter reads SQUASH TIGERS LLC.
//
// Unlike squashtigers.com, this value has one definition and no second copy: the
// Organization JSON-LD in app/layout.tsx imports it rather than repeating the string.
export const LEGAL_NAME = 'SQUASH TIGERS EXTON LLC'

// Registered address of the entity, NOT the facility.
//
// These deliberately differ: the club is at 4 Tabas Lane in Exton PA, the company is
// registered in Robbinsville NJ. The SportsClub JSON-LD in app/layout.tsx carries the
// FACILITY address, because that is where the venue physically is and that is what
// schema.org means by a SportsClub's address. The registered address belongs to the
// company and appears on the legal pages, which is what a messaging reviewer compares
// against the Brand record.
export const LEGAL_ADDRESS = {
  street: '126 Burnet Crescent',
  city: 'Robbinsville',
  region: 'NJ',
  postalCode: '08691',
  country: 'US',
} as const

export const LEGAL_ADDRESS_LINE =
  `${LEGAL_ADDRESS.street}, ${LEGAL_ADDRESS.city}, ${LEGAL_ADDRESS.region} ${LEGAL_ADDRESS.postalCode}`

// The published contact line — the same number to be registered as the A2P sender. A
// reviewer checking that the website belongs to the Brand looks for exactly this
// correspondence, so it must not drift from lib/call-routing.ts in orangish-app.
export const CONTACT_PHONE = '(484) 252-2523'
export const CONTACT_PHONE_E164 = '+14842522523'
export const CONTACT_EMAIL = 'info@extonsports.com'
export const FACILITY_ADDRESS_LINE = '4 Tabas Lane, Building 2, Exton, PA 19341'
