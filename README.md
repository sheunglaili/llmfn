# llmfn

Write Typescript / JavaScript function with natural language

## Getting started

```typescript
import llmfn, { setup } from "@llmfn/llmfn"

// set up configuration if you like to switch LLM Provider
// defaults to ollama 
setup({
  baseURL: "https://localhost:11434",
  apiKey: "ollama", // can be omitted if calling to ollama
  model: "llama3.3:70b", // specific model tag, defaults to "llama3:70b"
});

// 1. Define function signature
const fibonacchi = await llmfn<[number], number>({
  id: "fibonacchi", 
  inputs: [{
    type: "number",
    description: "number of iterations for the fibonacchi number",
  }],
  output: {
    type: "number",
    description: "the calculated fibonacchi number",
  },
})`calculate a fibonacchi number of given input iteration`;

// 2. Invoke function 
const result = fibonacchi(8);

// 3. Profit
console.log(`result of fibonacchi(8): ${result}`);
```

# API References

## llmfn()

Create tagged template function that takes in a string that describe the purpose of the function and let you generate JavaScript code using provided input JSON schemas, output JSON schema.

**Parameters:**
`signature` (required)
An object that defines the structure of the inputs, outputs, and the function ID.

properties:
- `id`: An unique identifier for identifying the generated code, preferrably static in order to avoid generating the same function over and over again
- `inputs`: An array of JSON Schemas defining the structure of each input argument.
- `output`: A JSON Schema defining the structure of the function's output.
Type: JSONSchemaType<Output>

**Returns:**

An asynchronous tagged template function which let you specify the prime objective of the function. What to do with the inputs and what you expect for the output.

## setup()

Utility function for configurating LLM Provider

**Parameters**
`configuration` (required)

An object that contains configuration you would like to update for your LLM Provider

properties: 
- `baseURL` (optional) - Base URL for your LLM provider, e.g: `https://api.openai.com` if you are using OpenAI. 
- `apiKey` (optional) - API Key for your LLM provider, can be empty if using `ollama` locally
- `model` (optional) - tag for the model you like to use, e.g: `llama3.3:70b` 