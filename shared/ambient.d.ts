declare module 'json-parse-even-better-errors' {
    class JSONParseError extends SyntaxError {
        constructor(error: unknown, text: string, context: number, caller: Function);
    }

    const parseJsonError: {
        JSONParseError: typeof JSONParseError;
    };

    export default parseJsonError;
}
