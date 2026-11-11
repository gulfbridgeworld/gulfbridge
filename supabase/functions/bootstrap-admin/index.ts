import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const bootstrapEmail = 'gulfbridgeworld@gmail.com'

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

const jsonResponse = (status: number, body: Record<string, string>, headers: Record<string, string>) =>
  Response.json(body, { status, headers })

const secretsMatch = async (provided: string, expected: string) => {
  const encoder = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  const left = new Uint8Array(providedHash)
  const right = new Uint8Array(expectedHash)
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

Deno.serve(async (request) => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const requestOrigin = request.headers.get('Origin') || ''
  if (!allowedOrigins.includes(requestOrigin)) return new Response('Origin is not allowed.', { status: 403 })
  const headers = corsHeaders(requestOrigin)

  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' }, headers)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Sign in to the authorized GulfBridge account first.' }, headers)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const expectedSecret = Deno.env.get('ADMIN_BOOTSTRAP_SECRET')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !expectedSecret) {
    return jsonResponse(500, { error: 'First-admin setup is not configured in Supabase.' }, headers)
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) {
    return jsonResponse(401, { error: 'Your sign-in session is invalid or expired.' }, headers)
  }
  if (
    userData.user.email?.toLowerCase() !== bootstrapEmail
    || !userData.user.email_confirmed_at
  ) {
    return jsonResponse(403, { error: 'Only the confirmed GulfBridge admin email can use first-time setup.' }, headers)
  }

  let body: { setupSecret?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse(400, { error: 'A valid setup request is required.' }, headers)
  }
  if (typeof body.setupSecret !== 'string' || body.setupSecret.length < 16 || body.setupSecret.length > 256) {
    return jsonResponse(400, { error: 'Enter the valid one-time setup key.' }, headers)
  }
  if (!await secretsMatch(body.setupSecret, expectedSecret)) {
    return jsonResponse(403, { error: 'The one-time setup key is incorrect.' }, headers)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: bootstrapError } = await adminClient.rpc('bootstrap_initial_admin', {
    p_user_id: userData.user.id,
  })
  if (bootstrapError) {
    console.error('First-admin bootstrap failed:', bootstrapError.message)
    return jsonResponse(409, { error: 'Setup is unavailable or has already been completed. Check the Supabase setup steps.' }, headers)
  }

  return jsonResponse(200, { status: 'admin_created' }, headers)
})
