import { rollup } from 'rollup';

// see below for details on these options
const inputOptions = {
    input: './png2icons.mjs'
};

// you can create multiple outputs from the same input to generate e.g.
// different formats like CommonJS and ESM
const outputOptionsList = [{
    file: './png2icons.js',
    format: 'cjs',
    generatedCode: 'es5'
}];

async function build() {
    let bundle;
    let buildFailed = false;
    try {
        bundle = await rollup(inputOptions);
    } catch (error) {
        buildFailed = true;
        // do some error reporting
        console.error(error);
    }
    bundle.write(outputOptionsList);
    if (bundle) {
        // closes the bundle
        await bundle.close();
    }
    process.exit(buildFailed ? 1 : 0);
}

build();
