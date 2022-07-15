const path = require('path');
const fs = require("fs");

// werbpack plugin
const webpack = require("webpack");
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');

// api configuration
const powerbiApi = require("powerbi-visuals-api");

// visual configuration json path
const pbivizPath = "./pbiviz.json";
const pbivizFile = require(path.join(__dirname, pbivizPath));

// the visual capabilities content
const capabilitiesPath = "./capabilities.json";
const capabilitiesFile = require(path.join(__dirname, capabilitiesPath));

const pluginLocation = './.tmp/precompile/visualPlugin.ts'; // path to visual plugin file, the file generates by the plugin

// string resources
const resourcesFolder = path.join(".","stringResources");
const localizationFolders = fs.existsSync(resourcesFolder) && fs.readdirSync(resourcesFolder);

console.log("power bi api version", powerbiApi.version);
console.log(path.join(__dirname, "certs", "PowerBICustomVisualTest_public.pfx"));

// babel options to support IE11
let babelOptions = {
    "presets": [
        [
            require.resolve('@babel/preset-env'),
            {
                "targets": {
                    "ie": "11"
                },
                useBuiltIns: "entry",
                corejs: 3,
                modules: false
            }
        ]
    ],
    sourceType: "unambiguous", // tell to babel that the project can contains different module types, not only es2015 modules
    cacheDirectory: path.join(".tmp", "babelCache") // path for chace files
};

module.exports = {
    entry: {
        "visual.js": pluginLocation
    },
    optimization: {
        concatenateModules: false,
        minimize: false // enable minimization for create *.pbiviz file less than 2 Mb, can be disabled for dev mode
    },
    devtool: 'source-map',
    // mode: "development",
    module: {
        rules: [
            {
                parser: {
                    amd: false
                }
            },
            {
                test: /(\.ts)x|\.ts$/,
                include: /powerbi-visuals-|src|precompile\\visualPlugin.ts/,
                use: [
                    {
                        loader: require.resolve('babel-loader'),
                        options: babelOptions
                    },
                    {
                        loader: require.resolve('ts-loader'),
                        options: {
                            transpileOnly: false,
                            experimentalWatchApi: false
                        }
                    }
                ]
            },
            {
                test: /(\.js)x|\.js$/,
                use: [
                    {
                        loader: require.resolve('babel-loader'),
                        options: babelOptions
                    }
                ]
            },
            // {
            //     test: /\.json$/,
            //     loader: require.resolve('json-loader'),
            //     type: "javascript/auto"
            // },
            {
                test: /\.less$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: require.resolve('css-loader')
                    },
                    {
                        loader: require.resolve('less-loader'),
                        options: {
                            lessOptions: {
                                paths: [path.resolve(__dirname, "..", 'node_modules')]
                            }
                        }
                    }
                ]
            },
            // {
            //     test: /\.css$/,
            //     use: [
            //         {
            //             loader: MiniCssExtractPlugin.loader
            //         },
            //         {
            //             loader: require.resolve('css-loader')
            //         }
            //     ]
            // },
            {
                test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp)$/i,
                use: [
                {
                    loader: 'base64-inline-loader'
                }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.css']
    },
    output: {
        path: path.join(__dirname, ".tmp","drop"),
        publicPath: 'assets',
        filename: "[name]",
	    // if API version of the visual is higer/equal than 3.2.0 add library and libraryTarget options into config
    	// API version less that 3.2.0 doesn't require it
    	library: pbivizFile.visual.guid,
    	libraryTarget: 'var',
        clean: true
    },
    devServer: {
        allowedHosts: 'all',
        // disableHostCheck: true,
        // contentBase: path.join(__dirname, ".tmp", "drop"), // path with assets for dev server, they are generated by webpack plugin
        static: {
            directory: path.join(__dirname, ".tmp", "drop"),
            publicPath: "/assets/"
        },
        // compress: true,
        port: 8080, // dev server port
        hot: false,
        // host: '0.0.0.0',
        // inline: false,
        // cert files for dev server
        server: {
            type: 'https',
            options: {
                pfx: fs.readFileSync(path.join(__dirname, "certs", "PowerBICustomVisualTest_public.pfx")), // for windows
                passphrase: "07648547094865754",
            }
        },
        headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=0"
        },
        devMiddleware: {
            writeToDisk: true
        }
        // client: {
        //     logging:"info",
        //     overlay: true,
        //     progress: true
        // }
        // writeToDisk: true
    },
    externals: {
        "powerbi-visuals-api": 'null',
    	"fakeDefine": 'false',  
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "visual.css",
            chunkFilename: "[id].css"
        }),
        // visual plugin regenerates with the visual source, but it does not require relaunching dev server
        new webpack.WatchIgnorePlugin({paths: [
            path.join(__dirname, pluginLocation),
            "./.tmp/**/*.*"
        ]}),
        // custom visuals plugin instance with options
        new PowerBICustomVisualsWebpackPlugin({
            ...pbivizFile,
            capabilities: capabilitiesFile,
            stringResources: localizationFolders && localizationFolders.map(localization => path.join(
                resourcesFolder,
                localization,
                "resources.resjson"
            )),
            apiVersion: powerbiApi.version,
            capabilitiesSchema: powerbiApi.schemas.capabilities,
            pbivizSchema: powerbiApi.schemas.pbiviz,
            stringResourcesSchema: powerbiApi.schemas.stringResources,
            dependenciesSchema: powerbiApi.schemas.dependencies,
            devMode: false,
            generatePbiviz: true,
            generateResources: true,
            modules: true,
            visualSourceLocation: "../../src/visual",
            pluginLocation: pluginLocation,
            packageOutPath: path.join(__dirname, "dist")
        }),
        new ExtraWatchWebpackPlugin({
            files: [
                pbivizPath,
                capabilitiesPath
            ]
        }),
    	new webpack.ProvidePlugin({
        	define: 'fakeDefine',
    	})
    ]
};