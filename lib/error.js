'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StateNotFoundError = exports.StateNotFoundError = (function (_Error) {
  _inherits(StateNotFoundError, _Error);

  function StateNotFoundError(name) {
    _classCallCheck(this, StateNotFoundError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StateNotFoundError).call(this, 'State "' + name + '" not found.'));

    _this.name = name;
    return _this;
  }

  return StateNotFoundError;
})(Error);

var RedirectLoopError = exports.RedirectLoopError = (function (_Error2) {
  _inherits(RedirectLoopError, _Error2);

  function RedirectLoopError(transition) {
    _classCallCheck(this, RedirectLoopError);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(RedirectLoopError).call(this, 'Redirect loop detected ' + '(set maxRedirects on state manager to configure max redirects per transition)'));

    _this2.transition = transition;
    return _this2;
  }

  return RedirectLoopError;
})(Error);