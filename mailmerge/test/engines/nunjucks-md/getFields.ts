// getFields.test.ts
import getTemplateFields from "../../../src/engines/nunjucks-md/getFields.js";

describe("getTemplateFields", () => {
    test("should return an empty set for a template with no fields", () => {
        const template = "This is a template with no fields.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set());
    });

    test("should return a set with one field", () => {
        const template = "This is a template with one field: {{ field }}.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set(["field"]));
    });

    test("should return a set with multiple fields", () => {
        const template = "This template has two fields: {{ field1 }} and {{ field2 }}.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set(["field1", "field2"]));
    });

    test("should return a set with fields containing pipes", () => {
        const template =
            "This template has fields with pipes: {{ field1 | pipe1 }} and {{ field2 | pipe2 }}.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set(["field1", "field2"]));
    });

    test("should return a set with fields containing underscores and numbers", () => {
        const template =
            "This template has fields with underscores and numbers: {{ field_1 }} and {{ field_2 }}.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set(["field_1", "field_2"]));
    });

    test("should return a set with unique fields when fields are repeated", () => {
        const template = "This template has repeated fields: {{ field }} and {{ field }}.";
        const result = getTemplateFields(template);
        expect(result).toEqual(new Set(["field"]));
    });
});
