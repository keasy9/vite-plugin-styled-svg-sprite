import path from 'path';
import fs from 'fs';
import SVGSpriter from 'svg-sprite';

// todo не только less, с возможностью указать через конфиг

// todo остальные режимы, которые поддерживает svg-sprite
const availableModes = ['css', 'symbol'] as const;
type Mode = typeof availableModes[number];

type modeOptions = {
    inputDir?: string, // откуда загружать svg
    outputDir?: string, // куда сохранять стили
    stripAttributes?: array, // какие аттрибуты удалить
    name?: string, // псевдоним режима, чтобы можно было использовать css режим под именем sprite
}

type pluginOptions = {
    inputDir?: string, // откуда загружать svg
    outputDir?: string, // куда сохранять less
    publicBuild: string, // ссылка для публичного доступа на build.outPath из конфига vite
    stripAttributes?: string[], // какие аттрибуты удалить
    modes?: Record<Mode, modeOptions | true>, // режимы генерации
}

type normalizedPluginOptions = {
    publicBuild: string,
    modes: Record<Mode, modeOptions>,
}

// todo вытащить в npm-пакет
// todo исправить типизацию
export default function svgSprite(options: pluginOptions) {
    const normalizedOptions: normalizedPluginOptions = {
        publicBuild: options.publicBuild,
        modes: {},
    };

    availableModes.forEach(mode => {
        if (options.modes && !(mode in options.modes)) return;

        const modeOptions = options.modes ? (options.modes[mode] ?? {}) : {};

        if (
            (!modeOptions.inputDir && !options.inputDir)
            || (!modeOptions.outputDir && !options.outputDir)
        ) {
            // todo конкретизировать ошбику
            throw new Error('Неверная конфигуарция');
        }

        normalizedOptions.modes[mode] = {};
        normalizedOptions.modes[mode].name = modeOptions.name ?? mode;
        normalizedOptions.modes[mode].outputDir = path.resolve(process.cwd(), modeOptions.outputDir ?? options.outputDir);
        normalizedOptions.modes[mode].inputDir = path.resolve(process.cwd(), modeOptions.inputDir ?? path.join(options.inputDir, normalizedOptions.modes[mode].name));
        normalizedOptions.modes[mode].stripAttributes = modeOptions.stripAttributes ?? options.stripAttributes ?? [];
    });

    const output = {};

    return {
        name: 'vite-plugin-svg-sprite',

        async buildStart() {

            // todo распараллелить
            for (const [mode, modeOptions] of Object.entries(normalizedOptions.modes)) {
                if (!fs.existsSync(modeOptions.inputDir)) {
                    throw new Error(`Входная директория ${modeOptions.inputDir} не существует`);
                }

                const spriter = new SVGSpriter({
                    mode: {
                        [mode]: {
                            render: {
                                less: {
                                    template: path.resolve(__dirname, `./${mode}.less.mustache`),
                                },
                            },
                            // @ts-ignore todo понять почему тут ошибка, по-идее не должно быть
                            mixin: 'icon',
                        },
                    },
                    shape: {
                        transform: [
                            {
                                svgo: {
                                    plugins: [
                                        {
                                            name: 'removeAttrs',
                                            params: { attrs: modeOptions.stripAttributes },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    variables: {
                        spriteUrl: path.join(normalizedOptions.publicBuild, `${modeOptions.name}.svg`), // в svg-sprite какя-то фигня с путями, с лидирующим слэшем никак не сделать, поэтому подменяем
                    },
                });

                const files = fs.readdirSync(modeOptions.inputDir).filter(file => file.endsWith('.svg'));
                if (!files.length) return;

                files.forEach(file => {
                    const filePath = path.join(modeOptions.inputDir, file);
                    spriter.add(
                        filePath,
                        file,
                        fs.readFileSync(filePath, 'utf-8') // todo убрать utf-8 если без этого работает
                    );
                });

                const { result } = await spriter.compileAsync();

                output[`${modeOptions.name}.svg`] = result[mode].sprite.contents;

                if (result[mode].less.contents.length) {
                    // stylesheet нужно писать как только он готов, чтобы билд не падал из-за неизвестных less-переменных
                    fs.mkdirSync(modeOptions.outputDir, {recursive: true});
                    fs.writeFileSync(path.join(modeOptions.outputDir, `${modeOptions.name}.less`), result[mode].less.contents);
                }
            }
        },

        generateBundle() {
            for (const [name, content] of Object.entries(output)) {
                this.emitFile({
                    type: 'asset',
                    fileName: name,
                    source: content,
                });
            }
        },
    };
}
