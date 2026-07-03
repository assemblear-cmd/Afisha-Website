import type { Prisma } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

export function isAdmin(user: Pick<SessionUser, 'role'> | null): boolean {
  return user?.role === 'admin';
}

// Admins can do everything an organizer can.
export function isOrganizer(user: Pick<SessionUser, 'role'> | null): boolean {
  return user?.role === 'organizer' || isAdmin(user);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'Authentication required.');
  return user;
}

export async function requireOrganizer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isOrganizer(user)) throw new ApiError(403, 'Organizer access required.');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new ApiError(403, 'Admin access required.');
  return user;
}

/**
 * Loads an event and asserts the caller owns it (admins bypass ownership).
 * Every organizer mutation goes through this so one organizer can never see
 * or edit another organizer's events.
 */
export async function requireEventOwnership(eventId: string, user: SessionUser) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new ApiError(404, 'Event not found.');
  if (!isAdmin(user) && event.organizerId !== user.id) {
    throw new ApiError(403, 'You do not have access to this event.');
  }
  return event;
}

export type ScanAccessInput = {
  role: SessionUser['role'];
  userId: string;
  eventOrganizerId: string;
  // ACTIVE or INVITED scanner-access grant matched by userId or email.
  grantStatus: 'INVITED' | 'ACTIVE' | 'REVOKED' | null;
};

/**
 * Pure scanner-permission decision: admins, the event's organizer, and staff
 * with a non-revoked email grant may scan. Kept pure for unit testing.
 */
export function hasScanPermission(input: ScanAccessInput): boolean {
  if (input.role === 'admin') return true;
  if (input.userId === input.eventOrganizerId) return true;
  return input.grantStatus === 'INVITED' || input.grantStatus === 'ACTIVE';
}

/**
 * Server-side scanner access check. Also links INVITED email grants to the
 * user account on first use (the grant may have been created before the
 * staff member registered).
 */
export async function canScanEvent(
  user: SessionUser,
  eventId: string
): Promise<{ allowed: boolean; eventOrganizerId: string | null }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  if (!event) return { allowed: false, eventOrganizerId: null };

  const grant =
    user.role === 'admin' || event.organizerId === user.id
      ? null
      : await prisma.eventScannerAccess.findFirst({
          where: {
            eventId,
            status: { in: ['INVITED', 'ACTIVE'] },
            OR: [{ userId: user.id }, { email: user.email.toLowerCase() }],
          },
        });

  const allowed = hasScanPermission({
    role: user.role,
    userId: user.id,
    eventOrganizerId: event.organizerId,
    grantStatus: grant ? grant.status : null,
  });

  if (grant && (grant.status === 'INVITED' || grant.userId !== user.id)) {
    await prisma.eventScannerAccess.update({
      where: { id: grant.id },
      data: { status: 'ACTIVE', userId: user.id },
    });
  }

  return { allowed, eventOrganizerId: event.organizerId };
}

/** Events the user is allowed to scan (for the scanner event picker). */
export async function scannableEvents(user: SessionUser) {
  const where: Prisma.EventWhereInput =
    user.role === 'admin'
      ? {}
      : {
          OR: [
            { organizerId: user.id },
            {
              scannerAccesses: {
                some: {
                  status: { in: ['INVITED', 'ACTIVE'] },
                  OR: [{ userId: user.id }, { email: user.email.toLowerCase() }],
                },
              },
            },
          ],
        };

  return prisma.event.findMany({
    where: { ...where, status: 'PUBLISHED', isPublished: true },
    select: {
      id: true,
      title: true,
      startsAt: true,
      isFree: true,
      scannerAddonPaid: true,
      status: true,
    },
    orderBy: { startsAt: 'desc' },
    take: 100,
  });
}

/**
 * Paid events always have the scanner; free events need the paid add-on.
 */
export function scannerEnabledForEvent(event: { isFree: boolean; scannerAddonPaid: boolean }) {
  return !event.isFree || event.scannerAddonPaid;
}
