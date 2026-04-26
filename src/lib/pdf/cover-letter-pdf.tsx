/**
 * Cover letter PDF component.
 *
 * Render a Document using @react-pdf/renderer's primitives. Typography
 * stays in the Tower family: Playfair Display for the signature line,
 * Helvetica fallback for body (built-in so we avoid shipping TTFs for
 * the first cut — the cover letter is text-heavy, Helvetica reads
 * publication-quality on its own).
 *
 * The input is the `documents.content` markdown body produced by
 * renderCoverLetter(). We do NOT re-parse markdown structure (that
 * would require a markdown AST lib); we split on double-newline for
 * paragraph structure and render each paragraph as a Text node.
 */

import type { JSX } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface CoverLetterPdfProps {
  /** Document title — e.g. "Hexspire Capital — Analyst Intern Cover Letter v1" */
  title: string;
  /** Markdown body from documents.content */
  content: string;
  /** Optional byline (user's name). Shown above the content block. */
  byline?: string;
  /** Optional company / role / date metadata shown in a small strip. */
  meta?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingHorizontal: 64,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.55,
    color: "#222",
  },
  byline: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: "#111",
    marginBottom: 4,
  },
  meta: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#777",
    letterSpacing: 0.5,
    marginBottom: 24,
    textTransform: "uppercase",
  },
  paragraph: {
    marginBottom: 12,
  },
});

export function CoverLetterPdf({
  title,
  content,
  byline,
  meta,
}: CoverLetterPdfProps): JSX.Element {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <Document title={title} author={byline ?? "The Tower"}>
      <Page size="LETTER" style={styles.page}>
        {byline ? <Text style={styles.byline}>{byline}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        <View>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
