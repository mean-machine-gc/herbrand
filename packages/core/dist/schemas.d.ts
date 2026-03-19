import { z } from "zod";
type AnyZodEnum = z.ZodEnum<any>;
export declare const projectSchema: z.ZodObject<{
    outcomes: z.ZodArray<z.ZodString>;
    intents: z.ZodArray<z.ZodString>;
    info: z.ZodArray<z.ZodString>;
    outcomeRejects: z.ZodArray<z.ZodString>;
    contexts: z.ZodArray<z.ZodString>;
    modules: z.ZodArray<z.ZodString>;
    aggregates: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type Project = z.infer<typeof projectSchema>;
export declare function buildDecisionSchema(project: Project): z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"intent">;
    agent: z.ZodUnion<readonly [z.ZodObject<{
        kind: z.ZodLiteral<"human">;
        role: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"machine">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"llm">;
    }, z.core.$strict>]>;
    context: z.ZodEnum<{
        [x: string]: string;
    }>;
    module: z.ZodEnum<{
        [x: string]: string;
    }>;
    aggregate: z.ZodEnum<{
        [x: string]: string;
    }>;
    businessGoal: z.ZodString;
    description: z.ZodString;
    trigger: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"success">;
        outcome: z.ZodEnum<{
            [x: string]: string;
        }>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"reject">;
        rejection: z.ZodEnum<{
            [x: string]: string;
        }>;
    }, z.core.$strip>], "type">;
    preconditions: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodString;
        requiredInfo: z.ZodArray<AnyZodEnum>;
        scenarios: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    producesIntent: z.ZodObject<{
        intent: z.ZodEnum<{
            [x: string]: string;
        }>;
        description: z.ZodString;
        requiredInfo: z.ZodArray<z.ZodEnum<{
            [x: string]: string;
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"outcome">;
    agent: z.ZodObject<{
        kind: z.ZodLiteral<"machine">;
    }, z.core.$strict>;
    context: z.ZodEnum<{
        [x: string]: string;
    }>;
    module: z.ZodEnum<{
        [x: string]: string;
    }>;
    aggregate: z.ZodEnum<{
        [x: string]: string;
    }>;
    description: z.ZodString;
    trigger: z.ZodEnum<{
        [x: string]: string;
    }>;
    shouldFailWith: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodString;
        requiredInfo: z.ZodArray<AnyZodEnum>;
        scenarios: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    shouldSucceedWith: z.ZodRecord<z.ZodString, z.ZodObject<{
        condition: z.ZodString;
        description: z.ZodString;
        requiredInfo: z.ZodArray<AnyZodEnum>;
        scenarios: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    shouldAssert: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        tag: z.ZodString;
        description: z.ZodString;
        affectedInfo: z.ZodArray<AnyZodEnum>;
    }, z.core.$strip>>>;
}, z.core.$strip>], "type">;
export {};
