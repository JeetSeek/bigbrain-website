/**
 * Mock Supabase Client for Testing
 *
 * This mock replaces the actual Supabase client in test environments
 * to avoid issues with import.meta.env and to provide consistent test behavior
 */

export const supabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue({ data: null, error: null }),
    match: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then: jest
      .fn()
      .mockImplementation(callback => Promise.resolve(callback({ data: [], error: null }))),
  }),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    onAuthStateChange: jest.fn().mockImplementation(callback => {
      callback('SIGNED_IN', { user: { id: 'test-user-id' } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
  },
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest
        .fn()
        .mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }),
  },
  rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
};

export default supabase;
