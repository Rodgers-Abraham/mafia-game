// Automatically uses localhost in dev, and the deployed URL in production
const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3000'

  // In production, connect to same origin
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin
  }

  // In development, use localhost
  return 'http://localhost:3000'
}

export default getSocketUrl