'use strict';

module.exports = function(config) {
  config.set({
    port: 9876,
    basePath: '.',
    frameworks: ['mocha', 'chai', 'browserify'],
    files: [
      './specs/*.js'
    ],
    preprocessors: {
      './specs/*.js': ['browserify']
    },
    exclude: [],
    reporters: ['progress'],
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity
  })
};
