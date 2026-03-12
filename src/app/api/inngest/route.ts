import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

// Import agent functions as they're created in future phases
// import { researchCompany } from '@/lib/agents/cio/research'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Agent functions will be registered here as they're built
  ],
})
