// Probe: does the existing argon2 (native addon) hash path bundle for Workers?
// Imported from a separate entry so it can be built independently.
import argon2 from 'argon2';

export default {
  async fetch(): Promise<Response> {
    const hash = await argon2.hash('probe-password', {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    return new Response(JSON.stringify({ hashed: hash.length > 0 }));
  },
};
