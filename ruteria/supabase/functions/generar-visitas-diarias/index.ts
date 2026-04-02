import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUSINESS_TIME_ZONE = 'America/Bogota'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  })
}

function getBusinessDate(date: Date) {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('No se pudo calcular la fecha de negocio')
  }

  return `${year}-${month}-${day}`
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET')
  const providedSecret = req.headers.get('x-cron-secret')

  if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
    console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or INTERNAL_CRON_SECRET')
    return jsonResponse({ error: 'Missing env vars' }, 500)
  }

  if (providedSecret !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const fechaHoy = getBusinessDate(new Date())
    const { data, error } = await supabase.rpc('generar_visitas_diarias', {
      p_target_date: fechaHoy,
    })

    if (error) {
      console.error('Error generating daily visits:', error.message)
      return jsonResponse({ error: 'No se pudieron generar las visitas diarias' }, 500)
    }

    return jsonResponse(
      data ?? {
        fecha: fechaHoy,
        creadas: 0,
        omitidas: 0,
        errores: 0,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Unexpected error generating daily visits:', message)
    return jsonResponse({ error: 'No se pudieron generar las visitas diarias' }, 500)
  }
})
