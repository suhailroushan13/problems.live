import { z } from "zod";
import {
  LOCATION_SCOPES,
  PROBLEM_SORTS,
  PROBLEM_STATUSES,
  REPORT_REASONS,
  SOLUTION_SORTS,
  SOLUTION_STATUSES,
} from "@/lib/constants";

/**
 * One schema per input, shared by the client form and the server action.
 * The server always re-parses — client validation is a convenience, never a
 * trust boundary.
 */

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "That reference is not valid.");

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const locationSchema = z.object({
  scope: z.enum(LOCATION_SCOPES).default("global"),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

export const createProblemSchema = z
  .object({
    title: trimmed(12, 140, "Title"),
    description: trimmed(30, 8000, "Description"),
    categoryId: objectId,
    location: locationSchema.default({ scope: "global" }),
    images: z
      .array(
        z.object({
          url: z.string().min(1),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          alt: z.string().max(160).optional(),
        })
      )
      .max(4)
      .default([]),
    isAnonymous: z.boolean().default(false),
    /** Set once the author has seen and dismissed the duplicate warning. */
    acknowledgedDuplicates: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.location.scope === "country" && !value.location.country) {
      ctx.addIssue({
        code: "custom",
        path: ["location", "country"],
        message: "Pick a country, or switch back to global.",
      });
    }
    if (value.location.scope === "city" && !value.location.city) {
      ctx.addIssue({
        code: "custom",
        path: ["location", "city"],
        message: "Add a city or region, or switch back to global.",
      });
    }
  });

export type CreateProblemInput = z.input<typeof createProblemSchema>;
export type CreateProblemValues = z.output<typeof createProblemSchema>;

export const updateProblemSchema = z.object({
  problemId: objectId,
  title: trimmed(12, 140, "Title"),
  description: trimmed(30, 8000, "Description"),
  categoryId: objectId,
  location: locationSchema,
  isAnonymous: z.boolean().default(false),
});

export const problemStatusSchema = z.object({
  problemId: objectId,
  status: z.enum(PROBLEM_STATUSES),
  acceptedSolutionId: objectId.optional().nullable(),
});

export const createSolutionSchema = z.object({
  problemId: objectId,
  title: trimmed(8, 140, "Title"),
  description: trimmed(30, 6000, "Description"),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v),
      "Enter a full URL starting with http:// or https://"
    )
    .optional()
    .or(z.literal("")),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        alt: z.string().max(160).optional(),
      })
    )
    .max(4)
    .default([]),
  status: z.enum(SOLUTION_STATUSES).default("proposed"),
  isAnonymous: z.boolean().default(false),
});

export type CreateSolutionInput = z.input<typeof createSolutionSchema>;

export const updateSolutionSchema = createSolutionSchema
  .omit({ problemId: true, images: true })
  .extend({ solutionId: objectId });

export const createCommentSchema = z.object({
  problemId: objectId,
  solutionId: objectId.optional().nullable(),
  parentId: objectId.optional().nullable(),
  content: trimmed(2, 4000, "Comment"),
  isAnonymous: z.boolean().default(false),
});

export const updateCommentSchema = z.object({
  commentId: objectId,
  content: trimmed(2, 4000, "Comment"),
});

export const reportSchema = z.object({
  targetType: z.enum(["problem", "solution", "comment", "user"]),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const suggestCategorySchema = z.object({
  name: trimmed(3, 40, "Category name"),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

export const problemFiltersSchema = z.object({
  sort: z.enum(PROBLEM_SORTS).catch("trending"),
  category: z.string().trim().max(60).optional(),
  status: z.enum(PROBLEM_STATUSES).optional().catch(undefined),
  country: z.string().trim().max(60).optional(),
  scope: z.enum(LOCATION_SCOPES).optional().catch(undefined),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export type ProblemFilters = z.output<typeof problemFiltersSchema>;

export const solutionSortSchema = z.enum(SOLUTION_SORTS).catch("helpful");

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  type: z.enum(["all", "problems", "solutions", "categories", "users"]).catch("all"),
});

export const updateProfileSchema = z.object({
  name: trimmed(2, 80, "Name"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Username must be at least 2 characters.")
    .max(30, "Username must be 30 characters or fewer.")
    .regex(
      /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/,
      "Use letters, numbers, dots, dashes and underscores."
    ),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
});

export const adminSettingSchema = z.object({
  key: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
});

export const objectIdSchema = objectId;
