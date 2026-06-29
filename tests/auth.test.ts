describe('auth module', () => {
  const originalSecret = process.env.NEXTAUTH_SECRET

  beforeEach(() => {
    jest.resetModules()
    delete process.env.NEXTAUTH_SECRET
    jest.doMock('@/lib/prisma', () => ({
      prisma: {
        user: {
          findUnique: jest.fn(),
        },
      },
    }))
  })

  afterEach(() => {
    jest.dontMock('@/lib/prisma')
    if (originalSecret) {
      process.env.NEXTAUTH_SECRET = originalSecret
    } else {
      delete process.env.NEXTAUTH_SECRET
    }
  })

  it('can be imported without NEXTAUTH_SECRET during build-time route analysis', async () => {
    await expect(import('@/lib/auth')).resolves.toHaveProperty('authOptions')
  })
})
