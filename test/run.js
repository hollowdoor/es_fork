let spawn = require('../');
spawn.saveSource = true;

spawn('./script.js').then(child=>{
    //process.stdin.pipe(child.stdin);
    //child.stdout.pipe(process.stdout);
    //console.log('success');
}).catch(err=>{
    console.log('test ERROR ',err);
});
