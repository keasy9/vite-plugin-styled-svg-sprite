interface pluginOptions {
    inputDir: string;
    outputSvg: string;
    outputStyle: string;
    publicSvg: string;
}
declare function svgSpritePlugin(options: pluginOptions): {
    name: string;
    buildStart(): Promise<void>;
    generateBundle(): void;
};

export { svgSpritePlugin as default, type pluginOptions };
