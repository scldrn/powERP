import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/admin/AppShell'
import type { UserRol } from '@/lib/validations/usuarios'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Obtener nombre desde public.usuarios
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  const userInfo = {
    nombre: perfil?.nombre ?? '',
    email: user.email ?? '',
    rol: ((user.app_metadata?.rol as string) ?? perfil?.rol ?? 'colaboradora') as UserRol,
  }

  return <AppShell user={userInfo}>{children}</AppShell>
}
