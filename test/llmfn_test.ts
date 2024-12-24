import { afterAll, beforeAll, describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

import { setupServer, SetupServerApi } from "npm:msw/node";
import { http, HttpResponse } from "npm:msw"

import type { JSONSchemaType } from "npm:ajv";

import llmfn, { setup } from "../mod.ts";

describe("llmfn", () => {
    const schema: JSONSchemaType<string> = {
        type: "string",
    };

    let server: SetupServerApi;

    beforeAll(() => {
        server = setupServer(
            http.post("http://localhost:11434/v1/chat/completions", () => HttpResponse.json({
                choices: [{
                    message: {
                        content: `export default function echo(input) { return input; }`
                    }
                }]
            }))
        )
        server.listen();
        setup({
            baseURL: "http://localhost:11434",
        });
    });

    afterAll(() => {
        server.close();
    })

    it("generate code from user instructions & schemas", async () => {
        const echo = await llmfn<[string], string>({
            id: "echo",
            inputs: [schema],
            output: schema,
        })`echo the input back as the output`;

        expect(echo('test')).toEqual('test');
    });

    it("validate user input in generated function", async () => {
        const echo = await llmfn({
            id: "echo",
            inputs: [schema],
            output: schema,
        })`echo the input back as the output`;

        expect(() => echo(1)).toThrow(`Invalid arg: 1, expected type: {"type":"string"}`);
    });
});
