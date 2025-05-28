# vite-plugin-styled-svg-sprite

Плагин для vite, который генерирует svg-sprite и удобный less-миксин для его использования.

Требует указания путей:
```ts
svgSprite({
    inputDir: './images/sprite', // все .svg файлы в этой директории попадут в спрайт
    outputSvg: '../public/build/sprite.svg', // путь к файлу, где будет лежать сгенерированный спрайт
    outputStyle: './build/sprite.less', // путь к файлу, где будет лежать сгенерированный стиль
    publicSvg: '/build/sprite.svg', // ссылка, по которой будет доступен сгенерированный спрайт
})
```

Less-миксин используется таким образом:
```less
.flag-elem {
    .icon(@flag); // flag - имя .svg файла в inputDir
}
```

Для генерации svg и less используется пакет [svg-sprite](https://www.npmjs.com/package/svg-sprite).
