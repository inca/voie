'use strict';

module.exports = function(config) {
  config.set({

    port: 9876,

    files: [
      'src/**/*.js',
      'test/specs/**/*.js'
    ],

    autoWatch: true,

    frameworks: ['mocha', 'chai', 'browserify'],

    preprocessors: {
      'src/**/*.js': ['browserify'],
      'test/specs/**/*.js': ['browserify']
    },

    browserify: {
      debug: true,
      transform: [
        [ 'babelify', { presets: [ 'es2015' ] } ],
        /*
        require('browserify-istanbul')({
          instrumenter: require('isparta')
        })
        */
      ]
    },

    reporters: ['progress', 'coverage'],

    client: {
      mocha: {
        reporter: 'html'
      }
    },

    colors: true,

    logLevel: config.LOG_INFO,

    coverageReporter: {
      instrumenters: { isparta : require('isparta') },
      instrumenter: {
        '**/*.js': 'isparta'
      },
      type : 'html',
      dir : 'coverage/'
    },

    browsers: ['Chrome'],

    singleRun: false,

    concurrency: Infinity

  });
};
