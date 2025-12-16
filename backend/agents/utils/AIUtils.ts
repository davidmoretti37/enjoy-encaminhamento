/**
 * AI Utilities - Advanced LLM interaction patterns
 * Adapted to use the existing OpenRouter/Forge LLM infrastructure
 */

import { invokeLLM, Message, InvokeResult } from "../../_core/llm";
import { JSONSchema, SchemaProperty } from "../types";

export interface AIUtilsOptions {
  logger?: Console;
  maxRetries?: number;
}

export interface InvokeJSONResult<T> {
  data: T;
  tokensUsed: number;
}

export interface ReasoningStep<T = unknown> {
  name: string;
  prompt: string;
  schema: JSONSchema;
  result?: T;
}

export interface FewShotExample {
  input: string;
  output: unknown;
}

export class AIUtils {
  private logger: Console;
  private maxRetries: number;

  constructor(options: AIUtilsOptions = {}) {
    this.logger = options.logger || console;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Invoke LLM with JSON response and schema validation
   */
  async invokeJSON<T>(
    prompt: string,
    schema: JSONSchema,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<InvokeJSONResult<T>> {
    const { maxTokens = 2048 } = options;
    let attempts = 0;

    const schemaDescription = this.generateSchemaDescription(schema);
    const fullPrompt = `${prompt}\n\nReturn a JSON object matching this schema:\n${schemaDescription}\n\nReturn ONLY the JSON, no additional text or markdown.`;

    while (attempts < this.maxRetries) {
      try {
        const messages: Message[] = [{ role: "user", content: fullPrompt }];

        const response: InvokeResult = await invokeLLM({
          messages,
          maxTokens,
          responseFormat: { type: "json_object" },
        });

        const content = this.extractContent(response);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in LLM response");
        }

        const parsed = JSON.parse(jsonMatch[0]) as T;
        this.validateSchema(parsed, schema);

        return {
          data: parsed,
          tokensUsed: response.usage?.total_tokens || 0,
        };
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`AI JSON invocation failed (attempt ${attempts}):`, errorMessage);

        if (attempts >= this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} attempts: ${errorMessage}`);
        }
        await this.delay(1000 * attempts);
      }
    }

    throw new Error("Unreachable");
  }

  /**
   * Invoke LLM with structured output schema (using OpenRouter's native JSON schema support)
   */
  async invokeStructured<T>(
    prompt: string,
    schemaName: string,
    schema: Record<string, unknown>,
    options: { maxTokens?: number } = {}
  ): Promise<InvokeJSONResult<T>> {
    const { maxTokens = 2048 } = options;

    try {
      const messages: Message[] = [{ role: "user", content: prompt }];

      const response: InvokeResult = await invokeLLM({
        messages,
        maxTokens,
        outputSchema: {
          name: schemaName,
          schema,
          strict: true,
        },
      });

      const content = this.extractContent(response);
      const parsed = JSON.parse(content) as T;

      return {
        data: parsed,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Structured invocation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate a description of the JSON schema for the prompt
   */
  private generateSchemaDescription(schema: JSONSchema): string {
    let description = "{\n";
    for (const key in schema.properties) {
      const prop = schema.properties[key];
      description += `  "${key}": <${prop.type}>, // ${prop.description}\n`;
    }
    description += "}";
    return description;
  }

  /**
   * Validate the parsed JSON against the schema
   */
  private validateSchema(data: unknown, schema: JSONSchema): void {
    if (typeof data !== "object" || data === null) {
      throw new Error("Response is not an object");
    }

    const obj = data as Record<string, unknown>;

    for (const key in schema.properties) {
      if (schema.required?.includes(key) && !(key in obj)) {
        throw new Error(`Missing required field: ${key}`);
      }
      if (key in obj) {
        const expectedType = schema.properties[key].type;
        const actualType = Array.isArray(obj[key]) ? "array" : typeof obj[key];
        if (actualType !== expectedType) {
          throw new Error(
            `Invalid type for ${key}. Expected ${expectedType}, got ${actualType}`
          );
        }
      }
    }
  }

  /**
   * Perform a multi-turn reasoning chain
   */
  async reasoningChain<T extends Record<string, unknown>>(
    steps: ReasoningStep[],
    initialContext: Record<string, unknown>
  ): Promise<T> {
    let currentContext = { ...initialContext };
    const results: Record<string, unknown> = {};

    for (const step of steps) {
      const { name, prompt, schema } = step;
      this.logger.log(`Executing reasoning step: ${name}`);

      const fullPrompt = `${prompt}\n\nCURRENT CONTEXT:\n${JSON.stringify(currentContext, null, 2)}`;
      const response = await this.invokeJSON<Record<string, unknown>>(fullPrompt, schema);

      results[name] = response.data;
      currentContext = { ...currentContext, ...response.data };
    }

    return results as T;
  }

  /**
   * Use few-shot learning to improve accuracy
   */
  async fewShotInvoke<T>(
    prompt: string,
    schema: JSONSchema,
    examples: FewShotExample[]
  ): Promise<InvokeJSONResult<T>> {
    let fewShotPrompt = "Here are some examples:\n";
    for (const example of examples) {
      fewShotPrompt += `\n--- Example Input ---\n${example.input}\n--- Example Output ---\n${JSON.stringify(example.output, null, 2)}\n`;
    }

    const fullPrompt = `${fewShotPrompt}\n--- New Task ---\n${prompt}`;
    return this.invokeJSON<T>(fullPrompt, schema);
  }

  /**
   * Simple text completion without structured output
   */
  async complete(prompt: string, options: { maxTokens?: number } = {}): Promise<string> {
    const { maxTokens = 1024 } = options;

    const messages: Message[] = [{ role: "user", content: prompt }];

    const response = await invokeLLM({
      messages,
      maxTokens,
    });

    return this.extractContent(response);
  }

  /**
   * Extract text content from LLM response
   */
  private extractContent(response: InvokeResult): string {
    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("No message in LLM response");
    }

    if (typeof message.content === "string") {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      const textPart = message.content.find((p) => p.type === "text");
      if (textPart && "text" in textPart) {
        return textPart.text;
      }
    }

    throw new Error("Could not extract text content from LLM response");
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
