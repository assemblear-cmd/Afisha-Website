import { describe, expect, it } from 'vitest';
import { hasScanPermission, isAdmin, isOrganizer, scannerEnabledForEvent } from '@/lib/authz';

describe('role helpers', () => {
  it('recognizes admins', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'organizer' })).toBe(false);
    expect(isAdmin({ role: 'visitor' })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it('treats admins as organizers too', () => {
    expect(isOrganizer({ role: 'organizer' })).toBe(true);
    expect(isOrganizer({ role: 'admin' })).toBe(true);
    expect(isOrganizer({ role: 'visitor' })).toBe(false);
  });
});

describe('scanner permission', () => {
  const base = { userId: 'user-1', eventOrganizerId: 'org-1' } as const;

  it('admins can scan any event', () => {
    expect(hasScanPermission({ ...base, role: 'admin', grantStatus: null })).toBe(true);
  });

  it('the event organizer can scan their own event', () => {
    expect(
      hasScanPermission({
        role: 'organizer',
        userId: 'org-1',
        eventOrganizerId: 'org-1',
        grantStatus: null,
      })
    ).toBe(true);
  });

  it('staff with an active or invited grant can scan', () => {
    expect(hasScanPermission({ ...base, role: 'visitor', grantStatus: 'ACTIVE' })).toBe(true);
    expect(hasScanPermission({ ...base, role: 'visitor', grantStatus: 'INVITED' })).toBe(true);
  });

  it('revoked or missing grants mean no access', () => {
    expect(hasScanPermission({ ...base, role: 'visitor', grantStatus: 'REVOKED' })).toBe(false);
    expect(hasScanPermission({ ...base, role: 'visitor', grantStatus: null })).toBe(false);
    // Being an organizer of *other* events grants nothing here.
    expect(hasScanPermission({ ...base, role: 'organizer', grantStatus: null })).toBe(false);
  });
});

describe('scanner availability per event', () => {
  it('paid events always have the scanner', () => {
    expect(scannerEnabledForEvent({ isFree: false, scannerAddonPaid: false })).toBe(true);
  });

  it('free events need the paid add-on', () => {
    expect(scannerEnabledForEvent({ isFree: true, scannerAddonPaid: false })).toBe(false);
    expect(scannerEnabledForEvent({ isFree: true, scannerAddonPaid: true })).toBe(true);
  });
});
