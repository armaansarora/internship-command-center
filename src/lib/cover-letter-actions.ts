'use server';

export interface GenerationState {
  step: 'idle' | 'researching' | 'generating' | 'done' | 'error';
  content?: string;
  error?: string;
  coverletterId?: number;
}

export async function generateCoverLetterAction(
  company: string,
  role: string,
  applicationId?: number,
): Promise<GenerationState> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function setActiveCoverLetterAction(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function getApplicationsForAutocomplete(): Promise<
  { id: number; company: string; role: string; tier: string }[]
> {
  throw new Error('Not implemented — awaiting Phase 1');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchResearchAction(company: string): Promise<any> {
  throw new Error('Not implemented — awaiting Phase 1');
}
