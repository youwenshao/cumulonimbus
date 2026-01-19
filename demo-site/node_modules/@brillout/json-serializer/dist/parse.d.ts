export { parse };
export { parseTransform };
type Options = {
    reviver?: (key: undefined | string, value: string, parser: (str: string) => unknown) => {
        replacement: unknown;
        resolved?: boolean;
    } | undefined;
};
declare function parse(str: string, options?: Options): unknown;
declare function parseTransform(value: unknown, options?: Options): unknown;
