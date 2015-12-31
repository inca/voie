'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RedirectLoopError = exports.StateNotFoundError = undefined;

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var StateNotFoundError = exports.StateNotFoundError = (function (_Error) {
  (0, _inherits3.default)(StateNotFoundError, _Error);

  function StateNotFoundError(name) {
    (0, _classCallCheck3.default)(this, StateNotFoundError);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(StateNotFoundError).call(this, 'State "' + name + '" not found.'));

    _this.name = name;
    return _this;
  }

  return StateNotFoundError;
})(Error);

var RedirectLoopError = exports.RedirectLoopError = (function (_Error2) {
  (0, _inherits3.default)(RedirectLoopError, _Error2);

  function RedirectLoopError(transition) {
    (0, _classCallCheck3.default)(this, RedirectLoopError);

    var _this2 = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(RedirectLoopError).call(this, 'Redirect loop detected ' + '(set maxRedirects on state manager to configure max redirects per transition)'));

    _this2.transition = transition;
    return _this2;
  }

  return RedirectLoopError;
})(Error);