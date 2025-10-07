import bcrypt from 'bcryptjs';

// Legacy SHA-256 support for migration
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(inputPin: string, storedHash: string): Promise<boolean> {
  // Detect legacy SHA-256 (64 hex chars)
  const isSha256 = /^[a-f0-9]{64}$/i.test(storedHash);
  if (isSha256) {
    const inputHash = await sha256Hex(inputPin);
    return inputHash === storedHash;
  }
  // Fallback to bcrypt compare
  return bcrypt.compare(inputPin, storedHash);
}
