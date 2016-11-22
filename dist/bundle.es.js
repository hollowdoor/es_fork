import { fork } from 'child_process';
import { readFile, writeFile } from 'fs';
import tmp from 'tmp';
import rollup from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import path from 'path';

function _writeFile(name, contents) {
    return new Promise(function (resolve, reject) {
        writeFile(name, contents, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(name);
        });
    });
}

function createTmp() {
    return new Promise(function (resolve, reject) {
        tmp.file(function _tempFileCreated(err, path$$1, fd, cleanupCallback) {
            if (err) {
                return reject(err);
            }

            resolve({ path: path$$1, fd: fd });
        });
    });
}

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();















var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var cwd = process.cwd();

function esSpawn(name) {
    var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var source = path.join(cwd, name);
    var argv = [].concat(args);

    var init = Promise.all([rollup.rollup({
        entry: source,
        plugins: [nodeResolve({ jsnext: true, module: true }), babel({ plugins: ['transform-async-to-generator'] })],
        acorn: {
            allowHashBang: true
        },
        onwarn: function onwarn(warning) {
            //No need for warnings.
            //Try to act like a normal child process.
            //console.log(warning)
        }
    }).then(function (bundle) {
        var code = bundle.generate({
            format: 'cjs'
        }).code;

        //Replace some globals to make things look normal.
        //The globals changed because the new script is in a tmp diractory.
        return code.replace(/(['"])use strict\1;/, function () {
            return '\'use strict\';\n                __dirname="' + cwd + '";\n                __filename="' + name.replace(/[.]\//, '') + '";\n                process.argv.splice(1, 1, "' + name + '");\n                ';
        });
    }), createTmp()]);

    return new Promise(function (resolve, reject) {

        init.then(function (_ref) {
            var _ref2 = slicedToArray(_ref, 2),
                fileContents = _ref2[0],
                tmp$$1 = _ref2[1];

            return _writeFile(tmp$$1.path, fileContents);
        }).then(function (processName) {
            var child = fork(processName, argv, createOptions(options, name), function (err, stdout, stderr) {
                if (err) {
                    return reject(err);
                }
                if (stderr) {
                    return reject(stderr);
                }
                resolve(stdout);
            });

            resolve(child);
        }).catch(reject);
    });
}

function createOptions(options, argv0) {
    if (!options.cwd) {
        options.cwd = cwd;
    }

    if (!options.env) {
        options.env = process.env;
    }

    if (options['argv0'] === undefined) {
        options.argv0 = argv0;
    }

    if (options['silent'] === undefined && options['stdio'] === undefined) {
        options.silent = false;
    }

    return options;
}

export default esSpawn;
