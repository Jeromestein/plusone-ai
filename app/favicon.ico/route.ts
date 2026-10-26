export function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      Location: "/brand/plusone-icon.svg",
    },
  });
}
