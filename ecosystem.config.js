// wms/ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'wms-backend',
            cwd: './backend',
            script: 'node_modules/ts-node/dist/bin.js',
            args: 'src/index.ts',
            env: {
                NODE_ENV: 'production'
            }
        },
        {
            name: 'wms-frontend',
            cwd: './frontend',
            interpreter: 'node',
            script: '../node_modules/serve/build/main.js',
            args: ['-s', 'build', '-l', '9000'],
            env: {
                NODE_ENV: 'production'
            }
        }


    ]
}
