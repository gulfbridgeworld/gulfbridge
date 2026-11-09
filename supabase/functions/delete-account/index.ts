import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

async function listAllFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<string[]> {
  const files: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(path, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`Could not inspect private ${bucket} files: ${error.message}`)
    if (!data?.length) break

    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name
      if (item.id === null) {
        files.push(...await listAllFiles(client, bucket, itemPath))
      } else {
        files.push(itemPath)
      }
    }

    if (data.length < 100) break
    offset += 100
  }
  return files
}

Deno.serve(async (request) => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const requestOrigin = request.headers.get('Origin') || ''
  if (!allowedOrigins.includes(requestOrigin)) {
    return new Response('Origin is not allowed.', { status: 403 })
  }
  const headers = corsHeaders(requestOrigin)

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed.', { status: 405, headers })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return new Response('Authentication is required.', { status: 401, headers })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response('Account deletion is not configured.', { status: 500, headers })
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) {
    return new Response('Your sign-in session is invalid or expired.', { status: 401, headers })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  try {
    for (const bucket of ['application-documents', 'agency-documents']) {
      const files = await listAllFiles(adminClient, bucket, userData.user.id)
      for (let start = 0; start < files.length; start += 100) {
        const { error } = await adminClient.storage.from(bucket).remove(files.slice(start, start + 100))
        if (error) throw new Error(`Could not remove private ${bucket} files: ${error.message}`)
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id)
    if (deleteError) throw new Error(`Could not delete the account: ${deleteError.message}`)
    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account deletion failed.'
    return new Response(message, { status: 500, headers })
  }
})
