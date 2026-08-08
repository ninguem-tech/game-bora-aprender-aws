const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        module: "readonly",
        require: "readonly",
        console: "readonly",
        URL: "readonly",
        Blob: "readonly",
        Date: "readonly",
        Math: "readonly",
        JSON: "readonly",
        Object: "readonly",
        Array: "readonly",
        Set: "readonly",
        Number: "readonly",
        String: "readonly",
        parseInt: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        navigator: "readonly",
        globalThis: "writable",
        App: "writable",
        JogoCore: "writable",
        PERSISTENCIA: "writable",
        AUDIO: "writable",
        ACESSIBILIDADE: "writable",
        TECLADO: "writable",
        RENDERIZADOR: "writable",
        AWS_BANK: "writable"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-undef": "error",
      "no-var": "off",
      "prefer-const": "warn",
      "eqeqeq": ["error", "smart"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error"
    }
  },
  {
    files: ["testes/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    }
  },
  {
    // Service Worker roda no worker global scope, não no de window/DOM:
    // self/caches/fetch/Response não existem nos globals acima. Sem este
    // bloco, `eslint sw.js` (que o script "lint" do package.json passou a
    // cobrir) acusava 18 erros no-undef que nunca eram reais bugs — só
    // faltava declarar o ambiente certo.
    files: ["sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Response: "readonly"
      }
    }
  },
  {
    ignores: ["data/sources-cache/**", "data/__pycache__/**", "testes/__pycache__/**"]
  }
];
