import { describe, it, expect } from 'vitest';
import { RESUME } from '@/lib/resume';

describe('Resume data', () => {
  it('has correct school', () => {
    expect(RESUME.education.university.school).toBe(
      'New York University, SPS Schack Institute of Real Estate'
    );
    expect(RESUME.education.university.shortName).toBe('NYU Schack');
  });

  it('has correct GPA', () => {
    expect(RESUME.education.university.cumulativeGpa).toBe('3.58');
    expect(RESUME.education.university.majorGpa).toBe('3.87');
  });

  it('includes National Lecithin experience', () => {
    const nlExp = RESUME.experience.find(
      (e) => e.company === 'National Lecithin'
    );
    expect(nlExp).toBeTruthy();
    expect(nlExp!.title).toBe('Summer Analyst Intern');
    expect(nlExp!.highlights.length).toBe(4);
  });

  it('includes JP Language Institute experience', () => {
    const jpExp = RESUME.experience.find(
      (e) => e.company === 'JP Language Institute'
    );
    expect(jpExp).toBeTruthy();
    expect(jpExp!.title).toBe('Department Head and Latin Instructor');
  });

  it('has leadership activities', () => {
    const orgNames = RESUME.leadership.map((l) => l.org);
    expect(orgNames).toContain('Stern Real Estate Group (SREG)');
    expect(orgNames).toContain('Schack Real Estate Club');
  });

  it('has coursework arrays', () => {
    expect(RESUME.coursework.completed.length).toBeGreaterThan(0);
    expect(RESUME.coursework.current.length).toBeGreaterThan(0);
    expect(RESUME.coursework.current).toContain('Real Estate Finance');
  });

  it('has writing style guide', () => {
    expect(RESUME.writingStyle.structure).toBe('5-paragraph');
    expect(RESUME.writingStyle.tone).toContain('honest');
    expect(RESUME.writingStyle.keyPhrases.length).toBeGreaterThan(0);
  });

  it('has transcript data', () => {
    expect(RESUME.transcript.semesters.length).toBe(4);
    expect(RESUME.transcript.cumulativeGpa).toBe('3.576');
  });

  it('has contact information', () => {
    expect(RESUME.contact.email).toBe('armaan.arora@nyu.edu');
    expect(RESUME.contact.phone).toBe('(516) 840-2501');
  });

  it('has skills list', () => {
    expect(RESUME.skills).toContain('Excel');
    expect(RESUME.skills).toContain('QuickBooks');
  });
});
