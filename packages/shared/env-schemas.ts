import ms, { type StringValue } from 'ms';
import { z } from 'zod';

export const stringToNumberSchema = z
  .string()
  .transform(Number)
  .pipe(z.number());

export const transformedBooleanSchema = z
  .string()
  .refine((value) => value === 'true' || value === 'false')
  .transform((value) => value === 'true');

export const millisecondSchema = z
  .string()
  .min(1)
  .transform((value, context) => {
    try {
      return ms(value as StringValue);
    } catch {
      context.addIssue({
        code: 'invalid_format',
        format: '{number}{time unit}',
        message: 'Invalid milliseconds value',
      });
    }
  })
  .pipe(z.number());
