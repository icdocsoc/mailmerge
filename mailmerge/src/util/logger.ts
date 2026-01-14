import chalk from "chalk";
import winston from "winston";

const { combine, colorize, printf, timestamp } = winston.format;

/**
 * Create a logger with the given module name.
 *
 * The logger is an instance of `winston.Logger` with a single `Console` transport, which logs to the console in this format:
 * ```
 * 2024-07-31T20:08:14.697Z my-module info Hello, world!
 * ```
 * @param moduleName Name of the module to log
 * @returns Logger instance
 *
 * @example
 * const logger = createLogger("my-module");
 * logger.info("Hello, world!");
 * // Output: 2024-07-31T20:08:14.697Z my-module info Hello, world!
 */
export default function createLogger(moduleName: string) {
    const options: winston.LoggerOptions = {
        transports: [
            new winston.transports.Console({
                format: combine(
                    colorize(),
                    timestamp(),
                    printf((info) => {
                        return `${chalk.grey(info["timestamp"])} ${chalk.magenta(moduleName)} ${
                            info.level
                        } ${info.message}`;
                    }),
                ),
                level: "debug",
            }),
        ],
    };

    return winston.createLogger(options);
}
