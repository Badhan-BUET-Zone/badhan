import type { Request, Response } from 'express'

export async function expressAuthentication(request: Request, securityName: string, _scopes?: string[], response?: Response): Promise<any> {
  if (securityName === 'ApiKeyAuth') {
    const token: string | undefined = request.header('x-auth') || request.header('X-Auth')
    if (!token) {
      throw Object.assign(new Error('Invalid Authentication'), { status: 401 })
    }
    return { token }
  }
  throw Object.assign(new Error('Unauthorized'), { status: 401 })
}


