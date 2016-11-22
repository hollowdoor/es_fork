import { fork } from 'child_process';
import {
    _readFile as readFile,
    _writeFile as writeFile,
    createTmp
} from './lib/myfs';
import rollup from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import path from 'path';
import tmp from 'tmp';
const cwd = process.cwd();


export default function esSpawn(name, args=[], options={}){
    let source = path.join(cwd, name);
    let argv = [].concat(args);

    let init = Promise.all([
        rollup.rollup({
            entry: source,
            plugins: [
                nodeResolve({jsnext: true, module: true})
            ],
            acorn: {
                allowHashBang: true
            },
            onwarn: (warning)=>{
                //No need for warnings.
                //Try to act like a normal child process.
                //console.log(warning)
            }
        }).then(bundle=>{
            let code = bundle.generate({
                format: 'cjs'
            }).code;

            //Replace some globals to make things look normal.
            //The globals changed because the new script is in a tmp diractory.
            return code.replace(/(['"])use strict\1;/, function(){
                return `'use strict';
                __dirname="${cwd}";
                __filename="${name.replace(/[.]\//, '')}";
                process.argv.splice(1, 1, "${name}");
                `;
            });
        }),
        createTmp()
    ]);

    return new Promise((resolve, reject)=>{

        init.then(([fileContents, tmp])=>{
            return writeFile(tmp.path, fileContents);
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
