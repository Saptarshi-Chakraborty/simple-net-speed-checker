/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Ping endpoint
    if (url.pathname === "/ping") {
      return new Response("pong", { headers: corsHeaders });
    }

    // 2. Dynamic Download speed test endpoint
    if (url.pathname === "/download") {
      // Allow client to request custom size in MB (Default to 10MB, max 150MB to stay safe)
      const requestedSizeMB = parseInt(url.searchParams.get("size")) || 10;
      const totalSize = Math.min(requestedSizeMB, 150) * 1024 * 1024;

      const chunkSize = 128 * 1024; // 128 KB chunks for efficient streaming
      let sent = 0;

      const stream = new ReadableStream({
        start(controller) {
          const chunk = new Uint8Array(chunkSize);
          chunk.fill(0); // Dummy data buffer

          function push() {
            if (sent < totalSize) {
              controller.enqueue(chunk);
              sent += chunkSize;
              // Yield execution frame to prevent CPU lockup
              setTimeout(push, 0);
            } else {
              controller.close();
            }
          }
          push();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    }

    // 3. Upload speed test endpoint
    if (url.pathname === "/upload" && request.method === "POST") {
      const reader = request.body.getReader();
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
      }

      return new Response(JSON.stringify({ success: true, bytes: receivedBytes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Cloudflare High-Speed Test Worker Active", { headers: corsHeaders });
  },
};
