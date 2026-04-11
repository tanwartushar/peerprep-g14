// Monaco Editor language configuration and snippet setup.
// Imported by CodeEditor.tsx to keep that file focused on collaboration logic.

// Maps our matching-service language names to Monaco language identifiers
const LANGUAGE_MAP: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    go: 'go',
};

export const getMonacoLang = (lang: string): string =>
    LANGUAGE_MAP[lang.toLowerCase()] ?? lang.toLowerCase();

// ---------------------------------------------------------------------------
// Language snippets
// ---------------------------------------------------------------------------

type Snippet = { label: string; insertText: string; detail: string };

const SNIPPETS: Record<string, Snippet[]> = {
    python: [
        { label: 'def',    insertText: 'def ${1:function_name}(${2:args}):\n\t${3:pass}',                          detail: 'Function definition' },
        { label: 'class',  insertText: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}',              detail: 'Class definition' },
        { label: 'for',    insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',                             detail: 'For loop' },
        { label: 'while',  insertText: 'while ${1:condition}:\n\t${2:pass}',                                       detail: 'While loop' },
        { label: 'if',     insertText: 'if ${1:condition}:\n\t${2:pass}',                                          detail: 'If statement' },
        { label: 'ifelse', insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',                      detail: 'If-else statement' },
        { label: 'try',    insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}',              detail: 'Try-except' },
        { label: 'with',   insertText: 'with ${1:context} as ${2:var}:\n\t${3:pass}',                             detail: 'With statement' },
        { label: 'lambda', insertText: 'lambda ${1:args}: ${2:expression}',                                       detail: 'Lambda function' },
        { label: 'list',   insertText: '[${1:item} for ${2:item} in ${3:iterable}]',                              detail: 'List comprehension' },
    ],
    java: [
        { label: 'class',   insertText: 'public class ${1:ClassName} {\n\t${2}\n}',                              detail: 'Class definition' },
        { label: 'main',    insertText: 'public static void main(String[] args) {\n\t${1}\n}',                   detail: 'Main method' },
        { label: 'sout',    insertText: 'System.out.println(${1});',                                              detail: 'System.out.println' },
        { label: 'for',     insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',        detail: 'For loop' },
        { label: 'foreach', insertText: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}',             detail: 'Enhanced for loop' },
        { label: 'while',   insertText: 'while (${1:condition}) {\n\t${2}\n}',                                   detail: 'While loop' },
        { label: 'if',      insertText: 'if (${1:condition}) {\n\t${2}\n}',                                      detail: 'If statement' },
        { label: 'ifelse',  insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                   detail: 'If-else statement' },
        { label: 'try',     insertText: 'try {\n\t${1}\n} catch (${2:Exception} e) {\n\t${3}\n}',               detail: 'Try-catch' },
        { label: 'method',  insertText: 'public ${1:void} ${2:methodName}(${3}) {\n\t${4}\n}',                  detail: 'Method definition' },
    ],
    cpp: [
        { label: 'main',    insertText: 'int main() {\n\t${1}\n\treturn 0;\n}',                                  detail: 'Main function' },
        { label: 'include', insertText: '#include <${1:iostream}>',                                              detail: '#include' },
        { label: 'cout',    insertText: 'std::cout << ${1} << std::endl;',                                       detail: 'cout' },
        { label: 'cin',     insertText: 'std::cin >> ${1};',                                                     detail: 'cin' },
        { label: 'for',     insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',        detail: 'For loop' },
        { label: 'while',   insertText: 'while (${1:condition}) {\n\t${2}\n}',                                   detail: 'While loop' },
        { label: 'if',      insertText: 'if (${1:condition}) {\n\t${2}\n}',                                      detail: 'If statement' },
        { label: 'class',   insertText: 'class ${1:ClassName} {\npublic:\n\t${2}\n};',                          detail: 'Class definition' },
        { label: 'func',    insertText: '${1:void} ${2:functionName}(${3}) {\n\t${4}\n}',                        detail: 'Function definition' },
        { label: 'vec',     insertText: 'std::vector<${1:int}> ${2:vec};',                                       detail: 'Vector declaration' },
    ],
    go: [
        { label: 'func',      insertText: 'func ${1:name}(${2}) ${3} {\n\t${4}\n}',                             detail: 'Function definition' },
        { label: 'main',      insertText: 'func main() {\n\t${1}\n}',                                           detail: 'Main function' },
        { label: 'for',       insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3}\n}',          detail: 'For loop' },
        { label: 'range',     insertText: 'for ${1:i}, ${2:v} := range ${3:collection} {\n\t${4}\n}',          detail: 'Range loop' },
        { label: 'if',        insertText: 'if ${1:condition} {\n\t${2}\n}',                                     detail: 'If statement' },
        { label: 'ifelse',    insertText: 'if ${1:condition} {\n\t${2}\n} else {\n\t${3}\n}',                  detail: 'If-else' },
        { label: 'struct',    insertText: 'type ${1:Name} struct {\n\t${2}\n}',                                 detail: 'Struct definition' },
        { label: 'err',       insertText: 'if err != nil {\n\treturn err\n}',                                   detail: 'Error check' },
        { label: 'fmt',       insertText: 'fmt.Println(${1})',                                                  detail: 'fmt.Println' },
        { label: 'goroutine', insertText: 'go func() {\n\t${1}\n}()',                                           detail: 'Goroutine' },
    ],
};

// ---------------------------------------------------------------------------
// beforeMount handler — call this from CodeEditor's beforeMount prop
// ---------------------------------------------------------------------------

let snippetProvidersRegistered = false;

export function configureMonaco(monaco: any): void {
    // Enable JS/TS semantic + syntax diagnostics (squiggly lines)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
    });

    // Register snippet completion providers once per page lifecycle
    if (snippetProvidersRegistered) return;
    snippetProvidersRegistered = true;

    Object.entries(SNIPPETS).forEach(([lang, snippets]) => {
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };
                return {
                    suggestions: snippets.map(s => ({
                        label: s.label,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: s.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: s.detail,
                        range,
                    })),
                };
            },
        });
    });
}
