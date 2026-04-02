import type { NextConfig } from 'next'

function readAllowedDevOrigins() {
  return (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const allowedDevOrigins = readAllowedDevOrigins()

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
}

export default nextConfig
