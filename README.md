es-fork
=======

Install
-------

`npm install --save es-fork`

Usage
-----

`script.js`

```javascript
import path from 'path';

function p(){
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve(path.join(__dirname, __filename))
        })
    });
}

async function myAsync(){

    let val = await p();
    console.log('The current path is ', val);
}

myAsync();
```

`run.js`

```javascript
import fork from 'es-fork';
//const fork = require('es-fork'); //Using commonjs

fork('./script.js').then(child=>{
    //Nothing needs to be done here
    //unless you want you want to use ipc messaging.
}).catch(err=>{
    console.log('test ERROR ',err);
});
```

About
-----

`es-fork` uses rollup, and babel.

rollup is used to compile es2015 modules in your script to commonjs require type modules.

babel is used to compile async functions down to generators.

These are the basic steps that `es-fork` goes through when running a script.

1. A temporary file is created, and the source script is read.
2. The source script is compiled with rollup, and babel.
3. Globals are altered to make the script string look like it's source.
 * __filename
 * __dirname
 * process.arg[1] = __filename
4. The new script string is written to the temporary file.
5. The path of the temporary file is passed to child_process.fork()

The most recent version of nodejs uses almost all of es2015. For this reason only es2015 modules, and async functions are compiled by `es-fork`.

Sometime in the future the babel dependency will be removed from `es-fork` as well.

Happy coding!
