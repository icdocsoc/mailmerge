import { stopIfCriticalFsError } from "./files.js";
import createLogger from "./logger.js";

jest.mock("./logger", () => {
    const logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    };

    return () => logger;
});

const logger = createLogger("docsoc.utils");

describe("stopIfCriticalFsError", () => {
    let processExit: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();

        processExit = jest.spyOn(global.process, "exit").mockImplementation((code) => {
            throw new Error(`Process exited with code ${code}`);
        });
    });

    it("should return the resolved value of the promise", async () => {
        const resolvedValue = "resolved value";
        const promise = Promise.resolve(resolvedValue);

        const result = await stopIfCriticalFsError(promise);

        expect(result).toBe(resolvedValue);
    });

    it('should log "File not found" error for ENOENT code and exit', async () => {
        const error = new Error("File not found") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        const promise = Promise.reject(error);

        await expect(stopIfCriticalFsError(promise)).rejects.toThrow();
        expect(processExit).toHaveBeenCalledWith(1);

        expect(logger.error).toHaveBeenCalledWith("File not found: ", error);
    });

    it('should log "Permission denied" error for EACCES code', async () => {
        const error = new Error("Permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        const promise = Promise.reject(error);

        await expect(stopIfCriticalFsError(promise)).rejects.toThrow();
        expect(processExit).toHaveBeenCalledWith(1);

        expect(logger.error).toHaveBeenCalledWith("Permission denied: ", error.message);
    });

    it("should log standard mssage for other error codes", async () => {
        const error = new Error("Some other error") as NodeJS.ErrnoException;
        error.code = "OTHER";
        const promise = Promise.reject(error);

        await expect(stopIfCriticalFsError(promise)).rejects.toThrow();
        expect(processExit).toHaveBeenCalledWith(1);

        expect(logger.error).toHaveBeenCalled();
    });

    it("should log generic message if error is not an instance of Error", async () => {
        const error = { code: "ENOENT" };
        const promise = Promise.reject(error);

        await expect(stopIfCriticalFsError(promise)).rejects.toThrow();
        expect(processExit).toHaveBeenCalledWith(1);

        expect(logger.error).toHaveBeenCalled();
    });
});
