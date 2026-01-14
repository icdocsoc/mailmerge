import { join } from "path";

const ROOT_DEFAULT_OUTPUT = "./output";
export const DEFAULT_DIRS = {
    TEMPLATES: "./templates",
    REACT_TEMPLATES: "./emails-out",
    GENERATIONS_ROOT: ROOT_DEFAULT_OUTPUT,
    PREVIEWS: join(ROOT_DEFAULT_OUTPUT, "previews"),
};
