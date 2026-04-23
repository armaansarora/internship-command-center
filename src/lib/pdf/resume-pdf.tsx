/**
 * R5.7 — Tailored resume PDF component.
 *
 * The documents.content for a resume_tailored row is markdown produced
 * by renderTailoredResume(). We split on `## ` for section boundaries
 * and render each section with a small heading + body. Simple but
 * publication-quality; fancier typography can be added later without
 * breaking the route surface.
 */

import type { JSX } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ResumePdfProps {
  title: string;
  content: string;
  byline?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#222",
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    color: "#0A0A0A",
    marginBottom: 2,
  },
  contact: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#555",
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: "#0A0A0A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
    borderBottomStyle: "solid",
    borderBottomWidth: 0.5,
    borderBottomColor: "#BBBBBB",
    paddingBottom: 2,
  },
  body: {
    marginBottom: 4,
  },
});

interface Section {
  heading: string;
  bodyLines: string[];
}

function parseMarkdownResume(content: string): {
  name: string;
  contactLine: string;
  sections: Section[];
} {
  const lines = content.split(/\n/);
  let idx = 0;
  let name = "";
  // First top-level # is the name.
  while (idx < lines.length) {
    const ln = lines[idx];
    if (ln.startsWith("# ")) {
      name = ln.slice(2).trim();
      idx += 1;
      break;
    }
    idx += 1;
  }
  // Skip blank lines; the next non-blank non-heading line is the contact.
  let contactLine = "";
  while (idx < lines.length) {
    const ln = lines[idx].trim();
    if (!ln) {
      idx += 1;
      continue;
    }
    if (ln.startsWith("##")) break;
    contactLine = ln;
    idx += 1;
    break;
  }
  const sections: Section[] = [];
  let current: Section | null = null;
  for (; idx < lines.length; idx++) {
    const ln = lines[idx];
    if (ln.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: ln.slice(3).trim(), bodyLines: [] };
      continue;
    }
    if (current) {
      current.bodyLines.push(ln);
    }
  }
  if (current) sections.push(current);
  return { name, contactLine, sections };
}

export function ResumePdf({ title, content, byline }: ResumePdfProps): JSX.Element {
  const parsed = parseMarkdownResume(content);
  const nameToShow = byline || parsed.name || "Candidate";
  return (
    <Document title={title} author={nameToShow}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{nameToShow}</Text>
        {parsed.contactLine ? (
          <Text style={styles.contact}>{parsed.contactLine}</Text>
        ) : null}
        {parsed.sections.map((section, idx) => (
          <View key={idx}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.bodyLines
              .filter((l) => l.trim().length > 0)
              .map((ln, lnIdx) => (
                <Text key={lnIdx} style={styles.body}>
                  {ln.replace(/^\s*-\s*/, "• ")}
                </Text>
              ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
