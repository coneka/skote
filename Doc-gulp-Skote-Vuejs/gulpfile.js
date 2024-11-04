const browsersync = require('browser-sync').create();
const cached = require('gulp-cached');
const cssnano = require('gulp-cssnano');
const del = require('del');
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const npmdist = require('gulp-npm-dist');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify');
const useref = require('gulp-useref-plus');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require("gulp-autoprefixer");
const sourcemaps = require("gulp-sourcemaps");
const cleanCSS = require('gulp-clean-css');


const fs = require('fs'); // Read a file
var envConfig = JSON.parse(fs.readFileSync('theme-config.json', 'utf8'));

const isSourceMap = true;

const sourceMapWrite = (isSourceMap) ? "./" : false;

const paths = {
    base: {
        base: {
            dir: './'
        },
        node: {
            dir: './node_modules'
        }
    },
    dist: {
        base: {
            dir: './dist',
            assets: './dist/assets'
        },
        libs: {
            dir: './dist/assets/libs'
        },
        css: {
            dir: './dist/assets/css',
        },
        js: {
            dir: './dist/assets/js',
            files: './dist/assets/js/pages',
        },
    },
    src: {
        base: {
            dir: './src',
            assets: './src/assets/**/*',
        },
        html: {
            files: './src/html/**/*.html',
        },
        js: {
            dir: './src/assets/js',
            pages: './src/assets/js/pages',
            files: './src/assets/js/pages/*.js',
            main: './src/assets/js/*.js',
        },
        partials: {
            files: './src/html/**/partials/*'
        },
        scss: {
            dir: './src/assets/scss',
            files: './src/assets/scss/**/*',
            main: './src/assets/scss/*.scss'
        },
        icon: {
            dir: './src/assets/scss',
            files: './src/assets/scss/icons.scss',
            main: './src/assets/scss/*.scss'
        }
    }
};

gulp.task('browsersync', function (callback) {
    if (envConfig.run != "all") {
        var baseDir = paths.dist.base.dir;
        browsersync.init({
            server: {
                baseDir: [baseDir, paths.src.base.dir, paths.base.base.dir]
            }
        });
        callback();
    } else {
        var baseDir = paths.dist.base.dir;
        browsersync.init({
            server: {
                baseDir: [baseDir, paths.src.base.dir, paths.base.base.dir]
            }
        });
        callback();
    }
});

gulp.task('browsersyncReload', function (callback) {

    browsersync.reload();
    callback();

});

gulp.task('watch', async function () {
    gulp.watch([paths.src.scss.files, '!' + paths.src.icon.files], gulp.series('scss', 'browsersyncReload'));
    gulp.watch(paths.src.scss.main, gulp.series('scss', 'browsersyncReload'));
    gulp.watch([paths.src.js.dir], gulp.series('js', 'browsersyncReload'));
    gulp.watch([paths.src.js.pages], gulp.series('jsPages', 'browsersyncReload'));
    gulp.watch([paths.src.html.files, paths.src.partials.files], gulp.series('html', 'browsersyncReload'));
});

gulp.task('js', function() {
    return gulp
    .src(paths.src.js.main)
    .pipe(uglify())
    .pipe(gulp.dest(paths.dist.js.dir));
});

gulp.task('jsPages', function() {
    return gulp
    .src(paths.src.js.files)
    .pipe(uglify())
    .pipe(gulp.dest(paths.dist.js.files));
});

gulp.task('scss', function () {
// generate ltr  
return gulp
    .src(paths.src.scss.main)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(
    autoprefixer()
    )
    .pipe(gulp.dest(paths.dist.css.dir))
    .pipe(cleanCSS())
    .pipe(
    rename({
        suffix: ".min"
    })
    )
    .pipe(sourcemaps.write("./")) 
    .pipe(gulp.dest(paths.dist.css.dir));

});

gulp.task('fileinclude', function (callback) {
    if (envConfig.run != "all") {
        return new Promise(function (resolve, reject) {

            var htmlFiles = paths.src.html.files + '/' + envConfig.run;
            var proc = gulp
                .src(htmlFiles)
                .pipe(fileinclude({
                    prefix: '@@',
                    basepath: '@file',
                    indent: true,
                }))
                .pipe(cached())
                .pipe(gulp.dest(paths.dist.base.dir + '/' + envConfig.run));
                resolve(proc);
        });
    } else {
        return new Promise(function (resolve, reject) {
            for (let i = 0; i < envConfig.demos.length; i++) {
                var htmlFiles = paths.src.html.files + '/' + envConfig.demos[i];
                var proc = gulp.src(htmlFiles)
                    .pipe(fileinclude({
                        prefix: '@@',
                        basepath: '@file',
                        indent: true,
                    }))
                    .pipe(cached())
                    .pipe(gulp.dest(paths.dist.base.dir + '/' + envConfig.demos[i]));
                if (i == envConfig.demos.length - 1)
                    resolve(proc);
            }
        });

    }
});

gulp.task('clean:dist', function (callback) {
    del.sync(paths.dist.base.dir);
    callback();
});

gulp.task('copy:all', function (cb) {

        return gulp
          .src([
            paths.src.base.assets,
            '!' + paths.src.scss.files,
            '!' + paths.src.js.main,
            '!' + paths.src.js.files,
            '!' + paths.src.scss.dir,
          ])
          .pipe(gulp.dest(paths.dist.base.assets));
});

gulp.task('copy:libs', function () {
    return gulp
    .src(npmdist({replaceDefaultExcludes: isSourceMap, excludes : ['/**/*.txt']}), {
                base: paths.base.node.dir
            })
    .pipe(rename(function(path) {
        path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
    }))
    .pipe(gulp.dest(paths.dist.libs.dir));
});


gulp.task('html', function () {

    if (envConfig.run != "all") {
        var htmlFiles = paths.src.html.files;
        htmlFiles = htmlFiles.replace('/**', '/' + envConfig.run);

        return gulp
            .src(htmlFiles)
            .pipe(fileinclude({
                prefix: '@@',
                basepath: '@file',
                indent: true,
            }))
            .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
            .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
            .pipe(useref())
            // .pipe(cached('linting'))
            .pipe(cached())
            .pipe(gulpif('*.js', uglify()))
            .pipe(gulpif('*.css', cssnano({
                svgo: false
            })))
            .pipe(gulp.dest(paths.dist.base.dir + '/' + envConfig.run));
    } else {
        return new Promise(function (resolve, reject) {

            for (let i = 0; i < envConfig.demos.length; i++) {
                var htmlFiles = paths.src.html.files;
                htmlFiles = htmlFiles.replace('**', envConfig.demos[i]);
                var proc = gulp.src(htmlFiles)
                    .pipe(fileinclude({
                        prefix: '@@',
                        basepath: '@file',
                        indent: true,
                    }))
                    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
                    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
                    .pipe(useref())
                    .pipe(cached())
                    .pipe(gulpif('*.js', uglify()))
                    .pipe(gulpif('*.css', cssnano({
                        svgo: false
                    })))
                    .pipe(gulp.dest(paths.dist.base.dir + '/' + envConfig.demos[i]));
                if (i == envConfig.demos.length - 1)
                    resolve(proc);
            }
        });

    }
});

gulp.task('build', gulp.series(gulp.parallel('clean:dist', 'copy:all', 'copy:libs', 'html', 'scss', 'js', 'jsPages'), gulp.parallel('scss', 'html')));

gulp.task('default', gulp.series(gulp.parallel('clean:dist', 'copy:all', 'copy:libs', 'html', 'scss', 'js', 'jsPages'), gulp.parallel('browsersync', 'watch')));
