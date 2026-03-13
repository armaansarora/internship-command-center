'use server';

export type CoverLetter = {
  id: number;
  company: string;
  role: string;
  content: string;
  isActive: boolean;
  applicationId: number | null;
  generatedAt: Date;
};

export async function getAllCoverLettersGrouped(): Promise<Record<string, CoverLetter[]>> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function getCoverLettersByCompany(company: string): Promise<CoverLetter[]> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function getCoverLettersByApplication(applicationId: number): Promise<CoverLetter[]> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function setActiveCoverLetter(id: number): Promise<void> {
  throw new Error('Not implemented — awaiting Phase 1');
}

export async function getActiveCoverLetter(company: string): Promise<CoverLetter | null> {
  throw new Error('Not implemented — awaiting Phase 1');
}
