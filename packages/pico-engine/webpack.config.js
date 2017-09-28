var path = require("path");
var webpack = require("webpack");

var conf = {
    entry: [
        "./src/ui/index.js",
        "webpack-hot-middleware/client",
    ],

    output: {
        path: path.resolve(__dirname, "public/js"),
        publicPath: "/js/",
        filename: "bundle.js"
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                loader: [
                    {loader: "style-loader"},
                    {loader: "css-loader"},
                ]
            },
            {
                test: /\.(png|jpg|otf|eot|svg|ttf|woff|woff2)(\?.*)?$/i,
                use: [
                    {loader: "file-loader"},
                ]
            }
        ],
    },

    devtool: "eval",
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
    ],
};

if(process.env.NODE_ENV === "production"){
    conf.devtool = "source-map";

    conf.entry = "./src/ui/index.js";

    //`plugins` order matters
    conf.plugins = [

        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify("production")
            }
        }),

        //Clean and minify JS bundle
        new webpack.LoaderOptionsPlugin({
            minimize: true
        }),
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true
        }),
    ];
}

module.exports = conf;
