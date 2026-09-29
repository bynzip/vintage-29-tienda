import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-supabase-url')
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Faltan configurar las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.'
    }
  }

  try {
    const { error } = await supabase.from('variants').select('id').limit(1)
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Conexión exitosa a Supabase, pero la tabla "variants" aún no existe. Ejecuta el script supabase/schema.sql en el SQL Editor de Supabase.'
        }
      }
      return { success: false, message: `Error de Supabase: ${error.message}` }
    }
    return { success: true, message: '¡Conexión establecida con Supabase exitosamente!' }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Error de red al conectar: ${errorMsg}` }
  }
}
