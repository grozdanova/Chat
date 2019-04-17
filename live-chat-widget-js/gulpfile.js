var gulp = require('gulp'),
  babel = require('gulp-babel'),
  cleanCSS = require('gulp-clean-css'),
  imagemin = require('gulp-imagemin'),
  del = require('del');

gulp.task('js', function () {
  return gulp.src(
    [
      'node_modules/@babel/polyfill/dist/polyfill.js',
      'assets/*.js'
    ])
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(gulp.dest('compiled'))
});

gulp.task('minify-css', () => {
  return gulp.src('assets/*.css')
 .pipe(cleanCSS())
 .pipe(gulp.dest('compiled'));
});

gulp.task('images', function(){
  return gulp.src('assets/**/*.+(png|jpg|gif|svg)')
  .pipe(imagemin())
  .pipe(gulp.dest('compiled'))
});

gulp.task('clean', function(resolve) {
  del.sync('compiled');
  resolve();
})

gulp.task('watch', function () {
  gulp.watch('assets/*.js', gulp.parallel('js'));
  // Other watchers
})

gulp.task('build', gulp.series('clean', 'minify-css', 'js', 'images'));