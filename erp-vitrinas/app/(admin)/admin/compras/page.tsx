import { redirect } from 'next/navigation'
import { getHomeForRole } from '@/lib/auth/getHomeForRole'
import { createClient } from '@/lib/supabase/server'
import { ComprasClient } from '@/components/admin/ComprasClient'
import { ROLES } from '@/lib/validations/usuarios'
import type { UserRol } from '@/lib/validations/usuarios'

export default async function ComprasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rawRol = user.app_metadata?.rol
  if (!ROLES.includes(rawRol)) redirect('/login')

  const rol = rawRol as UserRol
  if (!['admin', 'compras', 'supervisor', 'analista'].includes(rol)) {
    redirect(getHomeForRole(rol))
  }

  return <ComprasClient rol={rol} />
}
