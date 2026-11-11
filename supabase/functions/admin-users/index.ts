import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

Deno.serve(async (request) => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const requestOrigin = request.headers.get('Origin') || ''
  if (!allowedOrigins.includes(requestOrigin)) return new Response('Origin is not allowed.', { status: 403 })
  const headers = corsHeaders(requestOrigin)

  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers })

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return new Response('Authentication is required.', { status: 401, headers })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response('Admin user management is not configured.', { status: 500, headers })
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) return new Response('Your sign-in session is invalid or expired.', { status: 401, headers })

  const { data: roles, error: roleError } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
  if (roleError) return new Response('Could not verify admin access.', { status: 500, headers })
  if (!roles?.some((item) => item.role === 'admin')) return new Response('Admin permission required.', { status: 403, headers })

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json() as { action?: string; userId?: string; disabled?: boolean }
    if (body.action === 'set-disabled') {
      if (!body.userId || typeof body.disabled !== 'boolean') {
        return new Response('A user ID and disabled state are required.', { status: 400, headers })
      }
      if (body.userId === userData.user.id) return new Response('You cannot disable your own admin account.', { status: 400, headers })

      const { data: targetRoles, error: targetRoleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', body.userId)
      if (targetRoleError) throw targetRoleError
      if (targetRoles?.some((item) => item.role === 'admin')) {
        return new Response('Admin accounts cannot be disabled from this screen.', { status: 403, headers })
      }

      const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
        ban_duration: body.disabled ? '876000h' : 'none',
      })
      if (error) throw error
      return Response.json({ userId: body.userId, disabled: body.disabled }, { headers })
    }

    if (body.action !== 'list') return new Response('Unsupported admin action.', { status: 400, headers })

    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 })
    if (usersError) throw usersError
    const users = usersData.users
    const ids = users.map((user) => user.id)
    if (!ids.length) return Response.json({ users: [] }, { headers })

    const [{ data: profiles, error: profilesError }, { data: allRoles, error: rolesError }] = await Promise.all([
      adminClient.from('profiles').select('id,full_name,phone,location,created_at').in('id', ids),
      adminClient.from('user_roles').select('user_id,role').in('user_id', ids),
    ])
    if (profilesError) throw profilesError
    if (rolesError) throw rolesError

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const rolesById = new Map<string, string[]>()
    for (const role of allRoles || []) {
      rolesById.set(role.user_id, [...(rolesById.get(role.user_id) || []), role.role])
    }

    const result = users.map((user) => {
      const profile = profilesById.get(user.id)
      return {
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        location: profile?.location || '',
        created_at: profile?.created_at || user.created_at,
        disabled: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
        roles: rolesById.get(user.id) || [],
      }
    })
    return Response.json({ users: result }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin user management failed.'
    return new Response(message, { status: 500, headers })
  }
})
