export default Parser;
/**
 * <T>
 */
export type ParserFn<T = any> = (filename: string, content: string) => T | undefined;
declare namespace Parser {
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object | undefined}
     */
    function parse(filename: string, content: string): object | undefined;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function xmlParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function jsParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function tsParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function coffeeParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object | undefined}
     */
    function yamlParser(filename: string, content: string): object | undefined;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function jsonParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function json5Parser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function hjsonParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function tomlParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function csonParser(filename: string, content: string): object;
    /**
     * @param {string} filename
     * @param {string} content
     * @returns {object}
     */
    function propertiesParser(filename: string, content: string): object;
    /**
     * Strip YAML comments from the string
     *
     * The 2.0 yaml parser doesn't allow comment-only or blank lines.  Strip them.
     *
     * @protected
     * @method stripYamlComments
     * @param {string} fileStr The string to strip comments from
     * @return {string} The string with comments stripped.
     */
    function stripYamlComments(fileStr: string): string;
    /**
     * Parses the environment variable to the boolean equivalent.
     * Defaults to false
     *
     * @param {string} filename - Filename of the env variable (not used)
     * @param {string} content - Environment variable value
     * @return {boolean} - Boolean value fo the passed variable value
     */
    function booleanParser(filename: string, content: string): boolean;
    /**
     * Parses the environment variable to the number equivalent.
     * Defaults to undefined
     *
     * @param {string} filename - Filename of the env variable (not used)
     * @param {string} content - Environment variable value
     * @return {number} - Number value fo the passed variable value
     */
    function numberParser(filename: string, content: string): number;
    /**
     * @param {string} name
     * @returns {ParserFn | undefined}
     */
    function getParser(name: string): ParserFn | undefined;
    /**
     * @param {string} name
     * @param {ParserFn} parser
     */
    function setParser(name: string, parser: ParserFn): void;
    /**
     * @param {string=} name
     * @returns {string[] | number}
     */
    function getFilesOrder(name?: string | undefined): string[] | number;
    /**
     * @param {string|string[]} name
     * @param {number=} newIndex
     * @returns {string[]}
     */
    function setFilesOrder(name: string | string[], newIndex?: number | undefined): string[];
}
