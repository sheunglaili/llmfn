import fs from "node:fs";
import path from "node:path";

import { Ajv } from "ajv";
import dedent from "dedent";

import type { JSONSchemaType } from "ajv";

export type LLMFnConfiguration = {
  baseURL?: string;
  apiKey?: string;
  model?: string;
};

let configuration: LLMFnConfiguration = {
  baseURL: "http://localhost:11434",
  apiKey: "ollama",
  model: "llama3:70b",
};

export function setup(config: Partial<LLMFnConfiguration>) {
  configuration = {
    ...configuration,
    ...config,
  };
}

const ajv = new Ajv();

async function generate(prompt: string) {
  const res = await fetch(`${configuration.baseURL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(configuration.apiKey &&
        { "Authorization": `Bearer ${configuration.apiKey}` }),
    },
    body: JSON.stringify({
      model: configuration.model,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are an awesome Javascript developer! Please respond in plain generated code and without any Markdown codeblock!",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const { choices } = await res.json();

  const { message } = choices[0];

  return message.content;
}

function persist(path: string, code: string): string {
  const generatedDir = path.substring(0, path.lastIndexOf("/"));
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(path, code);

  return path;
}

type ElementType<T extends ReadonlyArray<unknown>> = T extends
  ReadonlyArray<infer ElementType> ? ElementType : never;

type LLMFnSignature<Inputs extends any[], Output> = {
  inputs: JSONSchemaType<ElementType<Inputs>>[];
  output: JSONSchemaType<Output>;
  id: string;
};

async function fn<Inputs extends any[], Output>(
  path: string,
  { id, inputs: inputSchemas, output }: LLMFnSignature<Inputs, Output>,
) {
  const module = await import(path);

  const inputValidators = inputSchemas.map((schema) => ajv.compile(schema));
  const outputValidator = ajv.compile(output);

  return (...inputs: Inputs): Output => {
    inputs.forEach((input, idx) => {
      const validate = inputValidators[idx];
      if (!validate(input)) {
        throw new Error(`Invalid arg: ${input}, expected type: ${JSON.stringify(inputSchemas[idx])}`);
      }
    });

    const result = module.default(...inputs);

    if (!outputValidator(result)) {
      console.warn(
        `Output of function: ${id} doesn't conform to schema: ${
          JSON.stringify(output)
        }`,
      );
    }
    return result;
  };
}

export default function llmfn<Inputs extends any[], Output>(
  signature: LLMFnSignature<Inputs, Output>,
): (str: TemplateStringsArray, ...expr: any[]) => Promise<(...inputs: Inputs) => Output> {
  const {
    inputs,
    output,
    id,
  } = signature;

  const codePath = path.resolve(`./generated/${id}.js`);

  return async function (str: TemplateStringsArray, ...expr: any[]): Promise<(...inputs: Inputs) => Output> {
    if (fs.existsSync(codePath)) {
      return await fn<Inputs, Output>(codePath, signature);
    }

    const userInstruction = str.raw.reduce((prev, curr, index) =>
      prev
        .concat(curr)
        .concat(index < expr.length ? expr[index] : ""), "");

    const prompt = dedent`
            Please respond in generated code only!

            Create and export a default ESM Javascript function that fulfill the instructed Objective with given inputs and produce expected output.

            Objective: 
            ${userInstruction}

            The list of JSON Schema for each input argument:
            ${JSON.stringify(inputs)}

            Expected output structure in JSON schema format:
            ${JSON.stringify(output)}
        `;

    const code = await generate(prompt);
    persist(codePath, code);

    return await fn<Inputs, Output>(codePath, signature);
  };
}
