import { NextResponse } from 'next/server'
import { fetchProgramSchedules, type ProgramSchedule } from '../../../lib/club-schedule'

// GET /api/schedule
// ---------------------------------------------------------------------------
// The academy/studio timetable for the hero roster. All of the work — the
// upstream choice, the field whitelist, the timezone handling and the
// recurrence derivation — lives in lib/club-schedule.ts, which /api/featured
// shares so the two cannot publish different hours for the same class.

export const revalidate = 300

export type { ProgramSchedule }
export type SchedulePayload = { programs: ProgramSchedule[] }

export async function GET() {
  const programs = await fetchProgramSchedules()
  return NextResponse.json({ programs } satisfies SchedulePayload)
}
