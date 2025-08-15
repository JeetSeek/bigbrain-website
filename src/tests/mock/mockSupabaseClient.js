/**
 * Mock Supabase Client for testing
 */

export const supabase = {
  from: (table) => ({
    select: (columns) => ({
      eq: (column, value) => ({
        limit: (n) => ({
          data: [],
          error: null
        }),
        data: [],
        error: null
      }),
      ilike: (column, value) => ({
        eq: (column, value) => ({
          limit: (n) => ({
            data: [],
            error: null
          }),
          data: [],
          error: null
        }),
        data: [],
        error: null
      }),
      data: [],
      error: null
    })
  })
};
