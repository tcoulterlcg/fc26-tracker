export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/franchises?select=id&limit=1'
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      cache: 'no-store'
    })
    return Response.json({ ok: res.ok, status: res.status, checkedAt: new Date().toISOString() })
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
