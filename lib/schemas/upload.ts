import { z } from 'zod';

const optionalTrimmed = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();

export const uploadMetaSchema = z.object({
  title: optionalTrimmed(200, 'Title must be 200 characters or fewer.'),
  description: optionalTrimmed(2000, 'Description must be 2000 characters or fewer.'),
  visibility: z.enum(['public', 'private', 'unlisted']).default('private'),
});

export type UploadMetaInput = z.input<typeof uploadMetaSchema>;
export type UploadMetaParsed = z.output<typeof uploadMetaSchema>;
