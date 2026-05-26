export interface FoundryFloorRoomElementInput {
  required: ReadonlyArray<string>;
  reported: ReadonlyArray<string>;
}

export interface FoundryFloorRoomElementReport {
  passed: boolean;
  required: ReadonlyArray<string>;
  matched: ReadonlyArray<string>;
  missing: ReadonlyArray<string>;
}

function normaliseElement(label: string): string {
  return label
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function verifyFoundryFloorRoomElements(
  input: FoundryFloorRoomElementInput,
): FoundryFloorRoomElementReport {
  if (input.required.length === 0) {
    throw new Error(
      "foundry/floor: required-elements list must be non-empty (canon bug)",
    );
  }
  const reportedSet = new Set(input.reported.map(normaliseElement));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of input.required) {
    const key = normaliseElement(req);
    if (reportedSet.has(key)) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }
  return {
    passed: missing.length === 0,
    required: input.required,
    matched,
    missing,
  };
}
