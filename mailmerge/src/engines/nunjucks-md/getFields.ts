/**
 * Given a nunjucks template, returns a set of all the fields used in the template via regexp
 * @param template String version of the template
 * @returns Set of fields used in the template
 *
 * @example
 * const template = "This is a template with one field: {{ field }}.";
 * const result = getTemplateFields(template);
 * console.log(result); // Set(["field"])
 */
const getTemplateFields = (template: string): Set<string> => {
    const regex = /{{\s*(?<field>[a-zA-Z0-9_]+)(\s*\|\s*([a-zA-Z0-9_]+))?\s*}}/g;
    const fields = new Set<string>();
    for (const match of template.matchAll(regex)) {
        if (match.groups && match.groups["field"]) {
            fields.add(match.groups["field"]);
        }
    }
    return fields;
};

export default getTemplateFields;
