'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { UserRol } from '@/lib/validations/usuarios'

type Rol = UserRol

export async function createUsuarioAction(data: {
  nombre: string
  email: string
  password: string
  rol: Rol
}) {
  const adminSupabase = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    user_metadata: { nombre: data.nombre },
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  if (data.rol !== 'colaboradora') {
    const { error: updateError } = await adminSupabase
      .from('usuarios')
      .update({ rol: data.rol })
      .eq('id', authData.user.id)

    if (updateError) return { error: updateError.message }
  }

  return { data: authData.user, error: null }
}

export async function updateUsuarioAction(
  id: string,
  data: { nombre: string; rol: Rol; activo: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('usuarios')
    .update({ nombre: data.nombre, rol: data.rol, activo: data.activo })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}
