import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optTrimmed = (max: number) => trimmed(max).optional().or(z.literal(''));
const id = z.string().regex(/^[a-z0-9-]+$/).min(1).max(50);

const LeadSourceEnum = z.enum(['site', 'email', 'phone', 'referral', 'manual']);
const LeadStatusEnum = z.enum(['new', 'processed', 'converted']);
const OpportunityStatusEnum = z.enum(['open', 'won', 'lost']);
const ActivityTypeEnum = z.enum(['note', 'task']);

export const leadInputSchema = z.object({
  name:     trimmed(120),
  email:    z.string().trim().email().optional().or(z.literal('')),
  phone:    optTrimmed(40),
  company:  optTrimmed(200),
  source:   LeadSourceEnum,
  status:   LeadStatusEnum.optional(),
  budget:   z.number().positive().optional().or(z.literal('')),
  timeline: optTrimmed(200),
  comment:  optTrimmed(2000),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadUpdateSchema = leadInputSchema.partial();
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;

export const customerInputSchema = z.object({
  name:     trimmed(200),
  website:  z.string().trim().url().optional().or(z.literal('')),
  industry: optTrimmed(100),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const contactInputSchema = z.object({
  name:       trimmed(120),
  email:      z.string().trim().email().optional().or(z.literal('')),
  phone:      optTrimmed(40),
  role:       optTrimmed(100),
  customerId: id.optional().or(z.literal('')),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const opportunityInputSchema = z.object({
  title:      trimmed(200),
  amount:     z.number().positive().optional(),
  stageId:    id,
  customerId: id.optional(),
  contactId:  id.optional(),
  dueDate:    z.string().datetime().optional(),
});
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const opportunityStageUpdateSchema = z.object({
  opportunityId: id,
  newStageId:    id,
  reasonLost:    optTrimmed(500),
});
export type OpportunityStageUpdateInput = z.infer<typeof opportunityStageUpdateSchema>;

export const convertLeadSchema = z
  .object({
    accountName:       trimmed(200),
    contactName:       trimmed(120),
    contactEmail:      z.string().trim().email().optional().or(z.literal('')),
    contactPhone:      optTrimmed(40),
    createOpportunity: z.boolean(),
    opportunityTitle:  optTrimmed(200),
    opportunityAmount: z.number().positive().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.createOpportunity && !v.opportunityTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opportunityTitle'],
        message: 'opportunityTitle обязателен при createOpportunity=true',
      });
    }
  });
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const activityInputSchema = z
  .object({
    opportunityId: id,
    type:          ActivityTypeEnum,
    text:          trimmed(1000),
    dueDate:       z.string().datetime().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'task' && !v.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'dueDate обязателен для task',
      });
    }
  });
export type ActivityInput = z.infer<typeof activityInputSchema>;

export const toggleDoneSchema = z.object({
  id:   id,
  done: z.boolean(),
});
export type ToggleDoneInput = z.infer<typeof toggleDoneSchema>;