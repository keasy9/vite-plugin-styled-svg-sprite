import path from 'path';
import fs from 'fs';
import SVGSpriter from 'svg-sprite';

export interface pluginOptions {
    inputDir: string,
    outputSvg: string,
    outputStyle: string,
    publicSvg: string,
}

export default function svgSprite(options: pluginOptions) {
    const {
        inputDir,
        outputSvg,
        outputStyle,
        publicSvg,
    }: pluginOptions = options;

    const resolvedInputDir = path.resolve(process.cwd(), inputDir);
    const resolvedOutputSvg = path.resolve(process.cwd(), outputSvg);
    const resolvedOutputLess = path.resolve(process.cwd(), outputStyle);

    let spriteContent = '';
    let stylesheetContent = '';

    return {
        name: 'vite-plugin-svg-sprite',

        async buildStart() {
            if (!fs.existsSync(resolvedInputDir)) {
                throw new Error(`Входная директория ${resolvedInputDir} не существует`);
            }

            // todo многовато проблем от svg-sprite, мб отказаться от него...
            const spriter = new SVGSpriter({
                mode: {
                    css: {
                        render: {
                            less: {
                                template: './vite-plugins/tpl.less.mustache',
                                // todo sass, stylus миксины
                                // todo css только чтобы подменить путь к спрайту
                                // todo принимать конфиг как параметр плагина. Если шаблон не передан, подставлять свой
                            },
                        },
                        // @ts-ignore todo понять почему тут ошибка, по-идее не должно быть
                        mixin: 'icon',
                    },
                },
                variables: {
                    spriteUrl: publicSvg, // в svg-sprite какя-то фигня с путями, с лидирующим слэшем никак не сделать, поэтому подменяем
                },
            });

            const files = fs.readdirSync(resolvedInputDir).filter(file => file.endsWith('.svg'));

            if (files.length === 0) return;

            files.forEach(file => {
                const filePath = path.join(resolvedInputDir, file);
                spriter.add(
                    filePath,
                    file,
                    fs.readFileSync(filePath, 'utf-8')
                );
            });

            const { result } = await spriter.compileAsync();

            // если сохранить файлы сейчас, то vite удалит их при очистке директории сборки
            spriteContent = result.css.sprite.contents;
            stylesheetContent = result.css.less.contents;
        },

        generateBundle() {
            if (spriteContent.length) {
                fs.mkdirSync(path.dirname(resolvedOutputSvg), {recursive: true});
                fs.writeFileSync(resolvedOutputSvg, spriteContent);
            }

            if (stylesheetContent.length) {
                fs.mkdirSync(path.dirname(resolvedOutputLess), {recursive: true});
                fs.writeFileSync(resolvedOutputLess, stylesheetContent);
            }
        },
    };
}
