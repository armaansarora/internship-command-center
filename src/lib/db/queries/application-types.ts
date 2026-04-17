import type { CreateApplicationInput } from "@/lib/validators/application";

export type NewApplicationInput = CreateApplicationInput & { userId: string };
