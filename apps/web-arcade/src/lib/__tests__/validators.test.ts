import { describe, it, expect } from 'vitest';
import { isWalletAddress, isGuestId } from '../validators';

describe('isWalletAddress', () => {
  it('accepts valid 34-char address', () => {
    expect(isWalletAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(true);
  });

  it('accepts valid 25-char address (shortest)', () => {
    expect(isWalletAddress('rHb9CJAWyB4rj91VRWn96Dkux')).toBe(true);
  });

  it('accepts valid 35-char address (longest)', () => {
    expect(isWalletAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyThX')).toBe(true);
  });

  it('rejects address shorter than 25 chars', () => {
    expect(isWalletAddress('rHb9CJAWyB4rj91VRWn96Dk')).toBe(false);
  });

  it('rejects address longer than 35 chars', () => {
    expect(isWalletAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyThXX')).toBe(false);
  });

  it('rejects address without r prefix', () => {
    expect(isWalletAddress('Hb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
  });

  it('rejects address with invalid base58 chars (0, O, I, l)', () => {
    expect(isWalletAddress('r0b9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
    expect(isWalletAddress('rOb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
    expect(isWalletAddress('rIb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
    expect(isWalletAddress('rlb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isWalletAddress('')).toBe(false);
  });

  it('rejects non-string inputs gracefully', () => {
    expect(isWalletAddress(null as unknown as string)).toBe(false);
    expect(isWalletAddress(undefined as unknown as string)).toBe(false);
  });
});

describe('isGuestId', () => {
  it('accepts valid guest ID', () => {
    expect(isGuestId('Guest-a1b2')).toBe(true);
  });

  it('accepts guest ID with max hex length', () => {
    expect(isGuestId('Guest-a1b2c3d4')).toBe(true);
  });

  it('accepts guest ID with min hex length', () => {
    expect(isGuestId('Guest-ab12')).toBe(true);
  });

  it('rejects guest ID with too few hex chars', () => {
    expect(isGuestId('Guest-a1b')).toBe(false);
  });

  it('rejects guest ID with too many hex chars', () => {
    expect(isGuestId('Guest-a1b2c3d4e')).toBe(false);
  });

  it('rejects wrong prefix', () => {
    expect(isGuestId('guest-a1b2')).toBe(false);
    expect(isGuestId('Player-a1b2')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isGuestId('')).toBe(false);
  });
});
