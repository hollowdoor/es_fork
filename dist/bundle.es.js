import { fork } from 'child_process';
import { readFile, writeFile } from 'fs';
import tmp from 'tmp';
import rollup from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import path from 'path';

function _writeFile(name, contents){
    return new Promise((resolve, reject)=>{
        writeFile(name, contents, (err)=>{
            if(err){ return reject(err); }
            resolve(name);
        });
    });
}

function createTmp(){
    return new Promise((resolve, reject)=>{
        tmp.file(function _tempFileCreated(err, path$$1, fd, cleanupCallback) {
            if(err){ return reject(err); }

            resolve({path: path$$1, fd});
        });
    });
}

const cwd = process.cwd();


function esFork(name, args=[], options={}){
    let source = path.join(cwd, name);
    let filename = name.replace(/[.]\//, '');
    let argv = [].concat(args);

    let init = Promise.all([
        rollup.rollup({
            entry: source,
            plugins: [
                nodeResolve({jsnext: true, module: true}),
                babel({plugins: ['transform-async-to-generator']})
            ],
            acorn: {
                allowHashBang: true
            },
            onwarn: (warning)=>{
                //No need for warnings.
                //Try to act like a normal child process.
                if(esFork.showWarning){
                    console.log(warning);
                }
            }
        }).then(bundle=>{
            let code = bundle.generate({
                format: 'cjs'
            }).code;

            let strictReg = /^(['"])use strict\1;/;
            let bangReg = /\n#[!][^\n]+?\n/;
            let head = `'use strict';
__dirname="${cwd}";
__filename="${filename}";
process.argv.splice(1, 1, "${name}");
            `;

            //Get rid of that pesky hash bang.
            if(bangReg.test(code)){
                code = code.replace(bangReg, '');
            }

            //Replace some globals to make things look normal.
            //The globals changed because the new script is in a tmp diractory.
            code = code.replace(strictReg, head);

            if(esFork.saveSource){
                _writeFile(path.join(cwd, 'source.'+filename), code)
                .catch((err)=>console.log(err));
            }

            return code;

        }),
        createTmp()
    ]);

    return new Promise((resolve, reject)=>{

        init.then(([fileContents, tmp$$1])=>{
            return _writeFile(tmp$$1.path, fileContents);
        }).then(processName=>{
            let child = fork(
                processName,
                argv,
                createOptions(options, name),
                (err, stdout, stderr)=>{
                    if(err){ return reject(err); }
                    if(stderr){ return reject(stderr); }
                    resolve(stdout);
                }
            );

            resolve(child);
        }).catch(reject);
    });
}

function createOptions(options, argv0){
    if(!options.cwd){
        options.cwd = cwd;
    }

    if(!options.env){
        options.env = process.env;
    }

    if(options['argv0'] === undefined){
        options.argv0 = argv0;
    }

    if(options['silent'] === undefined && options['stdio'] === undefined){
        options.silent = false;
    }

    return options;
}

export default esFork;
