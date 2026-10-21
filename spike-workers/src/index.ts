// Trivial Workers handler: proves the toolchain builds + runs a real HTTP handler.
export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, runtime: 'workers' }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
